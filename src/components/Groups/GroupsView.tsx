import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GroupCard } from './GroupCard';
import { CreateGroupModal } from './CreateGroupModal';
import { useGroups } from '../../hooks/useGroups';
import { useAuth } from '../../hooks/useAuth';
import { Group } from '../../types';
import { Plus, Search } from 'lucide-react';

interface GroupsViewProps {
  onSelectGroup: (group: Group) => void;
}

export function GroupsView({ onSelectGroup }: GroupsViewProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { groups, loading, createGroup, updateGroup, deleteGroup } = useGroups(user?.id);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = async (name: string, description?: string, currency?: string) => {
    const { error } = await createGroup(name, description, currency);
    if (!error) {
      setShowCreateModal(false);
    }
    return { error };
  };

  const handleEditGroup = async (name: string, description?: string, currency?: string) => {
    if (!editingGroup) return { error: 'Aucun groupe à modifier' };
    
    const { error } = await updateGroup(editingGroup.id, { name, description, currency });
    if (!error) {
      setEditingGroup(null);
    }
    return { error };
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (window.confirm(t('groups.confirmDelete'))) {
      await deleteGroup(groupId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('groups.title')}</h1>
          <p className="text-gray-600">{t('groups.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{t('groups.newGroup')}</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('groups.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Aucun groupe trouvé' : t('groups.noGroups')}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Essayez un autre terme de recherche'
              : t('groups.noGroupsSubtitle')
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              {t('groups.createFirstGroup')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onSelect={onSelectGroup}
              onEdit={setEditingGroup}
              onDelete={handleDeleteGroup}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
        />
      )}

      {editingGroup && (
        <CreateGroupModal
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSubmit={handleEditGroup}
        />
      )}
    </div>
  );
}