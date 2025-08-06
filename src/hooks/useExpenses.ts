import { useState, useEffect } from 'react';
import { expensesAPI } from '../lib/api';
import { Expense, Balance, Settlement } from '../types';

export function useExpenses(groupId?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    fetchExpenses();
  }, [groupId]);

  const fetchExpenses = async () => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      console.log('Fetching expenses for group:', groupId);
      const response = await expensesAPI.getByGroup(groupId);
      console.log('Fetched expenses response:', response);
      console.log('Fetched expenses data:', response.data);
      const expenses = response.data?.expenses || [];
      console.log('Setting expenses:', expenses);
      setExpenses(expenses);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      console.error('Error response:', err.response?.data);
      // When the backend returns a 403 status, the user is not allowed to view
      // the expenses for this group. Surface this to the UI rather than
      // silently failing and leaving an empty list which can cause
      // downstream components to crash.
      if (err.response?.status === 403) {
        setError(err.response.data?.error || 'Accès refusé à ce groupe');
      } else {
        setError(err.response?.data?.error || 'Erreur lors du chargement des dépenses');
      }
      setExpenses([]);
    } finally {
      console.log('fetchExpenses terminé, setting loading to false');
      setLoading(false);
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'created_at'>) => {
    try {
      const response = await expensesAPI.create(expenseData);
      await fetchExpenses(); // Refresh the list
      return { data: response.data.expense, error: null };
    } catch (err: any) {
      return { 
        data: null, 
        error: err.response?.data?.error || 'Erreur lors de l\'ajout de la dépense' 
      };
    }
  };

  const markExpenseAsSettled = async (expenseId: string) => {
    try {
      await expensesAPI.update(expenseId, { is_settled: true });
      setExpenses(prev =>
        prev.map(expense =>
          expense.id === expenseId
            ? { ...expense, is_settled: true }
            : expense
        )
      );
      return { error: null };
    } catch (err: any) {
      return { 
        error: err.response?.data?.error || 'Erreur lors du règlement de la dépense' 
      };
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      await expensesAPI.delete(expenseId);
      setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
      return { error: null };
    } catch (err: any) {
      return { 
        error: err.response?.data?.error || 'Erreur lors de la suppression de la dépense' 
      };
    }
  };

  const calculateBalances = async (): Promise<Balance[]> => {
    if (!groupId) return [];
    
    try {
      const response = await expensesAPI.getBalances(groupId);
      console.log('Balances response:', response.data);
      return response.data.balances || [];
    } catch (err) {
      console.error('Error calculating balances:', err);
      return [];
    }
  };

  const calculateSettlements = (balances?: Balance[]): Settlement[] => {
    if (!balances || !Array.isArray(balances)) {
      return [];
    }
    
    const debtors = balances.filter(b => b.amount < 0).sort((a, b) => a.amount - b.amount);
    const creditors = balances.filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);
    
    const settlements: Settlement[] = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debt = Math.abs(debtors[i].amount);
      const credit = creditors[j].amount;
      const settlement = Math.min(debt, credit);

      if (settlement > 0.01) {
        settlements.push({
          from_user: debtors[i].user_id,
          to_user: creditors[j].user_id,
          amount: Math.round(settlement * 100) / 100,
        });
      }

      debtors[i].amount += settlement;
      creditors[j].amount -= settlement;

      if (Math.abs(debtors[i].amount) < 0.01) i++;
      if (Math.abs(creditors[j].amount) < 0.01) j++;
    }

    return settlements;
  };

  return {
    expenses,
    loading,
    error,
    addExpense,
    markExpenseAsSettled,
    deleteExpense,
    calculateBalances,
    calculateSettlements,
    refetch: fetchExpenses,
  };
}