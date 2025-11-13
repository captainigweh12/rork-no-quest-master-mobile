import '@/lib/polyfills/reactUse.js';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';
import { clearStaleUrlIfNeeded, getDefaultBaseUrl, setBaseUrlOverride, loadBaseUrlOverride } from '@/lib/baseUrl';

WebBrowser.maybeCompleteAuthSession();

interface User {
  id: string;
  email: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  relationshipStatus?: 'single' | 'married';
  preferredLanguage?: string;
  subscriptionTier?: 'free' | 'pro' | 'hero' | 'team';
  subscriptionExpiresAt?: string;
  dailyChallengesUsed?: number;
  isAdmin?: boolean;
}

const ADMIN_EMAILS = new Set<string>(['rizn.management@gmail.com']);

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    console.log('🔑 Initializing Supabase Auth...');
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        
        console.log('📦 Initial session:', session ? 'Found' : 'None');
        if (!mountedRef.current) return;
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } catch (error) {
        console.log('❌ Auth initialization error:', error instanceof Error ? error.message : 'unknown error');
        if (!mountedRef.current) return;
        setSession(null);
        setUser(null);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Auth state changed:', _event, session ? 'Session active' : 'No session');
      if (!mountedRef.current) return;
      setSession(session);
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => { mountedRef.current = false; subscription.unsubscribe(); };
  }, []);

  const runOneTimeBackfillForExistingUser = async (uid: string) => {
    try {
      console.log('🛠️ Running one-time backfill check for user:', uid);
      const existingOverride = await loadBaseUrlOverride();
      const detected = getDefaultBaseUrl();

      if (!existingOverride || existingOverride.trim().length === 0) {
        console.log('🧩 No override found. Applying detected base URL override for existing user:', detected);
        await setBaseUrlOverride(detected);
        console.log('✅ Base URL override set for existing user');
      } else {
        console.log('ℹ️ Override already present:', existingOverride);
      }

      const cleared = await clearStaleUrlIfNeeded();
      if (cleared) {
        console.log('🧹 Stale URL was cleared during backfill. Re-applying detected base URL:', detected);
        await setBaseUrlOverride(detected);
      }

      const key = `BACKFILL_V1_DONE_${uid}`;
      try {
        const { storage } = await import('@/lib/storage');
        const done = await storage.getItem(key);
        if (!done) {
          await storage.setItem(key, '1');
          console.log('🏁 Marked backfill as completed for user:', uid);
        } else {
          console.log('✅ Backfill previously completed for user:', uid);
        }
      } catch (e) {
        console.warn('⚠️ Could not persist backfill completion flag. Non-fatal.', e);
      }
    } catch (e) {
      console.warn('⚠️ One-time backfill encountered an issue (non-fatal):', e);
    }
  };

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('👤 Loading user profile for:', supabaseUser.email);

      const { data: profile, error: readErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (readErr && readErr.code && readErr.code !== 'PGRST116') {
        console.error('❌ Error reading profile:', JSON.stringify(readErr, null, 2));
        console.error('❌ Error details - Code:', readErr.code, 'Message:', readErr.message, 'Details:', readErr.details);
      }

      if (profile) {
        console.log('✅ Profile loaded:', profile.full_name);
        let isAdmin = profile.is_admin || false;
        try {
          if (!isAdmin && supabaseUser.email && ADMIN_EMAILS.has(supabaseUser.email)) {
            const { error: adminErr } = await supabase
              .from('user_profiles')
              .update({ is_admin: true })
              .eq('id', supabaseUser.id);
            if (!adminErr) {
              isAdmin = true;
              console.log('🛡️ Auto-granted admin based on email');
            } else {
              console.warn('Could not auto-grant admin:', adminErr.message);
            }
          }
        } catch (e) {
          console.warn('Auto-admin check failed', e);
        }
        setUser({
          id: profile.id,
          email: supabaseUser.email || '',
          fullName: profile.full_name || 'User',
          username: profile.username,
          avatarUrl: profile.avatar_url,
          relationshipStatus: profile.relationship_status,
          preferredLanguage: profile.preferred_language,
          subscriptionTier: profile.subscription_tier || 'free',
          subscriptionExpiresAt: profile.subscription_expires_at,
          dailyChallengesUsed: profile.daily_challenges_used || 0,
          isAdmin,
        });
        await runOneTimeBackfillForExistingUser(supabaseUser.id);
        return;
      }

      console.log('📝 No profile found, upserting one...');
      const upsertPayload = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        full_name: supabaseUser.user_metadata?.full_name || 'User',
        is_admin: supabaseUser.email ? ADMIN_EMAILS.has(supabaseUser.email) : false,
        updated_at: new Date().toISOString(),
      };

      const { data: upserted, error: upsertErr } = await supabase
        .from('user_profiles')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      try {
        await clearStaleUrlIfNeeded();
        const detected = getDefaultBaseUrl();
        await setBaseUrlOverride(detected);
        console.log('🌍 Auto-set backend base URL for new account:', detected);
      } catch (e) {
        console.warn('⚠️ Failed to auto-set base URL for new account', e);
      }

      if (upsertErr) {
        if (upsertErr.code === '23505') {
          console.warn('ℹ️ Profile already exists (race). Re-reading...');
          const { data: again, error: againErr } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();
          if (againErr) throw againErr;
          setUser({
            id: again.id,
            email: supabaseUser.email || '',
            fullName: again.full_name || 'User',
            username: again.username,
            avatarUrl: again.avatar_url,
            relationshipStatus: again.relationship_status,
            preferredLanguage: again.preferred_language,
            subscriptionTier: again.subscription_tier || 'free',
            subscriptionExpiresAt: again.subscription_expires_at,
            dailyChallengesUsed: again.daily_challenges_used || 0,
            isAdmin: again.is_admin || false,
          });
          return;
        }
        console.error('❌ Upsert profile error:', JSON.stringify(upsertErr, null, 2));
        console.error('❌ Upsert error details - Code:', upsertErr.code, 'Message:', upsertErr.message, 'Details:', upsertErr.details, 'Hint:', upsertErr.hint);
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          fullName: supabaseUser.user_metadata?.full_name || 'User',
          username: supabaseUser.user_metadata?.username,
        });
        return;
      }

      const row = upserted!;
      console.log('✅ Profile created/updated:', row.full_name);
      setUser({
        id: row.id,
        email: supabaseUser.email || '',
        fullName: row.full_name || 'User',
        username: row.username,
        avatarUrl: row.avatar_url,
        relationshipStatus: row.relationship_status,
        preferredLanguage: row.preferred_language,
        subscriptionTier: row.subscription_tier || 'free',
        subscriptionExpiresAt: row.subscription_expires_at,
        dailyChallengesUsed: row.daily_challenges_used || 0,
        isAdmin: (row.is_admin || (supabaseUser.email ? ADMIN_EMAILS.has(supabaseUser.email) : false)) ?? false,
      });
    } catch (err) {
      console.error('💥 Exception loading profile:', err);
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        fullName: supabaseUser.user_metadata?.full_name || 'User',
        username: supabaseUser.user_metadata?.username,
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
          data: { full_name: fullName },
          // Optional: redirectTo: Constants.expoConfig?.extra?.EMAIL_REDIRECT ?? 'noquest://verify-email',
        },
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return { data: null, error };
      }

      console.log('✅ Sign up successful');
      return { data: { user: data.user, session: data.session }, error: null };
    } catch (error: any) {
      console.error('💥 Sign up exception:', error);
      return { data: null, error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔓 Signing in with Supabase Auth:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('❌ Sign in error:', error);
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
      const redirectTo =
        (Constants.expoConfig as any)?.extra?.EMAIL_REDIRECT ??
        'noquest://verify-email';

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
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
      const { error } = await supabase.auth.resend({ type: 'signup', email });
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

  const signInWithGoogle = useCallback(async () => {
    console.log('🔍 Starting Google Sign In...');

    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'noquest',
        path: 'auth/callback',
      });

      console.log('🔗 Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) {
        console.error('❌ Google sign in error:', error);
        return { data: null, error };
      }

      if (Platform.OS === 'web') {
        console.log('✅ Google sign in initiated (web)');
        return { data, error: null };
      }

      if (data?.url) {
        console.log('🌐 Opening auth URL:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success' && result.url) {
          const returned = result.url;
          const hash = returned.split('#')[1] ?? '';
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              console.error('❌ setSession error:', sessionError);
              return { data: null, error: sessionError };
            }

            console.log('✅ Google sign in successful!');
            return { data: sessionData, error: null };
          } else {
            console.error('❌ No tokens found in URL hash');
            return { data: null, error: { message: 'No tokens found in callback URL' } as any };
          }
        }

        if (result.type === 'cancel') {
          console.warn('❌ User cancelled Google sign in');
          return { data: null, error: { message: 'Sign in cancelled' } as any };
        }

        console.error('❌ Auth failed:', result.type);
        return { data: null, error: { message: 'Authentication failed' } as any };
      }

      console.warn('ℹ️ No data.url provided by Supabase OAuth');
      return { data: null, error: null };
    } catch (error: any) {
      console.error('💥 Google sign in exception:', error);
      return { data: null, error };
    }
  }, []);

  const updateRelationshipStatus = useCallback(async (relationshipStatus: 'single' | 'married') => {
    try {
      if (!user?.id) throw new Error('No user logged in');
      console.log('💑 Updating relationship status:', relationshipStatus);
      const { error } = await supabase
        .from('user_profiles')
        .update({ relationship_status: relationshipStatus })
        .eq('id', user.id);
      if (error) {
        console.error('💥 Update relationship status error:', JSON.stringify(error, null, 2));
        console.error('Error details - Code:', error.code, 'Message:', error.message, 'Details:', error.details);
        throw error;
      }
      console.log('✅ Relationship status updated!');
      setUser({ ...user, relationshipStatus });
    } catch (error: any) {
      console.error('💥 Update relationship status exception:', JSON.stringify(error, null, 2));
      console.error('Exception details:', error?.message || error);
      throw error;
    }
  }, [user]);

  const updatePreferredLanguage = useCallback(async (preferredLanguage: string) => {
    try {
      if (!user?.id) throw new Error('No user logged in');
      console.log('🌍 Updating preferred language:', preferredLanguage);
      const { error } = await supabase
        .from('user_profiles')
        .update({ preferred_language: preferredLanguage })
        .eq('id', user.id);
      if (error) throw error;
      console.log('✅ Preferred language updated!');
      setUser({ ...user, preferredLanguage });
    } catch (error: any) {
      console.error('💥 Update preferred language exception:', error);
      throw error;
    }
  }, [user]);

  const updateUsername = useCallback(async (username: string) => {
    try {
      if (!user?.id) throw new Error('No user logged in');
      console.log('👤 Updating username:', username);
      const { error } = await supabase
        .from('user_profiles')
        .update({ username })
        .eq('id', user.id);
      if (error) {
        console.error('💥 Update username error:', JSON.stringify(error, null, 2));
        console.error('Error details - Code:', error.code, 'Message:', error.message, 'Details:', error.details, 'Hint:', error.hint);
        throw error;
      }
      console.log('✅ Username updated!');
      setUser({ ...user, username });
    } catch (error: any) {
      console.error('💥 Update username exception:', JSON.stringify(error, null, 2));
      console.error('Exception details:', error?.message || error);
      throw error;
    }
  }, [user]);

  const updateAvatarUrl = useCallback(async (avatarUrl: string) => {
    try {
      if (!user?.id) throw new Error('No user logged in');
      console.log('🖼️ Updating avatar URL:', avatarUrl);
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
      if (error) throw error;
      console.log('✅ Avatar URL updated!');
      setUser({ ...user, avatarUrl });
    } catch (error: any) {
      console.error('💥 Update avatar URL exception:', error);
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
      signInWithGoogle,
      updateRelationshipStatus,
      updatePreferredLanguage,
      updateUsername,
      updateAvatarUrl,
    }),
    [session, user, isLoading, signUp, signIn, signOut, resetPassword, resendConfirmationEmail, signInWithGoogle, updateRelationshipStatus, updatePreferredLanguage, updateUsername, updateAvatarUrl]
  );
});
