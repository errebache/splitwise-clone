import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { LoginForm } from './components/Auth/LoginForm';
import { SignUpForm } from './components/Auth/SignUpForm';
import { DashboardView } from './components/Dashboard/DashboardView';
import { GroupsView } from './components/Groups/GroupsView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { PaymentsView } from './components/Payments/PaymentsView';
import { JoinGroupPage } from './components/Invitations/JoinGroupPage';
import { JoinByCodeModal } from './components/Invitations/JoinByCodeModal';
import { Group } from './types';

function App() {
  const { t } = useTranslation();
  const { user, loading, isTrialActive } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showJoinByCode, setShowJoinByCode] = useState(false);

  const handleNavigate = (view: string) => {
    setActiveTab(view);
    if (view !== 'expenses') {
      setSelectedGroup(null);
    }
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setActiveTab('expenses');
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
    setActiveTab('groups');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/join/:token" element={<JoinGroupPage />} />
          <Route path="*" element={
            authMode === 'login' ? (
              <LoginForm onToggleMode={() => setAuthMode('signup')} />
            ) : (
              <SignUpForm onToggleMode={() => setAuthMode('login')} />
            )
          } />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/join/:token" element={<JoinGroupPage />} />
          <Route path="*" element={
            <div className="min-h-screen bg-gray-50">
              <Header 
                title={selectedGroup ? selectedGroup.name : 'SplitWise'}
                showBack={!!selectedGroup}
                onBack={handleBackToGroups}
                onJoinByCode={() => setShowJoinByCode(true)}
              />
              
              <div className="flex">
                <Sidebar activeTab={activeTab} onTabChange={handleNavigate} />
                
                <main className="flex-1 p-6">
                  {activeTab === 'dashboard' && (
                    <DashboardView onNavigate={handleNavigate} />
                  )}
                  
                  {activeTab === 'groups' && !selectedGroup && (
                    <GroupsView onSelectGroup={handleSelectGroup} />
                  )}
                  
                  {activeTab === 'expenses' && selectedGroup && (
                    <ExpensesView 
                      group={selectedGroup} 
                      onBack={handleBackToGroups} 
                    />
                  )}
                  
                  {activeTab === 'analytics' && (
                    <AnalyticsView />
                  )}
                  
                  {activeTab === 'payments' && (
                    <PaymentsView />
                  )}
                  
                  {activeTab === 'settings' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.title')}</h2>
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('settings.profile')}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('auth.fullName')}
                              </label>
                              <input
                                type="text"
                                value={user.user_metadata?.full_name || ''}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                readOnly
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('auth.email')}
                              </label>
                              <input
                                type="email"
                                value={user.email || ''}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                readOnly
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('settings.preferences')}</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('settings.language')}
                              </label>
                              <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="fr">Français</option>
                                <option value="en">English</option>
                                <option value="ar">العربية</option>
                                <option value="es">Español</option>
                                <option value="de">Deutsch</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('settings.defaultCurrency')}
                              </label>
                              <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="EUR">Euro (€)</option>
                                <option value="USD">Dollar US ($)</option>
                                <option value="GBP">Livre Sterling (£)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('settings.subscription')}</h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            {isTrialActive ? (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{t('dashboard.trialActive')}</p>
                                  <p className="text-sm text-gray-600">
                                    {user.trial_ends_at && t('settings.trialEndsOn', { 
                                      date: new Date(user.trial_ends_at).toLocaleDateString() 
                                    })}
                                  </p>
                                </div>
                                <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all">
                                  {t('settings.upgradeToPremium')}
                                </button>
                              </div>
                            ) : (
                              <div className="text-center">
                                <p className="font-medium text-gray-900">
                                  {user.subscription_status === 'premium' ? 'Premium' : 'Gratuit'}
                                </p>
                                {user.subscription_status !== 'premium' && (
                                  <button className="mt-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all">
                                    {t('settings.upgradeToPremium')}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </main>
              </div>
              
              {showJoinByCode && (
                <JoinByCodeModal onClose={() => setShowJoinByCode(false)} />
              )}
            </div>
          } />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;