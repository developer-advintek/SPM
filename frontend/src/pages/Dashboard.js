import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { getMyEarnings, getTransactions } from '../utils/api';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

export const Dashboard = () => {
  const { user } = useAuth();
  const { messages } = useWebSocket();
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalEarnings: '0', transactionCount: 0, attainment: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Listen for real-time updates
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.type === 'commission_calculated') {
        toast.success(`New commission calculated: $${latestMessage.amount}`);
        fetchData();
      }
    }
  }, [messages]);

  const fetchData = async () => {
    try {
      const earningsData = await getMyEarnings();
      setEarnings(earningsData);
      setStats((prev) => ({ ...prev, totalEarnings: earningsData.total_earnings }));

      const txnData = await getTransactions();
      setTransactions(txnData);
      setStats((prev) => ({ ...prev, transactionCount: txnData.length }));
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  return (
    <div className="min-h-screen p-6 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="dashboard-title">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-slate-300 text-lg" data-testid="user-role">Role: <span className="font-semibold text-purple-400">{user?.role}</span></p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="card-total-earnings" className="group hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Earnings</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/50 group-hover:shadow-green-500/70 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-400 mb-2" data-testid="total-earnings-value">
                ${parseFloat(stats.totalEarnings).toFixed(2)}
              </div>
              <p className="text-xs text-slate-400">↑ 12.5% from last month</p>
            </CardContent>
          </Card>

          <Card data-testid="card-transactions" className="group hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Transactions</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/50 group-hover:shadow-blue-500/70 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-400 mb-2" data-testid="transaction-count">{stats.transactionCount}</div>
              <p className="text-xs text-slate-400">Active this period</p>
            </CardContent>
          </Card>

          <Card data-testid="card-attainment" className="group hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Quota Attainment</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50 group-hover:shadow-purple-500/70 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-400 mb-2" data-testid="attainment-value">{stats.attainment}%</div>
              <p className="text-xs text-slate-400">Target: 100%</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="earnings" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="earnings" data-testid="tab-earnings">My Earnings</TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="earnings">
            <Card data-testid="earnings-content">
              <CardHeader>
                <CardTitle className="text-white text-xl font-bold">Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {earnings && earnings.calculations && earnings.calculations.length > 0 ? (
                  <div className="space-y-3">
                    {earnings.calculations.slice(0, 10).map((calc, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-700/30 border border-slate-600/30 rounded-lg" data-testid={`earning-item-${idx}`}>
                        <div>
                          <p className="font-medium text-slate-100">Transaction: {calc.transaction_id.substring(0, 8)}</p>
                          <p className="text-sm text-slate-300">Base: ${parseFloat(calc.base_amount).toFixed(2)}</p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/40" data-testid={`earning-amount-${idx}`}>
                          ${parseFloat(calc.final_amount).toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600" data-testid="no-earnings">No earnings data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card data-testid="transactions-content">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.slice(0, 10).map((txn, idx) => (
                      <div key={txn.id} className="flex justify-between items-center p-3 bg-slate-700/30 border border-slate-600/30 rounded-lg" data-testid={`transaction-item-${idx}`}>
                        <div>
                          <p className="font-medium text-slate-100">{txn.sku}</p>
                          <p className="text-sm text-slate-300">Qty: {txn.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-300">${parseFloat(txn.total_amount).toFixed(2)}</p>
                          <Badge className={txn.status === 'processed' ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'}>
                            {txn.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600" data-testid="no-transactions">No transactions available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card data-testid="performance-content">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Monthly Target</span>
                    <span className="font-bold">$50,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Current</span>
                    <span className="font-bold">${parseFloat(stats.totalEarnings).toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all"
                      style={{ width: `${Math.min((parseFloat(stats.totalEarnings) / 50000) * 100, 100)}%` }}
                      data-testid="performance-progress-bar"
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
