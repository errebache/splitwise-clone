import React, { useState } from 'react';
import { useEffect } from 'react';
import { ExpenseCard } from './ExpenseCard';
import { AddExpenseModal } from './AddExpenseModal';
import { BalancesSummary } from './BalancesSummary';
import { useExpenses } from '../../hooks/useExpenses';
import { Group } from '../../types';
import { Balance, Settlement } from '../../types';
import { Plus, Filter, TrendingUp } from 'lucide-react';

interface ExpensesViewProps {
  group: Group;
  onBack: () => void;
}

export function ExpensesView({ group, onBack }: ExpensesViewProps) {
  const {
    expenses,
    loading,
    error,
    addExpense,
    markExpenseAsSettled,
    calculateBalances,
    calculateSettlements,
  } = useExpenses(group.id);
  
  console.log('ExpensesView - group:', group);
  console.log('ExpensesView - expenses:', expenses);
  console.log('ExpensesView - loading:', loading);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    if (group.id) {
      loadBalances();
    }
  }, [group.id, expenses]);

  const loadBalances = async () => {
    try {
      const balanceData = await calculateBalances();
      setBalances(balanceData);
      setSettlements(calculateSettlements(balanceData));
    } catch (error) {
      console.error('Error loading balances:', error);
      setBalances([]);
      setSettlements([]);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    if (filter === 'pending') return !expense.is_settled;
    if (filter === 'settled') return expense.is_settled;
    return true;
  });

  const handleAddExpense = async (expenseData: any) => {
    const { error } = await addExpense({
      ...expenseData,
      group_id: group.id,
    });
    if (!error) {
      setShowAddModal(false);
      await loadBalances(); // Recharger les soldes après ajout
    }
    return { error };
  };

  // If there was an error loading expenses (for example, the user is not
  // authorized to view this group's expenses), surface the error to the user.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
        <p className="text-red-600 font-semibold">{error}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 mt-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retour aux groupes
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 mb-2 transition-colors"
          >
            ← Retour aux groupes
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-gray-600">{group.description}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Ajouter une dépense</span>
        </button>
      </div>

      <BalancesSummary 
        balances={balances}
        settlements={settlements}
        currency={group.currency}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Dépenses</h2>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Toutes</option>
            <option value="pending">En attente</option>
            <option value="settled">Réglées</option>
          </select>
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'Aucune dépense' : `Aucune dépense ${filter === 'pending' ? 'en attente' : 'réglée'}`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? 'Commencez par ajouter votre première dépense'
              : 'Changez le filtre pour voir d\'autres dépenses'
            }
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Ajouter ma première dépense
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              currency={group.currency}
              onMarkAsSettled={markExpenseAsSettled}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddExpenseModal
          group={group}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddExpense}
        />
      )}
    </div>
  );
}