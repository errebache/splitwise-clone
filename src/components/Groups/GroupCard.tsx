import React from 'react';
import { useState } from 'react';
import { Group } from '../../types';
import { Users, MoreVertical, Settings, Trash, UserPlus, Send } from 'lucide-react';
import { InviteParticipantModal } from './InviteParticipantModal';
import { useGroups } from '../../hooks/useGroups';

interface GroupCardProps {
  group: Group;
  onSelect: (group: Group) => void;
  onEdit: (group: Group) => void;
  onDelete: (groupId: string) => void;
}

export function GroupCard({ group, onSelect, onEdit, onDelete }: GroupCardProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { addMember } = useGroups();

  const handleAddMember = async (memberData: any) => {
    const { error } = await addMember(group.id, memberData);
    if (!error) {
      setShowInviteModal(false);
    }
    return { error };
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer group">
      <div className="p-6" onClick={() => onSelect(group)}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {group.name}
              </h3>
              <p className="text-sm text-gray-500">{group.description}</p>
            </div>
          </div>
          
          <div className="relative group/menu">
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-10">
              <div className="py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInviteModal(true);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>Inviter participants</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(group);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(group.id);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash className="h-4 w-4" />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Total dépenses</p>
            <p className="text-lg font-semibold text-gray-900">
              {group.currency} {(Number(group.total_expenses) || 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{group.member_count === 1 ? 'Membre' : 'Membres'}</p>
            <p className="text-lg font-semibold text-gray-900 -space-x-2">{group.member_count} </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full border-2 border-white flex items-center justify-center"
              >
                <span className="text-xs font-medium text-white">
                  {String.fromCharCode(64 + i)}
                </span>
              </div>
            ))}
            <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">+1</span>
            </div>
          </div>
          
          <span className="text-xs text-gray-500">
            Mis à jour {new Date(group.updated_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>
      </div>

      {showInviteModal && (
        <InviteParticipantModal
          groupId={group.id}
          groupName={group.name}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
}