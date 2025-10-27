import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  fullName: string;
  relationshipStatus?: 'single' | 'married';
  preferredLanguage?: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔑 Initializing Supabase Auth...');

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📦 Initial session:', session ? 'Found' : 'None');
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event, session ? 'Session active' : 'No session');
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('👤 Loading user profile for:', supabaseUser.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading profile:', JSON.stringify(error, null, 2));
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          fullName: supabaseUser.user_metadata?.full_name || 'User',
        });
        return;
      }

      if (profile) {
        console.log('✅ Profile loaded:', profile.full_name);
        setUser({
          id: profile.id,
          email: supabaseUser.email || '',
          fullName: profile.full_name || 'User',
          relationshipStatus: profile.relationship_status,
          preferredLanguage: profile.preferred_language,
        });
      } else {
        console.log('📝 No profile found, creating one...');
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .upsert({
            id: supabaseUser.id,
            email: supabaseUser.email,
            full_name: supabaseUser.user_metadata?.full_name || 'User',
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating profile:', JSON.stringify(insertError, null, 2));
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            fullName: supabaseUser.user_metadata?.full_name || 'User',
          });
        } else {
          console.log('✅ Profile created/updated:', newProfile.full_name);
          setUser({
            id: newProfile.id,
            email: supabaseUser.email || '',
            fullName: newProfile.full_name,
            relationshipStatus: newProfile.relationship_status,
            preferredLanguage: newProfile.preferred_language,
          });
        }
      }
    } catch (error) {
      console.error('💥 Exception loading profile:', JSON.stringify(error, null, 2), error);
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        fullName: supabaseUser.user_metadata?.full_name || 'User',
      });
    }
  };

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    console.log('📧 Signing up with Supabase Auth:', email);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        return { data: null, error };
      }

      console.log('✅ Sign up successful! Email confirmation required.');
      console.log('📬 Confirmation email sent to:', email);
      
      return { 
        data: { 
          user: data.user, 
          session: data.session,
          needsEmailConfirmation: !data.session,
        }, 
        error: null 
      };
    } catch (error: any) {
      console.error('💥 Sign up exception:', error);
      return { data: null, error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔓 Signing in with Supabase Auth:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        
        if (error.message.includes('Email not confirmed')) {
          return { 
            data: null, 
            error: { 
              ...error, 
              message: 'Please verify your email before signing in. Check your inbox for the confirmation link.',
              needsEmailConfirmation: true,
            } 
          };
        }
        
        return { data: null, error };
      }

      console.log('✅ Sign in successful!');
      return { data: { user: data.user, session: data.session }, error: null };
    } catch (error: any) {
      console.error('💥 Sign in exception:', error);
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('👋 Signing out...');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }
      
      console.log('✅ Sign out successful!');
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('💥 Sign out exception:', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('🔑 Requesting password reset for:', email);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: undefined,
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        return { data: null, error };
      }

      console.log('✅ Password reset email sent!');
      return { data: { success: true }, error: null };
    } catch (error: any) {
      console.error('💥 Password reset exception:', error);
      return { data: null, error };
    }
  }, []);

  const resendConfirmationEmail = useCallback(async (email: string) => {
    console.log('📧 Resending confirmation email to:', email);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        console.error('❌ Resend confirmation error:', error);
        return { data: null, error };
      }

      console.log('✅ Confirmation email resent!');
      return { data: { success: true }, error: null };
    } catch (error: any) {
      console.error('💥 Resend confirmation exception:', error);
      return { data: null, error };
    }
  }, []);

  const updateRelationshipStatus = useCallback(async (relationshipStatus: 'single' | 'married') => {
    try {
      if (!user?.id) throw new Error('No user logged in');
      
      console.log('💑 Updating relationship status:', relationshipStatus);
      
      const { error } = await supabase
        .from('profiles')
        .update({ relationship_status: relationshipStatus })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Update relationship status error:', error);
        throw error;
      }

      console.log('✅ Relationship status updated!');
      setUser({ ...user, relationshipStatus });
    } catch (error: any) {
      console.error('💥 Update relationship status exception:', error);
      throw error;
    }
  }, [user]);

  const updatePreferredLanguage = useCallback(async (preferredLanguage: string) => {
    try {
      if (!user?.id) throw new Error('No user logged in');
      
      console.log('🌍 Updating preferred language:', preferredLanguage);
      
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: preferredLanguage })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Update preferred language error:', error);
        throw error;
      }

      console.log('✅ Preferred language updated!');
      setUser({ ...user, preferredLanguage });
    } catch (error: any) {
      console.error('💥 Update preferred language exception:', error);
      throw error;
    }
  }, [user]);

  return useMemo(
    () => ({
      session,
      user,
      isLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      resendConfirmationEmail,
      updateRelationshipStatus,
      updatePreferredLanguage,
    }),
    [
      session, 
      user, 
      isLoading, 
      signUp, 
      signIn, 
      signOut, 
      resetPassword, 
      resendConfirmationEmail, 
      updateRelationshipStatus, 
      updatePreferredLanguage
    ]
  );
});
