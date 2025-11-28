import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DollarSign, TrendingUp, CheckCircle, Clock, XCircle, Award, ShoppingCart, Calendar } from 'lucide-react';

function SalesManagement() {
  const { user, token } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    partner_id: '',
    product_id: '',
    quantity: '',
    unit_price: '',
    sale_date: new Date().toISOString().split('T')[0],
    customer_reference: '',
    notes: ''
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
  const isPartner = user?.role === 'partner';
  const canApprove = ['admin', 'finance'].includes(user?.role);

  useEffect(() => {
    fetchSales();
    fetchProducts();
    fetchAnalytics();
    if (!isPartner) {
      fetchPartners();
    }
  }, []);

  const fetchSales = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSales(data);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.filter(p => p.active !== false));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/directory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPartners(data.filter(p => p.status === 'approved'));
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          sale_date: new Date(formData.sale_date).toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Sale created! Commission: $${result.commission_breakdown.total_commission}`);
        await fetchSales();
        await fetchAnalytics();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to create sale');
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Error creating sale');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (saleId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sales/${saleId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Commission approved!');
        await fetchSales();
        await fetchAnalytics();
      } else {
        alert('Failed to approve commission');
      }
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleReject = async (saleId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/sales/${saleId}/reject?reason=${encodeURIComponent(reason)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Commission rejected');
        await fetchSales();
        await fetchAnalytics();
      } else {
        alert('Failed to reject commission');
      }
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  const handleBulkApprove = async () => {
    const pendingSales = sales.filter(s => s.commission_status === 'pending');
    if (pendingSales.length === 0) {
      alert('No pending commissions to approve');
      return;
    }

    if (!window.confirm(`Approve ${pendingSales.length} pending commissions?`)) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/sales/bulk-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(pendingSales.map(s => s.id))
      });

      if (response.ok) {
        alert('Commissions approved!');
        await fetchSales();
        await fetchAnalytics();
      }
    } catch (error) {
      console.error('Error bulk approving:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      partner_id: '',
      product_id: '',
      quantity: '',
      unit_price: '',
      sale_date: new Date().toISOString().split('T')[0],
      customer_reference: '',
      notes: ''
    });
    setShowForm(false);
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-600', icon: Clock },
      approved: { color: 'bg-green-600', icon: CheckCircle },
      rejected: { color: 'bg-red-600', icon: XCircle },
      paid: { color: 'bg-blue-600', icon: DollarSign }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const pendingSales = sales.filter(s => s.commission_status === 'pending');
  const approvedSales = sales.filter(s => s.commission_status === 'approved');
  const paidSales = sales.filter(s => s.commission_status === 'paid');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <ShoppingCart className="h-10 w-10" />
            Sales & Commission Management
          </h1>
          <p className="text-slate-300">
            {isPartner ? 'Track your sales and commissions' : 'Manage partner sales and approve commissions'}
          </p>
        </div>

        {/* Stats Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Sales</p>
                    <p className="text-3xl font-bold text-white mt-2">{analytics.total_sales}</p>
                  </div>
                  <ShoppingCart className="h-12 w-12 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-white mt-2">${parseFloat(analytics.total_sales_amount).toFixed(0)}</p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Total Commissions</p>
                    <p className="text-3xl font-bold text-white mt-2">${parseFloat(analytics.total_commissions).toFixed(0)}</p>
                  </div>
                  <Award className="h-12 w-12 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm">Pending Approval</p>
                    <p className="text-3xl font-bold text-white mt-2">${parseFloat(analytics.pending_commissions).toFixed(0)}</p>
                  </div>
                  <Clock className="h-12 w-12 text-yellow-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-sm">Paid Out</p>
                    <p className="text-3xl font-bold text-white mt-2">${parseFloat(analytics.paid_commissions).toFixed(0)}</p>
                  </div>
                  <DollarSign className="h-12 w-12 text-cyan-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ Record New Sale'}
          </Button>
          {canApprove && pendingSales.length > 0 && (
            <Button
              onClick={handleBulkApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve All Pending ({pendingSales.length})
            </Button>
          )}
        </div>

        {/* Sale Entry Form */}
        {showForm && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Record New Sale</CardTitle>
              <CardDescription className="text-slate-300">
                Commission will be auto-calculated based on partner tier and active campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!isPartner && (
                    <div>
                      <Label className="text-white">Partner *</Label>
                      <Select
                        value={formData.partner_id}
                        onValueChange={(value) => setFormData({ ...formData, partner_id: value })}
                        required
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select partner" />
                        </SelectTrigger>
                        <SelectContent>
                          {partners.map(partner => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.company_name} ({partner.tier})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label className="text-white">Product *</Label>
                    <Select
                      value={formData.product_id}
                      onValueChange={(value) => {
                        const product = products.find(p => p.id === value);
                        setFormData({ 
                          ...formData, 
                          product_id: value,
                          unit_price: product?.base_price || ''
                        });
                      }}
                      required
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${product.base_price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Quantity *</Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                      min="1"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Unit Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">Sale Date *</Label>
                    <Input
                      type="date"
                      value={formData.sale_date}
                      onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">Customer Reference</Label>
                    <Input
                      value={formData.customer_reference}
                      onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-white">Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      rows={2}
                      placeholder="Additional details..."
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Creating Sale...' : 'Record Sale & Calculate Commission'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Sales Table */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">
              All Sales ({sales.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-600">
              Pending ({pendingSales.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-green-600">
              Approved ({approvedSales.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="data-[state=active]:bg-cyan-600">
              Paid ({paidSales.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <SalesTable 
              sales={sales} 
              products={products}
              partners={partners}
              canApprove={canApprove}
              onApprove={handleApprove}
              onReject={handleReject}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <SalesTable 
              sales={pendingSales} 
              products={products}
              partners={partners}
              canApprove={canApprove}
              onApprove={handleApprove}
              onReject={handleReject}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <SalesTable 
              sales={approvedSales} 
              products={products}
              partners={partners}
              canApprove={canApprove}
              onApprove={handleApprove}
              onReject={handleReject}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>

          <TabsContent value="paid" className="mt-6">
            <SalesTable 
              sales={paidSales} 
              products={products}
              partners={partners}
              canApprove={canApprove}
              onApprove={handleApprove}
              onReject={handleReject}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SalesTable({ sales, products, partners, canApprove, onApprove, onReject, getStatusBadge }) {
  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardContent className="p-6">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-white">Date</TableHead>
              <TableHead className="text-white">Partner</TableHead>
              <TableHead className="text-white">Product</TableHead>
              <TableHead className="text-white">Qty</TableHead>
              <TableHead className="text-white">Amount</TableHead>
              <TableHead className="text-white">Commission</TableHead>
              <TableHead className="text-white">Spiff</TableHead>
              <TableHead className="text-white">Total Earned</TableHead>
              <TableHead className="text-white">Status</TableHead>
              {canApprove && <TableHead className="text-white">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map(sale => {
              const product = products.find(p => p.id === sale.product_id);
              const partner = partners.find(p => p.id === sale.partner_id);
              return (
                <TableRow key={sale.id} className="border-white/10">
                  <TableCell className="text-slate-300">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-white">
                    {partner?.company_name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-slate-300">{product?.name || 'N/A'}</TableCell>
                  <TableCell className="text-slate-300">{sale.quantity}</TableCell>
                  <TableCell className="text-white">${parseFloat(sale.total_amount).toFixed(2)}</TableCell>
                  <TableCell className="text-green-300">${parseFloat(sale.commission_amount).toFixed(2)}</TableCell>
                  <TableCell className="text-purple-300">${parseFloat(sale.spiff_bonus).toFixed(2)}</TableCell>
                  <TableCell className="text-white font-semibold">${parseFloat(sale.total_commission).toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(sale.commission_status)}</TableCell>
                  {canApprove && (
                    <TableCell>
                      {sale.commission_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => onApprove(sale.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => onReject(sale.id)}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default SalesManagement;
