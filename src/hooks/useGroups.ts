import { useState, useEffect } from 'react';
import { groupsAPI } from '../lib/api';
import { Group } from '../types';

interface MemberData {
  email: string;
  temporary_name?: string;
  phone?: string;
}

export function useGroups(userId?: string) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    fetchUserGroups();
  }, [userId]);

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getAll();
      setGroups(response.data.groups || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des groupes');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (name: string, description?: string, currency = 'EUR') => {
    try {
      const response = await groupsAPI.create({ name, description, currency });
      const newGroup = response.data.group;
      setGroups(prev => [...prev, newGroup]);
      return { data: newGroup, error: null };
    } catch (err: any) {
      return { 
        data: null, 
        error: err.response?.data?.error || 'Erreur lors de la création du groupe' 
      };
    }
  };

  const updateGroup = async (groupId: string, updates: Partial<Group>) => {
    try {
      await groupsAPI.update(groupId, updates);
      setGroups(prev => 
        prev.map(group => 
          group.id === groupId 
            ? { ...group, ...updates, updated_at: new Date().toISOString() }
            : group
        )
      );
      return { error: null };
    } catch (err: any) {
      return { 
        error: err.response?.data?.error || 'Erreur lors de la mise à jour du groupe' 
      };
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await groupsAPI.delete(groupId);
      setGroups(prev => prev.filter(group => group.id !== groupId));
      return { error: null };
    } catch (err: any) {
      return { 
        error: err.response?.data?.error || 'Erreur lors de la suppression du groupe' 
      };
    }
  };

  // ✅ Corrigé : memberData est un objet complet maintenant
  const addMember = async (groupId: string, memberData: MemberData) => {
    try {
      await groupsAPI.addMember(groupId, memberData);
      await fetchUserGroups();
      return { error: null };
    } catch (err: any) {
      return { 
        error: err.response?.data?.error || 'Erreur lors de l\'ajout du membre' 
      };
    }
  };

  const getGroupDetails = async (groupId: string) => {
    try {
      const response = await groupsAPI.getById(groupId);
      return { data: response.data, error: null };
    } catch (err: any) {
      return { 
        data: null, 
        error: err.response?.data?.error || 'Erreur lors du chargement du groupe' 
      };
    }
  };

  const removeMember = async (groupId: string, userId: string) => {
    try {
      await groupsAPI.removeMember(groupId, userId);
      await fetchUserGroups();
      return { error: null };
    } catch (err: any) {
      return { 
        error: err.response?.data?.error || 'Erreur lors de la suppression du membre' 
      };
    }
  };

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupDetails,
    addMember, // ✅ accepte maintenant un objet { email, temporary_name?, phone? }
    removeMember,
    refetch: fetchUserGroups,
  };
}
