import React, { useState, useEffect } from 'react';
import { 
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, 
  Clock, CheckCircle, ShieldAlert, AlertCircle, Info, Sparkles 
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Wallet: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Top-up amount state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const fetchWalletDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('wallet/');
      setWallet(response.data);
    } catch (err) {
      console.error(err);
      setError('Unable to load wallet records.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (amount: number) => {
    setError('');
    setSuccess('');
    setDepositLoading(true);

    try {
      const response = await api.post('wallet/deposit/', {
        amount: amount.toString()
      });
      setWallet(response.data);
      setSuccess(`Simulated deposit of ₹${amount.toFixed(2)} completed successfully!`);
      setDepositAmount('');
      refreshProfile(); // Sync global header balance
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Simulated deposit failed.');
    } finally {
      setDepositLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    if (type === 'Credit') {
      return (
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
          <ArrowDownLeft className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center flex-shrink-0">
        <ArrowUpRight className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Corporate Wallet</h1>
        <p className="text-xs text-gray-400 mt-1">
          Manage your virtual commuting balance and track credit transactions.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-emerald-700 text-xs">
          <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Wallet Balance Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        
        {/* Balance Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-3xl p-6 shadow-lg shadow-emerald-600/10 flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Available Commute Balance</span>
              <h2 className="text-3xl font-extrabold mt-1">
                ₹{loading ? '...' : parseFloat(wallet?.balance?.toString() || '0').toFixed(2)}
              </h2>
            </div>
            <WalletIcon className="w-8 h-8 text-emerald-200/50" />
          </div>

          <div className="flex items-center gap-2 text-[10px] text-emerald-100 bg-emerald-800/40 p-2 rounded-xl mt-4 self-start">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Includes simulated carbon bonus credits rewarded on completed rides.</span>
          </div>
        </div>

        {/* Top-up Form Panel */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-800 mb-3">Add Simulated Funds</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button 
                onClick={() => handleDeposit(100)}
                disabled={depositLoading}
                className="py-2 text-[10px] font-semibold border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/20 text-gray-600 rounded-lg cursor-pointer transition-colors"
              >
                + ₹100
              </button>
              <button 
                onClick={() => handleDeposit(500)}
                disabled={depositLoading}
                className="py-2 text-[10px] font-semibold border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/20 text-gray-600 rounded-lg cursor-pointer transition-colors"
              >
                + ₹500
              </button>
              <button 
                onClick={() => handleDeposit(1000)}
                disabled={depositLoading}
                className="py-2 text-[10px] font-semibold border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/20 text-gray-600 rounded-lg cursor-pointer transition-colors"
              >
                + ₹1000
              </button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                placeholder="Custom Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="premium-input h-9 text-xs rounded-xl flex-1"
              />
              <button
                disabled={depositLoading || !depositAmount}
                onClick={() => handleDeposit(parseFloat(depositAmount))}
                className="premium-btn-primary h-9 text-xs font-semibold px-4 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History log */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>Commute Transaction History</span>
        </h3>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map(i => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 h-4 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : !wallet || !wallet.transactions || wallet.transactions.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-8">
            No transaction records found. Try adding simulated funds.
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {wallet.transactions.map((t: any) => (
              <div key={t.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  {getTransactionIcon(t.transaction_type)}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{t.reference}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      {new Date(t.created_at).toLocaleString([], {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-bold ${
                    t.transaction_type === 'Credit' ? 'text-emerald-600' : 'text-gray-800'
                  }`}>
                    {t.transaction_type === 'Credit' ? '+' : '-'} ₹{parseFloat(t.amount).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Check Icon
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
