import React, { useState } from 'react';
import { X, UserPlus, Mail, Phone, Link, Hash, Send } from 'lucide-react';
import { invitationsAPI } from '../../lib/api';

interface InviteParticipantModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteParticipantModal({ groupId, groupName, onClose, onSuccess }: InviteParticipantModalProps) {
  const [activeTab, setActiveTab] = useState<'participant' | 'link' | 'email'>('participant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Participant form
  const [participantData, setParticipantData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Invitation generation
  const [invitationData, setInvitationData] = useState({
    maxUses: '',
    expiresInDays: '7',
  });
  const [generatedInvitation, setGeneratedInvitation] = useState<{
    code: string;
    link: string;
    expiresAt: string;
  } | null>(null);

  // Email invitation
  const [emailData, setEmailData] = useState({
    name: '',
    email: '',
  });

  // Store the generated invitation link when sending via email
  const [emailInvitationLink, setEmailInvitationLink] = useState<string | null>(null);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!participantData.name.trim()) {
      setError('Le nom est requis');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await invitationsAPI.addParticipant(groupId, {
        name: participantData.name.trim(),
        email: participantData.email.trim() || undefined,
        phone: participantData.phone.trim() || undefined,
      });

      setSuccess(`Participant "${participantData.name}" ajouté avec succès !`);
      setParticipantData({ name: '', email: '', phone: '' });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout du participant');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await invitationsAPI.generateInvitation(groupId, {
        maxUses: invitationData.maxUses ? parseInt(invitationData.maxUses) : undefined,
        expiresInDays: parseInt(invitationData.expiresInDays),
      });

      setGeneratedInvitation({
        code: response.data.invitationCode,
        link: response.data.invitationLink,
        expiresAt: response.data.expiresAt,
      });
      setSuccess('Invitation générée avec succès !');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la génération de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailData.name.trim() || !emailData.email.trim()) {
      setError('Le nom et l\'email sont requis');
      return;
    }

    if (!emailData.email.includes('@')) {
      setError('Veuillez entrer un email valide');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setEmailInvitationLink(null);

    try {
      // Send the invitation by email and capture the returned link
      const response = await invitationsAPI.sendEmailInvitation(groupId, {
        name: emailData.name.trim(),
        email: emailData.email.trim(),
      });

      // The backend returns an invitationLink and a flag indicating if the email was sent
      const link = response?.data?.invitationLink;
      const mailSent = response?.data?.mailSent;
      if (link) {
        setEmailInvitationLink(link);
      }

      // Customize success message based on whether the email was actually sent
      if (mailSent) {
        setSuccess(`Invitation envoyée par e‑mail à ${emailData.email} et lien généré !`);
      } else {
        setSuccess(`Invitation générée pour ${emailData.email}. Copiez le lien ci‑dessous pour l'envoyer manuellement.`);
      }

      setEmailData({ name: '', email: '' });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copié dans le presse-papiers !');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Inviter des participants</h2>
              <p className="text-sm text-gray-600">{groupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('participant')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'participant'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus className="h-4 w-4 inline mr-2" />
              Ajouter participant
            </button>
            <button
              onClick={() => setActiveTab('link')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'link'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Link className="h-4 w-4 inline mr-2" />
              Lien & Code
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'email'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="h-4 w-4 inline mr-2" />
              Invitation email
            </button>
          </nav>
        </div>

        <div className="p-6">
          {(error || success) && (
            <div className={`mb-6 px-4 py-3 rounded-lg ${
              error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {error || success}
            </div>
          )}

          {/* Add Participant Tab */}
          {activeTab === 'participant' && (
            <form onSubmit={handleAddParticipant} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du participant *
                </label>
                <input
                  type="text"
                  value={participantData.name}
                  onChange={(e) => setParticipantData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  placeholder="ex: Marie Dupont"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (optionnel)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={participantData.email}
                    onChange={(e) => setParticipantData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    placeholder="marie@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone (optionnel)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={participantData.phone}
                    onChange={(e) => setParticipantData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Ajout...' : 'Ajouter le participant'}
              </button>
            </form>
          )}

          {/* Link & Code Tab */}
          {activeTab === 'link' && (
            <div className="space-y-6">
              <form onSubmit={handleGenerateInvitation} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre max d'utilisations
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={invitationData.maxUses}
                      onChange={(e) => setInvitationData(prev => ({ ...prev, maxUses: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      placeholder="Illimité"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expire dans (jours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={invitationData.expiresInDays}
                      onChange={(e) => setInvitationData(prev => ({ ...prev, expiresInDays: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Génération...' : 'Générer invitation'}
                </button>
              </form>

              {generatedInvitation && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code d'invitation
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg font-mono text-lg font-bold text-center">
                        {generatedInvitation.code}
                      </div>
                      <button
                        onClick={() => copyToClipboard(generatedInvitation.code)}
                        className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Hash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lien d'invitation
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={generatedInvitation.link}
                        readOnly
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(generatedInvitation.link)}
                        className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Link className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    Expire le {new Date(generatedInvitation.expiresAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <>
              <form onSubmit={handleSendEmail} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du destinataire *
                  </label>
                  <input
                    type="text"
                    value={emailData.name}
                    onChange={(e) => setEmailData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    placeholder="ex: Marie Dupont"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={emailData.email}
                      onChange={(e) => setEmailData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      placeholder="marie@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{loading ? 'Envoi...' : 'Envoyer l\'invitation'}</span>
                </button>
              </form>

              {/* Display the invitation link after sending the email */}
              {emailInvitationLink && (
                <div className="mt-6 space-y-2 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lien envoyé (copiez pour SMS ou partager)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={emailInvitationLink}
                      readOnly
                      className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(emailInvitationLink)}
                      className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Link className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}