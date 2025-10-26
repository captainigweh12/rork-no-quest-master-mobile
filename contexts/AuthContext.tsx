import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Starting auth initialization...');
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('Initial session:', session);
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Session initialization error:', error);
        setSession(null);
        setUser(null);
      } finally {
        console.log('Auth initialization complete');
        setIsLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    console.log('Signing up with email:', email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        throw error;
      }

      console.log('Sign up successful:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Sign up exception:', error);
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('Signing in with email:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        if (error.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to authentication server. Please check your internet connection and try again.');
        }
        throw error;
      }

      console.log('Sign in successful:', data);
      return { data, error: null };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      if (error.message?.includes('fetch') || error.name?.includes('Fetch')) {
        throw new Error('Network error: Unable to connect to authentication server. Please check your internet connection and try again.');
      }
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('Signing out');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out exception:', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('Resetting password for email:', email);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'rejectionhero://reset-password',
      });

      if (error) {
        console.error('Reset password error:', error);
        throw error;
      }

      console.log('Reset password email sent:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Reset password exception:', error);
      throw error;
    }
  }, []);

  return useMemo(
    () => ({
      session,
      user,
      isLoading,
      signUp,
      signIn,
      signOut,
      resetPassword,
    }),
    [session, user, isLoading, signUp, signIn, signOut, resetPassword]
  );
});
