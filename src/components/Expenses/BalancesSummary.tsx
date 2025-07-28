import React from 'react';
import { Balance, Settlement } from '../../types';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface BalancesSummaryProps {
  balances: Balance[];
  settlements: Settlement[];
  currency: string;
}

export function BalancesSummary({ balances, settlements, currency }: BalancesSummaryProps) {
  const positiveBalances = balances?.filter(b => b.amount > 0) || [];
  const negativeBalances = balances?.filter(b => b.amount < 0) || [];

  const getUserName = (userId: string) => {
    const balance = balances?.find(b => b.user_id === userId);
    return balance?.user?.full_name || balance?.full_name || 'Utilisateur';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <span>Soldes des membres</span>
        </h3>
        
        <div className="space-y-3">
          {!balances || balances.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune dépense en cours</p>
          ) : (
            balances.map((balance) => (
              <div
                key={balance.user_id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  balance.amount > 0 
                    ? 'bg-green-50 border border-green-200'
                    : balance.amount < 0
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {getUserName(balance.user_id).charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {getUserName(balance.user_id)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold ${
                    balance.amount > 0 
                      ? 'text-green-600'
                      : balance.amount < 0
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {balance.amount > 0 ? '+' : ''}{currency} {Math.abs(Number(balance.amount)).toFixed(2)}
                  </span>
                  {balance.amount > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : balance.amount < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {positiveBalances.length > 0 && negativeBalances.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="text-green-600 font-medium">{positiveBalances.length}</span> membre(s) en crédit,{' '}
              <span className="text-red-600 font-medium">{negativeBalances.length}</span> membre(s) en dette
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <ArrowRight className="h-5 w-5 text-blue-600" />
          <span>Remboursements suggérés</span>
        </h3>
        
        <div className="space-y-3">
          {!settlements || settlements.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Tout est équilibré !</p>
          ) : (
            settlements.map((settlement, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {getUserName(settlement.from_user).charAt(0)}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {getUserName(settlement.to_user).charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getUserName(settlement.from_user)} → {getUserName(settlement.to_user)}
                    </p>
                    <p className="text-xs text-gray-500">Remboursement suggéré</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-blue-600">
                    {currency} {Number(settlement.amount).toFixed(2)}
                  </p>
                  <button className="text-xs text-blue-600 hover:text-blue-700 underline">
                    Marquer comme payé
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {settlements && settlements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {settlements.length} remboursement(s) pour équilibrer les comptes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}