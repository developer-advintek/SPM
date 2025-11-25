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
import { AlertCircle, TrendingUp, Target, Calendar, Package } from 'lucide-react';

function SpiffCenter() {
  const { user, token } = useAuth();
  const [spiffs, setSpiffs] = useState([]);
  const [activeSpiffs, setActiveSpiffs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    target_products: [],
    target_segments: [],
    incentive_amount: '',
    incentive_type: 'fixed',
    eligibility_criteria: {}
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchSpiffs();
    fetchActiveSpiffs();
    fetchProducts();
  }, []);

  const fetchSpiffs = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/spiffs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSpiffs(data);
      }
    } catch (error) {
      console.error('Error fetching spiffs:', error);
    }
  };

  const fetchActiveSpiffs = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/spiffs/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSpiffs(data);
      }
    } catch (error) {
      console.error('Error fetching active spiffs:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleCreateSpiff = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/spiffs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date).toISOString(),
          incentive_amount: parseFloat(formData.incentive_amount)
        })
      });

      if (response.ok) {
        await fetchSpiffs();
        await fetchActiveSpiffs();
        setShowCreateForm(false);
        setFormData({
          name: '',
          description: '',
          start_date: '',
          end_date: '',
          target_products: [],
          target_segments: [],
          incentive_amount: '',
          incentive_type: 'fixed',
          eligibility_criteria: {}
        });
        alert('Spiff created successfully!');
      } else {
        alert('Failed to create spiff');
      }
    } catch (error) {
      console.error('Error creating spiff:', error);
      alert('Error creating spiff');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSpiffStatus = async (spiffId, newStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/spiffs/${spiffId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchSpiffs();
        await fetchActiveSpiffs();
        alert('Spiff status updated!');
      }
    } catch (error) {
      console.error('Error updating spiff:', error);
    }
  };

  const toggleProductSelection = (sku) => {
    setFormData(prev => ({
      ...prev,
      target_products: prev.target_products.includes(sku)
        ? prev.target_products.filter(s => s !== sku)
        : [...prev.target_products, sku]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'draft': return 'bg-gray-500';
      case 'ended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getIncentiveTypeLabel = (type) => {
    switch (type) {
      case 'fixed': return 'Fixed Amount';
      case 'percentage': return 'Percentage';
      case 'multiplier': return 'Multiplier';
      default: return type;
    }
  };

  const isDateInRange = (startDate, endDate) => {
    const now = new Date();
    return new Date(startDate) <= now && new Date(endDate) >= now;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Spiff Center</h1>
          <p className="text-slate-300">Manage short-term incentive programs and campaigns</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Active Spiffs</p>
                  <p className="text-3xl font-bold text-white mt-2">{activeSpiffs.length}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Spiffs</p>
                  <p className="text-3xl font-bold text-white mt-2">{spiffs.length}</p>
                </div>
                <Target className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Draft Spiffs</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {spiffs.filter(s => s.status === 'draft').length}
                  </p>
                </div>
                <AlertCircle className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Products Targeted</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {new Set(spiffs.flatMap(s => s.target_products)).size}
                  </p>
                </div>
                <Package className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Button */}
        {(user?.role === 'admin' || user?.role === 'finance') && (
          <div className="mb-6">
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="create-spiff-btn"
            >
              {showCreateForm ? 'Cancel' : '+ Create New Spiff'}
            </Button>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Create New Spiff Campaign</CardTitle>
              <CardDescription className="text-slate-300">
                Set up a short-term incentive program with product targeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSpiff} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-white">Spiff Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                      data-testid="spiff-name-input"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Incentive Type *</Label>
                    <Select
                      value={formData.incentive_type}
                      onValueChange={(value) => setFormData({ ...formData, incentive_type: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="multiplier">Multiplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Start Date *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">End Date *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">Incentive Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.incentive_amount}
                      onChange={(e) => setFormData({ ...formData, incentive_amount: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">Target Segment</Label>
                    <Input
                      value={formData.target_segments.join(', ')}
                      onChange={(e) => setFormData({ ...formData, target_segments: e.target.value.split(',').map(s => s.trim()) })}
                      placeholder="e.g., Enterprise, SMB"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="text-white mb-3 block">Target Products (SKUs)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-4 bg-white/5 rounded-lg">
                    {products.map(product => (
                      <div
                        key={product.id}
                        onClick={() => toggleProductSelection(product.sku)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          formData.target_products.includes(product.sku)
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/10 text-slate-300 hover:bg-white/20'
                        }`}
                      >
                        <div className="font-medium text-sm">{product.sku}</div>
                        <div className="text-xs opacity-80">{product.name}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {formData.target_products.length} product(s) selected
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="submit-spiff-btn"
                >
                  {loading ? 'Creating...' : 'Create Spiff Campaign'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Spiff Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
            <TabsTrigger value="active" className="data-[state=active]:bg-blue-600">Active Spiffs</TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">All Spiffs</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeSpiffs.length === 0 ? (
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 col-span-2">
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-300">No active spiff campaigns at the moment</p>
                  </CardContent>
                </Card>
              ) : (
                activeSpiffs.map(spiff => (
                  <Card key={spiff.id} className="bg-white/10 backdrop-blur-lg border-white/20" data-testid="active-spiff-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white text-lg">{spiff.name}</CardTitle>
                          <CardDescription className="text-slate-300 mt-1">
                            {spiff.description}
                          </CardDescription>
                        </div>
                        <Badge className={`${getStatusColor(spiff.status)} text-white`}>
                          {spiff.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Incentive:</span>
                          <span className="text-white font-semibold">
                            {spiff.incentive_type === 'fixed' && '$'}
                            {spiff.incentive_amount}
                            {spiff.incentive_type === 'percentage' && '%'}
                            {spiff.incentive_type === 'multiplier' && 'x'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Type:</span>
                          <span className="text-white">{getIncentiveTypeLabel(spiff.incentive_type)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Duration:</span>
                          <span className="text-white">
                            {new Date(spiff.start_date).toLocaleDateString()} - {new Date(spiff.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Targeted Products:</span>
                          <span className="text-white">{spiff.target_products.length} SKUs</span>
                        </div>
                        {spiff.target_segments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-slate-400 mb-2">Target Segments:</p>
                            <div className="flex flex-wrap gap-2">
                              {spiff.target_segments.map((segment, idx) => (
                                <Badge key={idx} variant="outline" className="text-white border-white/30">
                                  {segment}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spiffs.map(spiff => (
                <Card key={spiff.id} className="bg-white/10 backdrop-blur-lg border-white/20" data-testid="spiff-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-white text-lg">{spiff.name}</CardTitle>
                      <Badge className={`${getStatusColor(spiff.status)} text-white`}>
                        {spiff.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-300 mt-2">
                      {spiff.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Incentive:</span>
                        <span className="text-white font-semibold">
                          {spiff.incentive_type === 'fixed' && '$'}
                          {spiff.incentive_amount}
                          {spiff.incentive_type === 'percentage' && '%'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Products:</span>
                        <span className="text-white">{spiff.target_products.length} SKUs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Period:</span>
                        <span className="text-white text-xs">
                          {new Date(spiff.start_date).toLocaleDateString()} - {new Date(spiff.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      {(user?.role === 'admin' || user?.role === 'finance') && spiff.status === 'draft' && (
                        <Button
                          onClick={() => handleUpdateSpiffStatus(spiff.id, 'active')}
                          className="w-full mt-4 bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          Activate
                        </Button>
                      )}
                      {(user?.role === 'admin' || user?.role === 'finance') && spiff.status === 'active' && (
                        <Button
                          onClick={() => handleUpdateSpiffStatus(spiff.id, 'ended')}
                          className="w-full mt-4 bg-red-600 hover:bg-red-700"
                          size="sm"
                        >
                          End Campaign
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default SpiffCenter;
