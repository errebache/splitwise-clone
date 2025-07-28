import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Users, CreditCard, BarChart3, Settings, Crown, RefreshCw } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}


export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { t } = useTranslation();
  
  const menuItems = [
    { id: 'dashboard', label: t('dashboard.title'), icon: Home },
    { id: 'groups', label: t('groups.title'), icon: Users },
    { id: 'expenses', label: t('expenses.title'), icon: CreditCard },
    { id: 'analytics', label: t('analytics.title'), icon: BarChart3 },
    { id: 'payments', label: t('payments.title'), icon: RefreshCw },
    { id: 'settings', label: t('settings.title'), icon: Settings },
  ];
  
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 h-full">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">SplitWise</h2>
            <p className="text-sm text-gray-500">Expense Management</p>
          </div>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
                {item.premium && (
                  <Crown className="h-4 w-4 text-yellow-500 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}