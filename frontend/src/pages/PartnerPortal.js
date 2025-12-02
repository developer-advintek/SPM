import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Package, TrendingUp, DollarSign, Target, Award, Plus, Calendar,
  CheckCircle, Clock, Trophy, BarChart3
} from 'lucide-react';

function PartnerPortal() {
  const { user, token } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [sales, setSales] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('opportunities');

  // Sale form
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [saleForm, setSaleForm] = useState({
    product_id: '',
    quantity: 1,
    unit_price: '',
    customer_reference: '',
    notes: ''
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    if (user?.role === 'partner') {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchOpportunities(),
      fetchSales(),
      fetchMilestones(),
      fetchAnalytics()
    ]);
  };

  const fetchOpportunities = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/fulfillment/assignments/my-opportunities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/fulfillment/sales/my-sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSales(data.sales || []);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const fetchMilestones = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/fulfillment/milestones/my-progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMilestones(data.progress || []);
      }
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Get partner ID first
      const partnerResponse = await fetch(`${BACKEND_URL}/api/partners/directory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (partnerResponse.ok) {
        const partners = await partnerResponse.json();
        const myPartner = partners.find(p => p.user_id === user.id);
        
        if (myPartner) {
          const analyticsResponse = await fetch(
            `${BACKEND_URL}/api/fulfillment/analytics/partner/${myPartner.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (analyticsResponse.ok) {
            const data = await analyticsResponse.json();
            setAnalytics(data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleLogSale = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get partner ID
      const partnerResponse = await fetch(`${BACKEND_URL}/api/partners/directory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!partnerResponse.ok) {
        alert('Failed to get partner information');
        return;
      }

      const partners = await partnerResponse.json();
      const myPartner = partners.find(p => p.user_id === user.id);
      
      if (!myPartner) {
        alert('Partner profile not found');
        return;
      }

      const saleData = {
        partner_id: myPartner.id,
        product_id: saleForm.product_id,
        quantity: parseInt(saleForm.quantity),
        unit_price: parseFloat(saleForm.unit_price),
        sale_date: new Date().toISOString(),
        customer_reference: saleForm.customer_reference || null,
        notes: saleForm.notes || null
      };

      const response = await fetch(`${BACKEND_URL}/api/fulfillment/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Sale logged successfully!\nCommission: $${result.commission_amount.toFixed(2)}\nSpiff Bonus: $${result.spiff_bonus.toFixed(2)}\nTotal: $${result.total_commission.toFixed(2)}`);
        resetSaleForm();
        fetchAllData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to log sale');
      }
    } catch (error) {
      console.error('Error logging sale:', error);
      alert('Error logging sale');
    } finally {
      setLoading(false);
    }
  };

  const resetSaleForm = () => {
    setSaleForm({
      product_id: '',
      quantity: 1,
      unit_price: '',
      customer_reference: '',
      notes: ''
    });
    setShowSaleForm(false);
    setSelectedOpportunity(null);
  };

  const openSaleForm = (opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowSaleForm(true);
    if (opportunity.products.length === 1) {
      setSaleForm({ ...saleForm, product_id: opportunity.products[0].id });
    }
  };

  if (user?.role !== 'partner') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-slate-300">This portal is only accessible to partner users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Package className="h-10 w-10" />
            Partner Portal
          </h1>
          <p className="text-slate-300">View your opportunities, log sales, and track performance</p>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs">Total Sales</p>
                    <p className="text-2xl font-bold text-white">{analytics.metrics.total_sales}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">${analytics.metrics.total_revenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs">Total Commission</p>
                    <p className="text-2xl font-bold text-white">${analytics.metrics.total_commission.toFixed(2)}</p>
                  </div>
                  <Award className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-xs">Active Opportunities</p>
                    <p className="text-2xl font-bold text-white">{analytics.active_assignments}</p>
                  </div>
                  <Target className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
            <TabsTrigger value="opportunities" className="data-[state=active]:bg-blue-600">
              <Target className="h-4 w-4 mr-2" />
              My Opportunities
            </TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-green-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              My Sales
            </TabsTrigger>
            <TabsTrigger value="milestones" className="data-[state=active]:bg-purple-600">
              <Trophy className="h-4 w-4 mr-2" />
              Milestones
            </TabsTrigger>
          </TabsList>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="mt-6">
            <div className="space-y-6">
              {opportunities.map(opp => (
                <Card key={opp.assignment_id} className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white mb-2">
                          {opp.spiff ? `🎯 ${opp.spiff.name}` : 'Product Assignment'}
                        </CardTitle>
                        {opp.spiff && (
                          <CardDescription className="text-slate-300">
                            {opp.spiff.description}
                          </CardDescription>
                        )}
                      </div>
                      <Button
                        onClick={() => openSaleForm(opp)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Log Sale
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Products */}
                    <div className="mb-4">
                      <h4 className="text-white font-semibold mb-2">Assigned Products:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {opp.products.map(product => (
                          <Card key={product.id} className="bg-white/5 border-white/10">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-white font-medium">{product.name}</p>
                                  <p className="text-slate-400 text-sm">{product.description}</p>
                                </div>
                                <Badge className="bg-blue-600">{product.commission_rate}%</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Spiff Details */}
                    {opp.spiff && (
                      <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                        <h4 className="text-yellow-300 font-semibold mb-2">💰 Spiff Incentive:</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400">Incentive</p>
                            <p className="text-white font-bold">
                              {opp.spiff.incentive_type === 'fixed'
                                ? `$${opp.spiff.incentive_amount} per unit`
                                : `${opp.spiff.incentive_amount}% bonus`}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Period</p>
                            <p className="text-white">{new Date(opp.spiff.start_date).toLocaleDateString()} - {new Date(opp.spiff.end_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Progress */}
                    {(opp.target_quantity || opp.target_revenue) && (
                      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-blue-300 font-semibold">Progress:</h4>
                          <span className="text-white font-bold">{opp.completion_percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                          <div
                            className="bg-blue-500 h-2.5 rounded-full"
                            style={{ width: `${Math.min(opp.completion_percentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {opp.target_quantity && (
                            <div>
                              <p className="text-slate-400">Quantity</p>
                              <p className="text-white">{opp.actual_quantity} / {opp.target_quantity}</p>
                            </div>
                          )}
                          {opp.target_revenue && (
                            <div>
                              <p className="text-slate-400">Revenue</p>
                              <p className="text-white">${opp.actual_revenue.toFixed(2)} / ${opp.target_revenue.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {opportunities.length === 0 && (
                <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardContent className="p-8 text-center">
                    <Target className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-300">No active opportunities at the moment. Contact your account manager for product assignments.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">My Sales History</CardTitle>
                <CardDescription className="text-slate-300">
                  View all your logged sales and commission details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">Date</TableHead>
                      <TableHead className="text-white">Product</TableHead>
                      <TableHead className="text-white">Quantity</TableHead>
                      <TableHead className="text-white">Amount</TableHead>
                      <TableHead className="text-white">Commission</TableHead>
                      <TableHead className="text-white">Spiff Bonus</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="text-white">{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-white">{sale.product_name}</TableCell>
                        <TableCell className="text-white">{sale.quantity}</TableCell>
                        <TableCell className="text-white">${sale.total_amount?.toFixed(2)}</TableCell>
                        <TableCell className="text-white">${sale.commission_amount?.toFixed(2)}</TableCell>
                        <TableCell className="text-white">${sale.spiff_bonus?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={
                            sale.commission_status === 'paid' ? 'bg-green-600' :
                            sale.commission_status === 'approved' ? 'bg-blue-600' :
                            'bg-yellow-600'
                          }>
                            {sale.commission_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {sales.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    No sales logged yet. Start by logging your first sale!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {milestones.map(milestone => (
                <Card key={milestone.id} className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-400" />
                        {milestone.milestone_name}
                      </CardTitle>
                      {milestone.status === 'achieved' ? (
                        <Badge className="bg-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Achieved
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-600">
                          <Clock className="h-4 w-4 mr-1" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-slate-300">
                      {milestone.milestone_description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-white font-bold">{milestone.percentage_complete.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${milestone.status === 'achieved' ? 'bg-green-500' : 'bg-yellow-500'}`}
                          style={{ width: `${Math.min(milestone.percentage_complete, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Current:</span>
                        <span className="text-white font-medium">{milestone.current_value.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target:</span>
                        <span className="text-white font-medium">{milestone.threshold.toFixed(0)}</span>
                      </div>
                      {milestone.reward_amount && (
                        <div className="flex justify-between p-2 bg-green-900/20 border border-green-500/30 rounded mt-3">
                          <span className="text-green-400">Reward:</span>
                          <span className="text-green-300 font-bold">${milestone.reward_amount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    {milestone.achieved_at && (
                      <div className="mt-3 text-center text-green-400 text-sm">
                        ✓ Achieved on {new Date(milestone.achieved_at).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {milestones.length === 0 && (
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 col-span-2">
                  <CardContent className="p-8 text-center">
                    <Trophy className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-300">No active milestones at the moment.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Sale Form Modal */}
        {showSaleForm && selectedOpportunity && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-slate-900 border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">Log New Sale</CardTitle>
                <CardDescription className="text-slate-300">
                  Record a sale for this opportunity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogSale} className="space-y-4">
                  <div>
                    <Label className="text-white">Product *</Label>
                    <select
                      value={saleForm.product_id}
                      onChange={(e) => setSaleForm({ ...saleForm, product_id: e.target.value })}
                      className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
                      required
                    >
                      <option value="">Select Product</option>
                      {selectedOpportunity.products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.commission_rate}% commission
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={saleForm.quantity}
                        onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Unit Price ($) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={saleForm.unit_price}
                        onChange={(e) => setSaleForm({ ...saleForm, unit_price: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white">Customer Reference (Optional)</Label>
                    <Input
                      value={saleForm.customer_reference}
                      onChange={(e) => setSaleForm({ ...saleForm, customer_reference: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Customer ID or reference"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Notes (Optional)</Label>
                    <Textarea
                      value={saleForm.notes}
                      onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? 'Logging...' : 'Log Sale'}
                    </Button>
                    <Button
                      type="button"
                      onClick={resetSaleForm}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default PartnerPortal;
