import React, { useState } from 'react';
import { X, UserPlus, Mail } from 'lucide-react';

interface AddMemberModalProps {
  groupId: string;
  onClose: () => void;
  onSubmit: (data: { email: string; temporary_name?: string; phone?: string }) => Promise<{ error: string | null }>;
}

export function AddMemberModal({ groupId, onClose, onSubmit }: AddMemberModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    temporary_name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      setError("L'email est requis");
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Veuillez entrer un email valide');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error } = await onSubmit({
        email: formData.email.trim(),
        temporary_name: formData.temporary_name?.trim() || undefined,
        phone: formData.phone?.trim() || undefined
      });

      if (error) setError(error);
      else onClose();
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Ajouter un membre</h2>
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

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email du membre *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="membre@example.com"
                required
              />
            </div>
          </div>

          {/* Nom temporaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom temporaire (optionnel)
            </label>
            <input
              name="temporary_name"
              type="text"
              value={formData.temporary_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="ex: Marie"
            />
            <p className="text-sm text-gray-500 mt-1">
              Si vide, la partie avant <code>@</code> de l’email sera utilisée.
            </p>
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone (optionnel)
            </label>
            <input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          {/* Astuce */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            💡 Si cette personne n’a pas encore de compte, elle pourra en créer un plus tard avec cet email
            et rejoindre automatiquement le groupe.
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50"
            >
              {loading ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
