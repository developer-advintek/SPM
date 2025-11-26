import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import axios from 'axios';
import { toast } from 'sonner';
import { DollarSign, CheckCircle, Clock, Download, Globe } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Payouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchPayouts();
    fetchUsers();
  }, []);

  const fetchPayouts = async () => {
    try {
      const response = await axios.get(`${API}/payouts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPayouts(response.data);
    } catch (error) {
      console.error('Failed to fetch payouts', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const calculatePayout = async (userId, currency) => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      await axios.post(`${API}/payouts/calculate`, {
        user_id: userId,
        payout_period_start: startOfMonth.toISOString(),
        payout_period_end: endOfMonth.toISOString(),
        currency: currency
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      toast.success('Payout calculated successfully!');
      fetchPayouts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to calculate payout');
    } finally {
      setLoading(false);
    }
  };

  const approvePayout = async (payoutId) => {
    try {
      await axios.post(`${API}/payouts/${payoutId}/approve`, {
        approver_id: 'current-user',
        comments: 'Approved'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Payout approved!');
      fetchPayouts();
    } catch (error) {
      toast.error('Failed to approve payout');
    }
  };

  const processPayout = async (payoutId) => {
    try {
      await axios.post(`${API}/payouts/${payoutId}/process`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Payout processed!');
      fetchPayouts();
    } catch (error) {
      toast.error('Failed to process payout');
    }
  };

  const exportPayout = async (payoutId) => {
    try {
      const response = await axios.get(`${API}/payouts/${payoutId}/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payout_${payoutId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Payout exported!');
    } catch (error) {
      toast.error('Failed to export payout');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      calculated: 'bg-blue-500',
      pending_approval: 'bg-yellow-500',
      approved: 'bg-green-500',
      processing: 'bg-purple-500',
      completed: 'bg-emerald-500',
      failed: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const stats = {
    total: payouts.length,
    pending: payouts.filter(p => p.status === 'pending_approval').length,
    completed: payouts.filter(p => p.status === 'completed').length,
    totalAmount: payouts.reduce((sum, p) => sum + parseFloat(p.net_payout || 0), 0)
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-2">
          Payout Management
        </h1>
        <p className="text-slate-400">Multi-currency payouts with approval workflows and reconciliation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Payouts</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Amount</p>
                <p className="text-2xl font-bold text-emerald-400">${stats.totalAmount.toFixed(2)}</p>
              </div>
              <Globe className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calculate" className="space-y-4">
        <TabsList className="bg-slate-800/50 border-slate-700/50">
          <TabsTrigger value="calculate" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
            Calculate Payout
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
            Pending Approvals
          </TabsTrigger>
          <TabsTrigger value="all" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
            All Payouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculate">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">Calculate New Payout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.filter(u => u.role === 'rep').map(user => (
                  <div key={user.id} className="p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{user.full_name}</p>
                        <p className="text-slate-400 text-sm">{user.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <select className="p-2 rounded bg-slate-700/30 border border-slate-600/30 text-white text-sm">
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="INR">INR</option>
                        </select>
                        <Button
                          size="sm"
                          disabled={loading}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500"
                          onClick={() => calculatePayout(user.id, 'USD')}
                        >
                          Calculate
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <div className="space-y-3">
            {payouts.filter(p => p.status === 'pending_approval').map(payout => (
              <Card key={payout.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-semibold">Payout #{payout.id.slice(0, 8)}</p>
                      <p className="text-slate-400 text-sm">User: {payout.user_id.slice(0, 8)}</p>
                      <p className="text-slate-400 text-sm">
                        Period: {new Date(payout.payout_period_start).toLocaleDateString()} - {new Date(payout.payout_period_end).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold text-xl">
                        {payout.currency} {parseFloat(payout.net_payout).toFixed(2)}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-emerald-500"
                          onClick={() => approvePayout(payout.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300"
                          onClick={() => exportPayout(payout.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {payouts.filter(p => p.status === 'pending_approval').length === 0 && (
              <p className="text-slate-400 text-center py-8">No pending approvals</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="space-y-3">
            {payouts.map(payout => (
              <Card key={payout.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-white font-semibold">Payout #{payout.id.slice(0, 8)}</p>
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm">User: {payout.user_id.slice(0, 8)}</p>
                      <p className="text-slate-400 text-sm">
                        Period: {new Date(payout.payout_period_start).toLocaleDateString()} - {new Date(payout.payout_period_end).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold text-xl">
                        {payout.currency} {parseFloat(payout.net_payout).toFixed(2)}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {payout.status === 'approved' && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-500 to-indigo-500"
                            onClick={() => processPayout(payout.id)}
                          >
                            Process
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300"
                          onClick={() => exportPayout(payout.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {payouts.length === 0 && (
              <p className="text-slate-400 text-center py-8">No payouts yet</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payouts;