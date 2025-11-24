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
          <Card data-testid="card-total-earnings">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600" data-testid="total-earnings-value">
                ${parseFloat(stats.totalEarnings).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-transactions">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="transaction-count">{stats.transactionCount}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-attainment">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Quota Attainment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600" data-testid="attainment-value">{stats.attainment}%</div>
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
                <CardTitle>Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {earnings && earnings.calculations && earnings.calculations.length > 0 ? (
                  <div className="space-y-3">
                    {earnings.calculations.slice(0, 10).map((calc, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded" data-testid={`earning-item-${idx}`}>
                        <div>
                          <p className="font-medium">Transaction: {calc.transaction_id.substring(0, 8)}</p>
                          <p className="text-sm text-slate-600">Base: ${parseFloat(calc.base_amount).toFixed(2)}</p>
                        </div>
                        <Badge variant="secondary" data-testid={`earning-amount-${idx}`}>
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
                      <div key={txn.id} className="flex justify-between items-center p-3 bg-slate-50 rounded" data-testid={`transaction-item-${idx}`}>
                        <div>
                          <p className="font-medium">{txn.sku}</p>
                          <p className="text-sm text-slate-600">Qty: {txn.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${parseFloat(txn.total_amount).toFixed(2)}</p>
                          <Badge variant={txn.status === 'processed' ? 'default' : 'secondary'}>
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
