import React, { useState } from 'react';
import { X, Hash, Users } from 'lucide-react';
import { invitationsAPI } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

interface JoinByCodeModalProps {
  onClose: () => void;
}

export function JoinByCodeModal({ onClose }: JoinByCodeModalProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError('Veuillez entrer un code d\'invitation');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await invitationsAPI.joinByCode(code.trim());
      
      if (response.data.type === 'group' && response.data.group) {
        // Accepter directement l'invitation
        try {
          await invitationsAPI.acceptInvitation(response.data.group.id, { 
            invitationCode: code.trim() 
          });
          
          // Fermer le modal et rediriger vers la liste des groupes. We avoid a
          // full page reload here so that the React state (including the
          // authenticated user) remains intact. Navigating to the root of the
          // application will trigger the GroupsView to fetch the updated list.
          onClose();
          navigate('/');
        } catch (acceptError: any) {
          setError(acceptError.response?.data?.error || 'Erreur lors de l\'adhésion au groupe');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Code d\'invitation invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Hash className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Rejoindre avec un code</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code d'invitation
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-lg text-center"
                placeholder="ABC123"
                maxLength={6}
                required
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Entrez le code à 6 caractères fourni par l'organisateur
            </p>
          </div>

          <div className="flex space-x-3">
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
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Adhésion...</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  <span>Rejoindre</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}