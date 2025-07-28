import React from 'react';
import { Expense } from '../../types';
import { Calendar, User, Check, Clock, MoreVertical } from 'lucide-react';

interface ExpenseCardProps {
  expense: Expense;
  currency: string;
  onMarkAsSettled: (expenseId: string) => void;
}

const categoryColors = {
  'Restaurant': 'bg-orange-100 text-orange-800',
  'Transport': 'bg-blue-100 text-blue-800',
  'Hébergement': 'bg-purple-100 text-purple-800',
  'Shopping': 'bg-pink-100 text-pink-800',
  'Divertissement': 'bg-green-100 text-green-800',
  'Autre': 'bg-gray-100 text-gray-800',
};

export function ExpenseCard({ expense, currency, onMarkAsSettled }: ExpenseCardProps) {
  console.log('ExpenseCard - expense:', expense);
  console.log('ExpenseCard - participants:', expense.participants);

  const handleMarkAsSettled = () => {
    if (window.confirm('Marquer cette dépense comme réglée ?')) {
      onMarkAsSettled(expense.id);
    }
  };

  const getUserName = (userId: string) => {
    // Chercher d'abord dans les participants
    const participant = expense.participants?.find(p => p.user_id === userId);
    if (participant?.user?.full_name) {
      return participant.user.full_name;
    }
    
    // Fallback avec des noms par défaut
    const userNames: { [key: string]: string } = {
      '1': 'John Doe',
      '2': 'Marie Martin', 
      '3': 'Thomas Dubois'
    };
    
    return userNames[userId] || `Utilisateur ${userId}`;
  };

  const getUserInitials = (userId: string) => {
    const name = getUserName(userId);
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };
  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
      expense.is_settled ? 'border-green-200 bg-green-50' : 'border-gray-200'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{expense.description}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                categoryColors[expense.category as keyof typeof categoryColors] || categoryColors['Autre']
              }`}>
                {expense.category}
              </span>
              {expense.is_settled && (
                <span className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  <Check className="h-3 w-3" />
                  <span>Réglé</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(expense.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>Payé par {getUserName(expense.paid_by)}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {currency} {Number(expense.amount).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">
              {expense.split_type === 'equal' ? 'Partage égal' : 'Partage personnalisé'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Participants :</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {expense.participants?.map((participant) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  participant.is_paid ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {getUserInitials(participant.user_id)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {getUserName(participant.user_id)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {currency} {Number(participant.amount_owed).toFixed(2)}
                  </span>
                  {participant.is_paid ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            )) || []}
          </div>
        </div>

        {!expense.is_settled && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleMarkAsSettled}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
            >
              Marquer comme réglé
            </button>
          </div>
        )}
      </div>
    </div>
  );
}