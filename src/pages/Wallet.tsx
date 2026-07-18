import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus, DollarSign, AlertCircle } from 'lucide-react';

interface Transaction {
  id: number;
  amount: string;
  transaction_type: 'recharge' | 'ride_payment' | 'ride_earning' | 'refund';
  reference_id: string;
  created_at: string;
}

export const Wallet: React.FC = () => {
  const [balance, setBalance] = useState('0.00');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadWalletData = async () => {
    try {
      const res = await api.get('/wallet/');
      setBalance(res.data.balance);
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch wallet information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setActionLoading(true);

    if (!rechargeAmount || isNaN(Number(rechargeAmount)) || Number(rechargeAmount) <= 0) {
      setError("Please enter a valid positive amount.");
      setActionLoading(false);
      return;
    }

    try {
      const res = await api.post('/wallet/recharge/', { amount: Number(rechargeAmount) });
      setBalance(res.data.balance);
      setSuccess(`Successfully charged card and added $${Number(rechargeAmount).toFixed(2)} to wallet.`);
      setRechargeAmount('');
      loadWalletData();
    } catch (err) {
      console.error(err);
      setError("Recharge payment failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Wallet & Payments</h2>
        <p className="text-muted-foreground text-sm">Add funds, verify orders, and review detailed transaction receipts.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* BALANCE AND RECHARGE */}
          <div className="space-y-6 lg:col-span-1">
            {/* Balance Card */}
            <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-lg shadow-primary/25 relative overflow-hidden">
              {/* Decorative circle */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
              
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <span className="text-xs text-primary-foreground/75 font-semibold uppercase tracking-wider">Current Balance</span>
                  <h3 className="text-3xl font-extrabold tracking-tight">${parseFloat(balance).toFixed(2)}</h3>
                </div>
                <div className="p-2.5 bg-white/15 rounded-xl">
                  <WalletIcon size={22} />
                </div>
              </div>
              <p className="text-[10px] text-primary-foreground/60 mt-8">
                Work Carpooling Personal Commute Account
              </p>
            </div>

            {/* Recharge Card */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm">Recharge Wallet</h3>
              
              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-3 font-semibold text-center">
                  {success}
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3 flex items-start space-x-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRecharge} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                      <DollarSign size={16} />
                    </span>
                    <input
                      type="number"
                      required
                      min="10"
                      step="5"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-sm transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[20, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt.toString())}
                      className="py-1.5 border border-border hover:border-primary rounded-lg text-xs font-semibold hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                    >
                      +${amt}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl text-xs transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center space-x-1"
                >
                  {actionLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></span>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Recharge via Razorpay Test Gateway</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* TRANSACTION LOGS */}
          <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2 space-y-4">
            <h3 className="font-bold text-sm">Payment Transactions History</h3>
            
            <div className="overflow-x-auto">
              {transactions.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8 italic">No payments logged yet.</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider pb-2">
                      <th className="py-2.5">Date</th>
                      <th>Type</th>
                      <th>Reference ID</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const isCredit = parseFloat(tx.amount) > 0;
                      return (
                        <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="py-3 text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                          <td className="font-semibold capitalize">
                            <span className="flex items-center space-x-1">
                              {isCredit ? (
                                <ArrowDownLeft size={12} className="text-emerald-500" />
                              ) : (
                                <ArrowUpRight size={12} className="text-indigo-500" />
                              )}
                              <span>{tx.transaction_type.replace('_', ' ')}</span>
                            </span>
                          </td>
                          <td className="text-muted-foreground font-mono">{tx.reference_id}</td>
                          <td className={`text-right font-bold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            {isCredit ? '+' : ''}${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
