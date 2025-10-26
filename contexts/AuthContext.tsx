import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { localStorageService } from '@/lib/localStorage';
import { trpc } from '@/lib/trpc';

interface User {
  id: string;
  email: string;
  fullName: string;
  relationshipStatus?: 'single' | 'married';
  preferredLanguage?: string;
}

interface Session {
  userId: string;
  email: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const sendVerificationEmailMutation = trpc.auth.sendVerificationEmail.useMutation();

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
            relationshipStatus: sessionData.user!.relationshipStatus,
            preferredLanguage: sessionData.user!.preferredLanguage,
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
      const { user: newUser, verificationCode } = await localStorageService.signUp(email, password, fullName);

      console.log('User created/updated, sending verification email...');
      
      try {
        const emailResult = await sendVerificationEmailMutation.mutateAsync({
          email,
          fullName,
          verificationCode,
        });
        
        if (emailResult.success) {
          console.log('Verification email sent successfully');
        } else {
          console.error('Failed to send verification email:', emailResult.error);
          console.log('Note: You can still verify using the code:', verificationCode);
        }
      } catch (emailError: any) {
        let errorMessage = 'Unknown error';
        
        if (emailError?.message) {
          errorMessage = emailError.message;
        } else if (emailError?.data?.message) {
          errorMessage = emailError.data.message;
        } else if (typeof emailError === 'string') {
          errorMessage = emailError;
        } else if (emailError?.error) {
          errorMessage = typeof emailError.error === 'string' ? emailError.error : JSON.stringify(emailError.error);
        } else {
          try {
            errorMessage = JSON.stringify(emailError, null, 2);
          } catch {
            errorMessage = String(emailError);
          }
        }
        
        console.error('Error sending verification email:', errorMessage);
        console.log('Note: You can still verify using the code:', verificationCode);
        console.log('\n⚠️ Email service might be unavailable. Please check backend logs.');
      }

      console.log('Sign up successful, verification required');
      return { data: { user: newUser, verificationCode }, error: null };
    } catch (error: any) {
      console.error('Sign up exception:', error);
      throw error;
    }
  }, [sendVerificationEmailMutation]);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('Signing in with email:', email);
    try {
      const { user: authUser, session: authSession } = await localStorageService.signIn(email, password);

      setSession({ userId: authUser.id, email: authUser.email });
      setUser({
        id: authUser.id,
        email: authUser.email,
        fullName: authUser.fullName,
        relationshipStatus: authUser.relationshipStatus,
        preferredLanguage: authUser.preferredLanguage,
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

  const verifyEmail = useCallback(async (email: string, code: string) => {
    console.log('Verifying email:', email);
    try {
      await localStorageService.verifyEmail(email, code);
      console.log('Email verified successfully');
      return { data: { success: true }, error: null };
    } catch (error: any) {
      console.error('Verification exception:', error);
      throw error;
    }
  }, []);

  const resendVerificationCode = useCallback(async (email: string) => {
    console.log('Resending verification code for:', email);
    try {
      const { verificationCode } = await localStorageService.resendVerificationCode(email);
      
      const users = await localStorageService.getCurrentUser();
      const fullName = users?.fullName || 'User';
      
      try {
        const emailResult = await sendVerificationEmailMutation.mutateAsync({
          email,
          fullName,
          verificationCode,
        });
        
        if (emailResult.success) {
          console.log('Verification email resent successfully');
        } else {
          console.error('Failed to resend verification email:', emailResult.error);
          console.log('Note: You can still verify using the code:', verificationCode);
        }
      } catch (emailError: any) {
        let errorMessage = 'Unknown error';
        
        if (emailError?.message) {
          errorMessage = emailError.message;
        } else if (emailError?.data?.message) {
          errorMessage = emailError.data.message;
        } else if (typeof emailError === 'string') {
          errorMessage = emailError;
        } else if (emailError?.error) {
          errorMessage = typeof emailError.error === 'string' ? emailError.error : JSON.stringify(emailError.error);
        } else {
          try {
            errorMessage = JSON.stringify(emailError, null, 2);
          } catch {
            errorMessage = String(emailError);
          }
        }
        
        console.error('Error resending verification email:', errorMessage);
        console.log('Note: You can still verify using the code:', verificationCode);
        console.log('\n⚠️ Email service might be unavailable. Please check backend logs.');
      }
      
      console.log('Verification code resent');
      return { data: { verificationCode }, error: null };
    } catch (error: any) {
      console.error('Resend verification exception:', error);
      throw error;
    }
  }, [sendVerificationEmailMutation]);

  const updateRelationshipStatus = useCallback(async (relationshipStatus: 'single' | 'married') => {
    try {
      const currentUser = await localStorageService.getCurrentUser();
      if (!currentUser) throw new Error('No user logged in');
      
      await localStorageService.updateRelationshipStatus(currentUser.id, relationshipStatus);
      
      const updatedUser: User = {
        id: currentUser.id,
        email: currentUser.email,
        fullName: currentUser.fullName,
        relationshipStatus,
        preferredLanguage: currentUser.preferredLanguage,
      };
      
      setUser(updatedUser);
    } catch (error: any) {
      console.error('Update relationship status exception:', error);
      throw error;
    }
  }, []);

  const updatePreferredLanguage = useCallback(async (preferredLanguage: string) => {
    try {
      const currentUser = await localStorageService.getCurrentUser();
      if (!currentUser) throw new Error('No user logged in');
      
      await localStorageService.updatePreferredLanguage(currentUser.id, preferredLanguage);
      
      const updatedUser: User = {
        id: currentUser.id,
        email: currentUser.email,
        fullName: currentUser.fullName,
        relationshipStatus: currentUser.relationshipStatus,
        preferredLanguage,
      };
      
      setUser(updatedUser);
    } catch (error: any) {
      console.error('Update preferred language exception:', error);
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
      verifyEmail,
      resendVerificationCode,
      updateRelationshipStatus,
      updatePreferredLanguage,
    }),
    [session, user, isLoading, signUp, signIn, signOut, resetPassword, verifyEmail, resendVerificationCode, updateRelationshipStatus, updatePreferredLanguage]
  );
});
