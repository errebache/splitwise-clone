import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentsAPI } from '../../lib/api';
import { CreditCard, DollarSign, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { RefundModal } from './RefundModal';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: 'paypal' | 'card';
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
}

interface Refund {
  id: string;
  amount: number;
  currency: string;
  status: 'requested' | 'approved' | 'completed' | 'rejected';
  date: string;
  reason: string;
  description: string;
}

export function PaymentsView() {
  const { t } = useTranslation();
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments' | 'refunds'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, refundsRes] = await Promise.all([
        paymentsAPI.getAll(),
        paymentsAPI.getRefunds()
      ]);
      
      setPayments(paymentsRes.data.payments || []);
      setRefunds(refundsRes.data.refunds || []);
    } catch (error) {
      console.error('Error fetching payments data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'requested':
        return <RefreshCw className="h-5 w-5 text-orange-500" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('payments.refundCompleted');
      case 'pending':
        return 'En attente';
      case 'approved':
        return t('payments.refundApproved');
      case 'requested':
        return t('payments.refundRequested');
      case 'failed':
        return 'Échoué';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const handleRefundSubmit = async (refundData: any) => {
    try {
      await paymentsAPI.createRefund(refundData);
      await fetchData(); // Refresh data
      setShowRefundModal(false);
      return { error: null };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'Erreur lors de la demande de remboursement' };
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
          <h1 className="text-2xl font-bold text-gray-900">{t('payments.title')}</h1>
          <p className="text-gray-600">{t('payments.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowRefundModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{t('payments.requestRefund')}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('payments.paymentHistory')}
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'refunds'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('payments.refundHistory')}
          </button>
        </nav>
      </div>

      {/* Payment History */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('payments.paymentHistory')}</h3>
            <div className="space-y-4">
              {payments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun paiement trouvé</p>
              ) : (
                payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      {payment.method === 'paypal' ? (
                        <DollarSign className="h-5 w-5 text-white" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{payment.description}</h4>
                      <p className="text-sm text-gray-500">
                        {payment.method === 'paypal' ? t('payments.payWithPaypal') : t('payments.payWithCard')} • {new Date(payment.created_at || payment.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {payment.currency} {Number(payment.amount.toFixed(2))}
                      </p>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(payment.status)}
                        <span className="text-sm text-gray-500">{getStatusText(payment.status)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund History */}
      {activeTab === 'refunds' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('payments.refundHistory')}</h3>
            <div className="space-y-4">
              {refunds.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun remboursement trouvé</p>
              ) : (
                refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{refund.description}</h4>
                      <p className="text-sm text-gray-500">
                        {refund.reason} • {new Date(refund.created_at || refund.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {refund.currency} {Number(refund.amount.toFixed(2))}
                      </p>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(refund.status)}
                        <span className="text-sm text-gray-500">{getStatusText(refund.status)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </div>
      )}

      {showRefundModal && (
        <RefundModal
          onClose={() => setShowRefundModal(false)}
          onSubmit={handleRefundSubmit}
        />
      )}
    </div>
  );
}