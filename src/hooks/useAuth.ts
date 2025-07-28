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
      
      // Force page reload to trigger navigation
      window.location.reload();
      
      return { data: { user }, error: null };
    } catch (error: any) {
      return { 
        data: null, 
        error: { message: error.response?.data?.error || 'Erreur lors de la connexion' } 
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await authAPI.register({ 
        email, 
        password, 
        full_name: fullName 
      });
      const { token, user } = response.data;
      
      localStorage.setItem('auth_token', token);
      localStorage.setItem('current_user', JSON.stringify(user));
      setUser(user);
      
      // Force page reload to trigger navigation
      window.location.reload();
      
      return { data: { user }, error: null };
    } catch (error: any) {
      return { 
        data: null, 
        error: { message: error.response?.data?.error || 'Erreur lors de l\'inscription' } 
      };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    setUser(null);
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