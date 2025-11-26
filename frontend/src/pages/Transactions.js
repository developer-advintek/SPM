import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import axios from 'axios';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, Users, AlertCircle, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [creditSplits, setCreditSplits] = useState([]);
  
  const [newTransaction, setNewTransaction] = useState({
    product_id: '',
    sku: '',
    quantity: 1,
    unit_price: 0,
    sales_rep_id: '',
    customer_id: '',
    customer_segment: 'enterprise',
    sales_channel: 'direct',
    territory_id: 'T1',
    transaction_date: new Date().toISOString()
  });

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
    fetchUsers();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(response.data.filter(u => u.role === 'rep'));
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/transactions`, newTransaction, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Transaction created and processed in real-time!');
      fetchTransactions();
      setNewTransaction({
        product_id: '',
        sku: '',
        quantity: 1,
        unit_price: 0,
        sales_rep_id: '',
        customer_id: '',
        customer_segment: 'enterprise',
        sales_channel: 'direct',
        territory_id: 'T1',
        transaction_date: new Date().toISOString()
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCreditSplit = async () => {
    if (!selectedTransaction) return;
    
    const totalCredit = creditSplits.reduce((sum, split) => sum + parseFloat(split.credit_percent || 0), 0);
    if (Math.abs(totalCredit - 100) > 0.01) {
      toast.error('Credit splits must total 100%');
      return;
    }
    
    try {
      await axios.post(
        `${API}/transactions/${selectedTransaction.id}/credit-split`,
        {
          transaction_id: selectedTransaction.id,
          assignments: creditSplits,
          assignment_reason: 'Multi-factor credit distribution'
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      toast.success('Credit split applied successfully!');
      setSelectedTransaction(null);
      setCreditSplits([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to apply credit split');
    }
  };

  const addCreditSplit = () => {
    setCreditSplits([...creditSplits, { user_id: '', credit_percent: 0, role: 'primary' }]);
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setNewTransaction({
        ...newTransaction,
        product_id: productId,
        sku: product.sku,
        unit_price: parseFloat(product.base_commission_rate) * 100 // Example pricing
      });
    }
  };

  // Calculate stats
  const stats = {
    total: transactions.length,
    processed: transactions.filter(t => t.status === 'processed').length,
    pending: transactions.filter(t => t.status === 'pending').length,
    totalRevenue: transactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0)
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
          Real-Time Transaction Processing
        </h1>
        <p className="text-slate-400">Process transactions with instant commission calculation and credit splits</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Transactions</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <DollarSign className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Processed</p>
                <p className="text-2xl font-bold text-green-400">{stats.processed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-400">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="bg-slate-800/50 border-slate-700/50">
          <TabsTrigger value="create" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            Create Transaction
          </TabsTrigger>
          <TabsTrigger value="list" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            Transaction List
          </TabsTrigger>
          <TabsTrigger value="splits" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white">
            Credit Splits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">New Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-200">Product</Label>
                    <select
                      className="w-full p-3 rounded-lg bg-slate-700/30 border border-slate-600/30 text-white"
                      value={newTransaction.product_id}
                      onChange={(e) => handleProductChange(e.target.value)}
                      required
                    >
                      <option value="">Select Product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-slate-200">Sales Rep</Label>
                    <select
                      className="w-full p-3 rounded-lg bg-slate-700/30 border border-slate-600/30 text-white"
                      value={newTransaction.sales_rep_id}
                      onChange={(e) => setNewTransaction({ ...newTransaction, sales_rep_id: e.target.value })}
                      required
                    >
                      <option value="">Select Sales Rep</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-slate-200">Quantity</Label>
                    <Input
                      type="number"
                      className="bg-slate-700/30 border-slate-600/30 text-white"
                      value={newTransaction.quantity}
                      onChange={(e) => setNewTransaction({ ...newTransaction, quantity: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-slate-200">Unit Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="bg-slate-700/30 border-slate-600/30 text-white"
                      value={newTransaction.unit_price}
                      onChange={(e) => setNewTransaction({ ...newTransaction, unit_price: parseFloat(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-slate-200">Customer ID</Label>
                    <Input
                      className="bg-slate-700/30 border-slate-600/30 text-white"
                      value={newTransaction.customer_id}
                      onChange={(e) => setNewTransaction({ ...newTransaction, customer_id: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-slate-200">Customer Segment</Label>
                    <select
                      className="w-full p-3 rounded-lg bg-slate-700/30 border border-slate-600/30 text-white"
                      value={newTransaction.customer_segment}
                      onChange={(e) => setNewTransaction({ ...newTransaction, customer_segment: e.target.value })}
                    >
                      <option value="enterprise">Enterprise</option>
                      <option value="smb">SMB</option>
                      <option value="individual">Individual</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-slate-200">Sales Channel</Label>
                    <select
                      className="w-full p-3 rounded-lg bg-slate-700/30 border border-slate-600/30 text-white"
                      value={newTransaction.sales_channel}
                      onChange={(e) => setNewTransaction({ ...newTransaction, sales_channel: e.target.value })}
                    >
                      <option value="direct">Direct</option>
                      <option value="partner">Partner</option>
                      <option value="online">Online</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-slate-200">Territory ID</Label>
                    <Input
                      className="bg-slate-700/30 border-slate-600/30 text-white"
                      value={newTransaction.territory_id}
                      onChange={(e) => setNewTransaction({ ...newTransaction, territory_id: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="bg-slate-700/20 p-4 rounded-lg">
                  <p className="text-slate-300 text-sm mb-2">Transaction Preview:</p>
                  <p className="text-white text-lg">
                    Total Amount: <span className="font-bold text-cyan-400">
                      ${(newTransaction.quantity * newTransaction.unit_price).toFixed(2)}
                    </span>
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  {loading ? 'Processing...' : 'Create & Process Transaction'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">All Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.map(transaction => (
                  <div
                    key={transaction.id}
                    className="p-4 bg-slate-700/20 rounded-lg border border-slate-600/30 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Transaction #{transaction.id.slice(0, 8)}</p>
                        <p className="text-slate-400 text-sm">SKU: {transaction.sku} | Qty: {transaction.quantity}</p>
                        <p className="text-slate-400 text-sm">Rep: {transaction.sales_rep_id.slice(0, 8)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-cyan-400 font-bold text-lg">${parseFloat(transaction.total_amount).toFixed(2)}</p>
                        <Badge className={transaction.status === 'processed' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {transaction.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-xs border-slate-600 text-slate-300"
                          onClick={() => setSelectedTransaction(transaction)}
                        >
                          Apply Credit Split
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-slate-400 text-center py-8">No transactions yet. Create your first transaction!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="splits">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">Multi-Factor Credit Splits</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTransaction ? (
                <div className="space-y-4">
                  <div className="bg-slate-700/20 p-4 rounded-lg">
                    <p className="text-slate-300">Selected Transaction:</p>
                    <p className="text-white font-bold">#{selectedTransaction.id.slice(0, 8)} - ${parseFloat(selectedTransaction.total_amount).toFixed(2)}</p>
                  </div>

                  {creditSplits.map((split, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 p-4 bg-slate-700/20 rounded-lg">
                      <div>
                        <Label className="text-slate-200">User</Label>
                        <select
                          className="w-full p-2 rounded bg-slate-700/30 border border-slate-600/30 text-white"
                          value={split.user_id}
                          onChange={(e) => {
                            const newSplits = [...creditSplits];
                            newSplits[index].user_id = e.target.value;
                            setCreditSplits(newSplits);
                          }}
                        >
                          <option value="">Select User</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>{user.full_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-slate-200">Credit %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          className="bg-slate-700/30 border-slate-600/30 text-white"
                          value={split.credit_percent}
                          onChange={(e) => {
                            const newSplits = [...creditSplits];
                            newSplits[index].credit_percent = parseFloat(e.target.value);
                            setCreditSplits(newSplits);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-slate-200">Role</Label>
                        <select
                          className="w-full p-2 rounded bg-slate-700/30 border border-slate-600/30 text-white"
                          value={split.role}
                          onChange={(e) => {
                            const newSplits = [...creditSplits];
                            newSplits[index].role = e.target.value;
                            setCreditSplits(newSplits);
                          }}
                        >
                          <option value="primary">Primary</option>
                          <option value="overlay">Overlay</option>
                          <option value="support">Support</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Button onClick={addCreditSplit} variant="outline" className="border-slate-600 text-slate-300">
                      Add Split
                    </Button>
                    <Button
                      onClick={handleApplyCreditSplit}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500"
                    >
                      Apply Credit Split
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedTransaction(null);
                        setCreditSplits([]);
                      }}
                      variant="outline"
                      className="border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="bg-slate-700/20 p-4 rounded-lg">
                    <p className="text-slate-300">Total Credit: <span className={`font-bold ${Math.abs(creditSplits.reduce((sum, s) => sum + (parseFloat(s.credit_percent) || 0), 0) - 100) < 0.01 ? 'text-green-400' : 'text-red-400'}`}>
                      {creditSplits.reduce((sum, s) => sum + (parseFloat(s.credit_percent) || 0), 0).toFixed(2)}%
                    </span></p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">Select a transaction from the Transaction List tab to apply credit splits</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Transactions;
