import React, { useState, useEffect } from 'react';
import { X, CreditCard, Users, Calculator } from 'lucide-react';
import { Group, GroupMember, User } from '../../types';
import { groupsAPI } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

interface AddExpenseModalProps {
  group: Group;
  onClose: () => void;
  onSubmit: (expenseData: any) => Promise<{ error: string | null }>;
}

const categories = [
  'Restaurant',
  'Transport',
  'Hébergement',
  'Shopping',
  'Divertissement',
  'Autre',
];


export function AddExpenseModal({ group, onClose, onSubmit }: AddExpenseModalProps) {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState('');

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Restaurant',
    date: new Date().toISOString().split('T')[0],
    paid_by: currentUser?.id || '',
    split_type: 'equal' as 'equal' | 'custom',
    participants: [] as Array<{
      user_id: string;
      amount_owed: number;
      selected: boolean;
    }>,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Charger les membres du groupe
  useEffect(() => {
    if (group.id) {
      fetchGroupMembers();
    }
  }, [group.id]);

  const fetchGroupMembers = async () => {
    try {
      setLoadingMembers(true);
      setMembersError('');
      
      const response = await groupsAPI.getById(group.id);
      const groupMembers = response.data.members || [];
      const pendingMembers = response.data.pendingMembers || [];
      
      console.log('Fetched group members:', groupMembers);
      console.log('Fetched pending members:', pendingMembers);
      
      // Combine registered and pending members
      const allMembers = [
        ...groupMembers,
        ...pendingMembers.map(pm => ({
          id: `pending_${pm.id}`,
          group_id: pm.group_id,
          user_id: `pending_${pm.id}`,
          role: 'member' as const,
          joined_at: pm.created_at,
          user: {
            id: `pending_${pm.id}`,
            email: pm.email,
            full_name: pm.temporary_name,
            created_at: pm.created_at,
            subscription_status: 'free' as const
          },
          isPending: true
        }))
      ];
      
      setMembers(allMembers);
      
      // Initialiser les participants avec tous les membres sélectionnés
      const initialParticipants = allMembers.map(member => ({
        user_id: member.user_id,
        amount_owed: 0,
        selected: true
      }));
      
      setFormData(prev => ({
        ...prev,
        participants: initialParticipants,
        paid_by: currentUser?.id || (allMembers.find(m => !m.isPending)?.user_id || allMembers[0]?.user_id || '')
      }));
      
    } catch (err: any) {
      console.error('Error fetching group members:', err);
      setMembersError('Erreur lors du chargement des membres');
      
      // Fallback avec l'utilisateur actuel seulement
      if (currentUser) {
        const fallbackMembers: GroupMember[] = [{
          id: '1',
          group_id: group.id,
          user_id: currentUser.id,
          role: 'admin' as const,
          joined_at: new Date().toISOString(),
          user: {
            id: currentUser.id,
            email: currentUser.email,
            full_name: currentUser.full_name,
            created_at: currentUser.created_at,
            subscription_status: currentUser.subscription_status
          }
        }];
        
        setMembers(fallbackMembers);
        setFormData(prev => ({
          ...prev,
          participants: [{
            user_id: currentUser.id,
            amount_owed: 0,
            selected: true
          }],
          paid_by: currentUser.id
        }));
      }
    } finally {
      setLoadingMembers(false);
    }
  };
  const selectedParticipants = formData.participants.filter(p => p.selected);
  const totalAmount = parseFloat(formData.amount) || 0;
  const amountPerPerson = selectedParticipants.length > 0 ? totalAmount / selectedParticipants.length : 0;

  // Validation pour partage personnalisé
  const validateCustomSplit = () => {
    if (formData.split_type === 'custom') {
      const totalCustomAmount = selectedParticipants.reduce((sum, p) => sum + p.amount_owed, 0);
      const difference = Math.abs(totalCustomAmount - totalAmount);
      return difference < 0.01; // Tolérance de 1 centime
    }
    return true;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      setError('La description est requise');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    if (selectedParticipants.length === 0) {
      setError('Au moins un participant doit être sélectionné');
      return;
    }

    if (!validateCustomSplit()) {
      setError('Le total des montants personnalisés doit égaler le montant de la dépense');
      return;
    }

    if (!formData.paid_by) {
      setError('Veuillez sélectionner qui a payé');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const expenseData = {
        group_id: group.id,
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        currency: group.currency,
        category: formData.category,
        date: formData.date,
        paid_by: formData.paid_by,
        split_type: formData.split_type,
        is_settled: false,
        participants: selectedParticipants.map(participant => ({
          user_id: participant.user_id,
          amount_owed: formData.split_type === 'equal' ? amountPerPerson : participant.amount_owed,
        })),
      };

      console.log('Submitting expense data:', expenseData);

      const { error } = await onSubmit(expenseData);
      if (error) {
        setError(error);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error submitting expense:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.user_id === userId ? { ...p, selected: !p.selected } : p
      ),
    }));
  };

  const handleCustomAmountChange = (userId: string, amount: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p =>
        p.user_id === userId ? { ...p, amount_owed: parseFloat(amount) || 0 } : p
      ),
    }));
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    const name = member?.user?.full_name || member?.user?.email || 'Utilisateur inconnu';
    return member?.isPending ? `${name} (en attente)` : name;
  };

  const getMemberInitials = (userId: string) => {
    const name = getMemberName(userId);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Ajouter une dépense</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loadingMembers ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des membres...</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {(error || membersError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error || membersError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="ex: Restaurant Le Comptoir"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant ({group.currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payé par
            </label>
            <select
              value={formData.paid_by}
              onChange={(e) => setFormData(prev => ({ ...prev, paid_by: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {members.filter(m => !m.isPending).map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {getMemberName(member.user_id)}
                </option>
              ))}
              {members.filter(m => m.isPending).length > 0 && (
                <optgroup label="Membres en attente d'inscription">
                  {members.filter(m => m.isPending).map((member) => (
                    <option key={member.user_id} value={member.user_id} disabled>
                      {getMemberName(member.user_id)} - Ne peut pas payer
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Les membres en attente d'inscription ne peuvent pas être sélectionnés comme payeur
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de partage
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="equal"
                  checked={formData.split_type === 'equal'}
                  onChange={(e) => setFormData(prev => ({ ...prev, split_type: e.target.value as any }))}
                  className="mr-2"
                />
                Partage égal
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="custom"
                  checked={formData.split_type === 'custom'}
                  onChange={(e) => setFormData(prev => ({ ...prev, split_type: e.target.value as any }))}
                  className="mr-2"
                />
                Montants personnalisés
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Participants
            </label>
            <div className="space-y-3">
              {formData.participants.map((participant) => {
                return (
                  <div
                    key={participant.user_id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      participant.selected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participant.selected}
                        onChange={() => handleParticipantToggle(participant.user_id)}
                        className="rounded"
                      />
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {getMemberInitials(participant.user_id)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {getMemberName(participant.user_id)}
                      </span>
                    </label>
                    
                    {participant.selected && (
                      <div className="flex items-center space-x-2">
                        {formData.split_type === 'equal' ? (
                          <span className="text-sm font-medium text-gray-900">
                            {group.currency} {Number(amountPerPerson).toFixed(2)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={participant.amount_owed}
                            onChange={(e) => handleCustomAmountChange(participant.user_id, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="0.00"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {formData.split_type === 'custom' && totalAmount > 0 && selectedParticipants.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">
                  Total personnalisé : {group.currency} {selectedParticipants.reduce((sum, p) => sum + p.amount_owed, 0).toFixed(2)} / {group.currency} {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {formData.split_type === 'equal' && totalAmount > 0 && selectedParticipants.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Chaque participant devra : {group.currency} {amountPerPerson.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Ajout...' : 'Ajouter la dépense'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}