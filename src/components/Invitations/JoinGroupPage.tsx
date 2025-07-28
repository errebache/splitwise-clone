import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Check, X, UserCheck } from 'lucide-react';
import { invitationsAPI } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { InvitationInfo, Participant } from '../../types';

export function JoinGroupPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetchInvitationInfo();
    }
  }, [token]);

  const fetchInvitationInfo = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await invitationsAPI.joinByToken(token!);
      setInvitationInfo(response.data);

      // If it's a group invitation, fetch participants
      if (response.data.type === 'group' && response.data.group) {
        const participantsResponse = await invitationsAPI.getParticipants(response.data.group.id);
        setParticipants(participantsResponse.data.participants || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invitation invalide ou expirée');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!invitationInfo || !user) return;

    setJoining(true);
    setError('');

    try {
      let groupId: string;
      let participantId: string | undefined;

      if (invitationInfo.type === 'group' && invitationInfo.group) {
        groupId = invitationInfo.group.id;
        participantId = selectedParticipant || undefined;
      } else if (invitationInfo.type === 'participant' && invitationInfo.participant) {
        groupId = invitationInfo.participant.groupId;
        participantId = invitationInfo.participant.id;
      } else {
        throw new Error('Information d\'invitation invalide');
      }

      await invitationsAPI.acceptInvitation(groupId, { participantId });
      
      // Redirect to the group
      navigate('/groups');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'adhésion au groupe');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !invitationInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invitation invalide</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion requise</h2>
          <p className="text-gray-600 mb-6">
            Vous devez vous connecter pour rejoindre ce groupe.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Se connecter
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Créer un compte
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Rejoindre le groupe
          </h1>
          <h2 className="text-xl text-blue-600 font-semibold">
            {invitationInfo?.group?.name || invitationInfo?.participant?.groupName}
          </h2>
          {(invitationInfo?.group?.description || invitationInfo?.participant?.groupDescription) && (
            <p className="text-gray-600 mt-2">
              {invitationInfo.group?.description || invitationInfo.participant?.groupDescription}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Invité par {invitationInfo?.group?.invitedBy || invitationInfo?.participant?.invitedBy}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* For participant invitations, show the specific participant */}
        {invitationInfo?.type === 'participant' && invitationInfo.participant && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Vous avez été invité en tant que :
            </h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {invitationInfo.participant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{invitationInfo.participant.name}</p>
                  {invitationInfo.participant.email && (
                    <p className="text-sm text-gray-600">{invitationInfo.participant.email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* For group invitations, show participant selection */}
        {invitationInfo?.type === 'group' && participants.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Sélectionnez votre nom dans la liste :
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {participants.map((participant) => (
                <label
                  key={participant.id}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedParticipant === participant.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="participant"
                    value={participant.id}
                    checked={selectedParticipant === participant.id}
                    onChange={(e) => setSelectedParticipant(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{participant.name}</p>
                      {participant.email && (
                        <p className="text-sm text-gray-600">{participant.email}</p>
                      )}
                      {participant.status === 'registered' && (
                        <div className="flex items-center space-x-1 mt-1">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-600">Déjà inscrit</span>
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Votre nom n'est pas dans la liste ?</strong><br />
                Vous pouvez quand même rejoindre le groupe. Un nouveau participant sera créé avec votre nom d'utilisateur.
              </p>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleJoinGroup}
            disabled={joining}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {joining ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Adhésion...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Rejoindre le groupe</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}