import { useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  subscription_status: 'free' | 'premium' | 'trial';
  trial_ends_at?: string;
  created_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authAPI.getProfile();
      setUser(response.data.user);
    } catch (error) {
      console.warn('Auth check failed - using local mode');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      
      // Try to get user from localStorage as fallback
      const localUser = localStorage.getItem('current_user');
      if (localUser) {
        try {
          setUser(JSON.parse(localUser));
        } catch (e) {
          console.error('Error parsing local user data');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const isTrialActive = (user: User | null): boolean => {
    if (!user || user.subscription_status !== 'trial') return false;
    if (!user.trial_ends_at) return false;
    return new Date(user.trial_ends_at) > new Date();
  };

  const getTrialDaysLeft = (user: User | null): number => {
    if (!user || !user.trial_ends_at) return 0;
    const endDate = new Date(user.trial_ends_at);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('current_user', JSON.stringify(user));
      setUser(user);
      
      // Rather than forcing a full reload (which caused the app to fall back to the
      // unauthenticated login view), navigate back to the root of the application.
      // Updating the user state and localStorage is sufficient for the router to
      // re-render the authenticated views. A reload here was causing the
      // application to briefly render the login form even after a successful
      // authentication. Redirecting to `/` keeps the React state intact.
      window.location.href = '/';
      
      return { data: { user }, error: null };
    } catch (error: any) {
      return { 
        data: null, 
        error: { message: error.response?.data?.error || 'Erreur lors de la connexion' } 
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    /**
     * Effectue l'inscription d'un nouvel utilisateur. Contrairement à la
     * connexion, cette méthode ne persiste pas le token de session et ne
     * renseigne pas l'état `user`. L'objectif est de forcer l'utilisateur à
     * passer par l'écran de connexion après avoir créé son compte. Le back
     * renvoie tout de même le token et les informations de l'utilisateur,
     * mais celles‑ci sont simplement retournées à l'appelant pour affichage
     * éventuel (ex : message de succès). La redirection vers la page de
     * connexion est gérée par le composant SignUpForm.
     */
    try {
      const response = await authAPI.register({
        email,
        password,
        full_name: fullName,
      });
      const { user } = response.data;
      // Ne pas stocker le token ni définir l'utilisateur dans le state :
      // l'utilisateur doit se connecter manuellement après l'inscription.
      return { data: { user }, error: null };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.response?.data?.error || "Erreur lors de l'inscription" },
      };
    }
  };

  const signOut = async () => {
    // Remove any persisted authentication state and clear the local user
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    setUser(null);
    /*
     * Force a full page reload after logging out. Because each call to
     * `useAuth` maintains its own state, simply clearing the user here
     * doesn't propagate to other instances of the hook (e.g. in `App`).
     * Reloading ensures that every component re-runs its auth check and
     * the router displays the correct public views (login or sign up).
     */
    window.location.reload();
    return { error: null };
  };

  const updateProfile = async (data: { full_name?: string; avatar_url?: string }) => {
    try {
      const response = await authAPI.updateProfile(data);
      setUser(response.data.user);
      return { error: null };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Erreur lors de la mise à jour' };
    }
  };

  return {
    user,
    loading,
    isTrialActive: isTrialActive(user),
    trialDaysLeft: getTrialDaysLeft(user),
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
}