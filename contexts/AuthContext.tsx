import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { localStorageService } from '@/lib/localStorage';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface Session {
  userId: string;
  email: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Starting auth initialization...');
        const sessionData = await localStorageService.getSession();
        
        if (sessionData) {
          console.log('Session found:', sessionData.session);
          setSession(sessionData.session);
          setUser({
            id: sessionData.user!.id,
            email: sessionData.user!.email,
            fullName: sessionData.user!.fullName,
          });
        } else {
          console.log('No session found');
        }
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
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    console.log('Signing up with email:', email);
    try {
      const { user: newUser, session: newSession } = await localStorageService.signUp(email, password, fullName);

      setSession({ userId: newUser.id, email: newUser.email });
      setUser({
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
      });

      console.log('Sign up successful');
      return { data: { user: newUser, session: newSession }, error: null };
    } catch (error: any) {
      console.error('Sign up exception:', error);
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('Signing in with email:', email);
    try {
      const { user: authUser, session: authSession } = await localStorageService.signIn(email, password);

      setSession({ userId: authUser.id, email: authUser.email });
      setUser({
        id: authUser.id,
        email: authUser.email,
        fullName: authUser.fullName,
      });

      console.log('Sign in successful');
      return { data: { user: authUser, session: authSession }, error: null };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('Signing out');
    try {
      await localStorageService.signOut();
      setSession(null);
      setUser(null);
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out exception:', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('Resetting password for email:', email);
    return { data: null, error: null };
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
