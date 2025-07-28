import React from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { analyticsAPI } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, Download, FileText } from 'lucide-react';

const categoryColors = {
  'Restaurant': '#FF6B6B',
  'Transport': '#4ECDC4',
  'Hébergement': '#45B7D1',
  'Shopping': '#96CEB4',
  'Divertissement': '#FFEAA7',
  'Autre': '#95A5A6'
};

export function AnalyticsView() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [spenders, setSpenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [overviewRes, categoriesRes, trendsRes, spendersRes] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getExpensesByCategory(),
        analyticsAPI.getMonthlyTrends(),
        analyticsAPI.getTopSpenders()
      ]);

      setOverview(overviewRes.data.overview);
      
      // Format categories data for pie chart
      const formattedCategories = categoriesRes.data.categories.map((cat: any) => ({
        name: cat.category,
        value: parseFloat(cat.total),
        color: categoryColors[cat.category as keyof typeof categoryColors] || categoryColors['Autre']
      }));
      setCategories(formattedCategories);
      
      // Format trends data
      const formattedTrends = trendsRes.data.trends.map((trend: any) => ({
        month: new Date(trend.month + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
        expenses: parseFloat(trend.total)
      }));
      setTrends(formattedTrends);
      
      // Format spenders data
      const formattedSpenders = spendersRes.data.spenders.map((spender: any) => ({
        name: spender.full_name,
        amount: parseFloat(spender.total_spent)
      }));
      setSpenders(formattedSpenders);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="text-gray-600">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            <Download className="h-4 w-4" />
            <span>{t('analytics.exportData')}</span>
          </button>
          <button className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
            <FileText className="h-4 w-4" />
            <span>{t('analytics.generateReport')}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.averageExpense')}</p>
              <p className="text-2xl font-bold text-gray-900">
                €{overview ? (overview.totalExpenses / Math.max(1, overview.totalGroups)).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.totalTransactions')}</p>
              <p className="text-2xl font-bold text-gray-900">{spenders.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.mostActiveGroup')}</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.totalGroups || 0} groupes</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Croissance</p>
              <p className="text-2xl font-bold text-green-600">
                €{overview?.netBalance >= 0 ? '+' : ''}{Number(overview?.netBalance)?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.expensesByCategory')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`€${value}`, 'Montant']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.monthlyTrends')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`€${value}`, 'Dépenses']} />
              <Line type="monotone" dataKey="expenses" stroke="#4F46E5" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Spenders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('analytics.topSpenders')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={spenders}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`€${value}`, 'Montant']} />
            <Bar dataKey="amount" fill="#4F46E5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}