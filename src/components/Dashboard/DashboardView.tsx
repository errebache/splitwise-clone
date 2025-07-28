import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatsCard } from './StatsCard';
import { analyticsAPI } from '../../lib/api';
import { Users, CreditCard, TrendingUp, Wallet, Plus } from 'lucide-react';
import { useGroups } from '../../hooks/useGroups';
import { useAuth } from '../../hooks/useAuth';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

interface OverviewData {
  totalExpenses: number;
  totalGroups: number;
  netBalance: number;
  pendingReimbursements: number;
}

interface RecentActivity {
  id: string;
  type: 'expense' | 'payment' | 'member';
  title: string;
  description: string;
  time: string;
  icon: 'plus' | 'wallet' | 'users';
  color: 'blue' | 'green' | 'purple';
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { groups, loading: groupsLoading } = useGroups(user?.id);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsAPI.getOverview();
      setOverview(response.data.overview);
      generateRecentActivities(response.data.overview);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError('Erreur lors du chargement des données');
      setOverview({
        totalExpenses: 0,
        totalGroups: 0,
        netBalance: 0,
        pendingReimbursements: 0
      });
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivities = (overviewData: OverviewData) => {
    const activities: RecentActivity[] = [];

    if (overviewData && overviewData.totalExpenses > 0) {
      activities.push({
        id: '1',
        type: 'expense',
        title: 'Dépense récente',
        description: `Total des dépenses: €${Number(overviewData.totalExpenses).toFixed(2)}`,
        time: 'Aujourd\'hui',
        icon: 'plus',
        color: 'blue'
      });
    }

    if (overviewData && typeof overviewData.netBalance === 'number' && overviewData.netBalance !== 0) {
      activities.push({
        id: '2',
        type: 'payment',
        title: overviewData.netBalance > 0 ? 'Crédit disponible' : 'Remboursement dû',
        description: `Solde net: €${Number(overviewData.netBalance).toFixed(2)}`,
        time: 'Mis à jour',
        icon: 'wallet',
        color: 'green'
      });
    }

    if (overviewData && overviewData.totalGroups > 0) {
      activities.push({
        id: '3',
        type: 'member',
        title: 'Groupes actifs',
        description: `${overviewData.totalGroups} groupe(s) actif(s)`,
        time: 'Actuel',
        icon: 'users',
        color: 'purple'
      });
    }

    if (activities.length === 0) {
      activities.push({
        id: 'default',
        type: 'expense',
        title: 'Bienvenue sur SplitWise',
        description: 'Commencez par créer votre premier groupe',
        time: 'Maintenant',
        icon: 'plus',
        color: 'blue'
      });
    }

    setRecentActivities(activities);
  };

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'plus': return Plus;
      case 'wallet': return Wallet;
      case 'users': return Users;
      default: return Plus;
    }
  };

  const getActivityColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'purple': return 'bg-purple-500';
      default: return 'bg-blue-500';
    }
  };

  const getActivityBgClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50';
      case 'green': return 'bg-green-50';
      case 'purple': return 'bg-purple-50';
      default: return 'bg-blue-50';
    }
  };

  if (loading || groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600">{t('dashboard.subtitle')}</p>
        </div>
        <button
          onClick={() => onNavigate('groups')}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{t('dashboard.newGroup')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={t('dashboard.activeGroups')}
          value={(overview?.totalGroups || 0).toString()}
          icon={Users}
          color="blue"
          trend={{ value: overview?.totalGroups > 0 ? 12 : 0, isPositive: true }}
        />
        <StatsCard
          title={t('dashboard.totalExpenses')}
          value={`€${Number(overview?.totalExpenses || 0).toFixed(2)}`}
          icon={CreditCard}
          color="green"
          trend={{ value: overview?.totalExpenses > 0 ? 8 : 0, isPositive: true }}
        />
        <StatsCard
          title={t('dashboard.netBalance')}
          value={`€${overview?.netBalance >= 0 ? '+' : ''}${Number(overview?.netBalance || 0).toFixed(2)}`}
          icon={TrendingUp}
          color="purple"
          trend={{ value: overview?.netBalance > 0 ? 5 : 0, isPositive: overview?.netBalance >= 0 }}
        />
        <StatsCard
          title={t('dashboard.reimbursements')}
          value={`€${Number(overview?.pendingReimbursements || 0).toFixed(2)}`}
          icon={Wallet}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentGroups')}</h3>
          <div className="space-y-4">
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun groupe créé</p>
                <button
                  onClick={() => onNavigate('groups')}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Créer votre premier groupe
                </button>
              </div>
            ) : (
              groups.slice(0, 3).map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => onNavigate('groups')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                      <p className="text-sm text-gray-500">{group.description || 'Aucune description'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">€{Number(group.total_expenses || 0).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{group.currency || 'EUR'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentActivity')}</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const IconComponent = getActivityIcon(activity.icon);
              return (
                <div key={activity.id} className={`flex items-center space-x-3 p-3 ${getActivityBgClass(activity.color)} rounded-lg`}>
                  <div className={`w-8 h-8 ${getActivityColorClass(activity.color)} rounded-full flex items-center justify-center`}>
                    <IconComponent className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
