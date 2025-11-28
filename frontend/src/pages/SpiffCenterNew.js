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
import { Zap, Target, DollarSign, Calendar, Award, Users, Package } from 'lucide-react';

function SpiffCenterNew() {
  const { token } = useAuth();
  const [spiffs, setSpiffs] = useState([]);
  const [products, setProducts] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSpiff, setEditingSpiff] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    target_products: [],
    assignment_type: 'tier',
    target_tiers: [],
    target_partners: [],
    incentive_amount: '',
    incentive_type: 'fixed'
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
  const TIERS = ['bronze', 'silver', 'gold', 'platinum'];

  useEffect(() => {
    fetchSpiffs();
    fetchProducts();
    fetchPartners();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingSpiff
        ? `${BACKEND_URL}/api/spiffs/${editingSpiff.id}`
        : `${BACKEND_URL}/api/spiffs`;
      
      const method = editingSpiff ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert(`Spiff campaign ${editingSpiff ? 'updated' : 'created'} successfully!`);
        await fetchSpiffs();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to save spiff campaign');
      }
    } catch (error) {
      console.error('Error saving spiff:', error);
      alert('Error saving spiff campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (spiff) => {
    setEditingSpiff(spiff);
    setFormData({
      name: spiff.name,
      description: spiff.description || '',
      start_date: new Date(spiff.start_date).toISOString().split('T')[0],
      end_date: new Date(spiff.end_date).toISOString().split('T')[0],
      target_products: spiff.target_products,
      assignment_type: spiff.assignment_type,
      target_tiers: spiff.target_tiers || [],
      target_partners: spiff.target_partners || [],
      incentive_amount: spiff.incentive_amount,
      incentive_type: spiff.incentive_type
    });
    setShowForm(true);
  };

  const handleStatusChange = async (spiffId, newStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/spiffs/${spiffId}/status?status=${newStatus}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        alert(`Spiff status updated to ${newStatus}`);
        await fetchSpiffs();
      } else {
        alert('Failed to update spiff status');
      }
    } catch (error) {
      console.error('Error updating spiff status:', error);
      alert('Error updating spiff status');
    }
  };

  const handleDelete = async (spiffId) => {
    if (!window.confirm('Are you sure you want to delete this spiff campaign?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/spiffs/${spiffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Spiff deleted successfully');
        await fetchSpiffs();
      } else {
        alert('Failed to delete spiff');
      }
    } catch (error) {
      console.error('Error deleting spiff:', error);
      alert('Error deleting spiff');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      target_products: [],
      assignment_type: 'tier',
      target_tiers: [],
      target_partners: [],
      incentive_amount: '',
      incentive_type: 'fixed'
    });
    setEditingSpiff(null);
    setShowForm(false);
  };

  const toggleProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      target_products: prev.target_products.includes(productId)
        ? prev.target_products.filter(id => id !== productId)
        : [...prev.target_products, productId]
    }));
  };

  const toggleTier = (tier) => {
    setFormData(prev => ({
      ...prev,
      target_tiers: prev.target_tiers.includes(tier)
        ? prev.target_tiers.filter(t => t !== tier)
        : [...prev.target_tiers, tier]
    }));
  };

  const togglePartner = (partnerId) => {
    setFormData(prev => ({
      ...prev,
      target_partners: prev.target_partners.includes(partnerId)
        ? prev.target_partners.filter(id => id !== partnerId)
        : [...prev.target_partners, partnerId]
    }));
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-600',
      inactive: 'bg-gray-600',
      expired: 'bg-red-600'
    };
    return <Badge className={colors[status] || 'bg-gray-600'}>{status}</Badge>;
  };

  const activeSpiffs = spiffs.filter(s => s.status === 'active');
  const inactiveSpiffs = spiffs.filter(s => s.status === 'inactive');
  const expiredSpiffs = spiffs.filter(s => s.status === 'expired');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Zap className="h-10 w-10" />
            Spiff Campaign Center
          </h1>
          <p className="text-slate-300">Create and manage bonus incentive campaigns for partners</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Active Campaigns</p>
                  <p className="text-3xl font-bold text-white mt-2">{activeSpiffs.length}</p>
                </div>
                <Target className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Campaigns</p>
                  <p className="text-3xl font-bold text-white mt-2">{spiffs.length}</p>
                </div>
                <Zap className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Eligible Products</p>
                  <p className="text-3xl font-bold text-white mt-2">{products.length}</p>
                </div>
                <Package className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Eligible Partners</p>
                  <p className="text-3xl font-bold text-white mt-2">{partners.length}</p>
                </div>
                <Users className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <Button
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ Create New Spiff Campaign'}
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white">
                {editingSpiff ? 'Edit Spiff Campaign' : 'Create New Spiff Campaign'}
              </CardTitle>
              <CardDescription className="text-slate-300">
                Bonus incentive on top of regular tier-based product commissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-white">Campaign Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Summer Sale Bonus"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-white">Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      rows={2}
                      placeholder="Extra bonus for summer promotion..."
                    />
                  </div>

                  <div>
                    <Label className="text-white">Start Date *</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">End Date *</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
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
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Incentive Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.incentive_amount}
                      onChange={(e) => setFormData({ ...formData, incentive_amount: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder={formData.incentive_type === 'fixed' ? '100' : '5'}
                      required
                    />
                  </div>
                </div>

                {/* Product Selection */}
                <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Select Products * (Campaigns apply to these products)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`product-${product.id}`}
                          checked={formData.target_products.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="rounded"
                        />
                        <label htmlFor={`product-${product.id}`} className="text-slate-300 text-sm cursor-pointer">
                          {product.name} ({product.sku})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Partner Assignment */}
                <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Partner Assignment *
                  </h3>
                  
                  <div className="mb-4">
                    <Label className="text-white">Assignment Type</Label>
                    <Select
                      value={formData.assignment_type}
                      onValueChange={(value) => setFormData({ ...formData, assignment_type: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tier">By Partner Tier</SelectItem>
                        <SelectItem value="individual">Individual Partners</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.assignment_type === 'tier' ? (
                    <div>
                      <Label className="text-white mb-3 block">Select Tiers *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {TIERS.map(tier => (
                          <div key={tier} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`tier-${tier}`}
                              checked={formData.target_tiers.includes(tier)}
                              onChange={() => toggleTier(tier)}
                              className="rounded"
                            />
                            <label htmlFor={`tier-${tier}`} className="text-slate-300 text-sm cursor-pointer capitalize">
                              {tier}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-white mb-3 block">Select Partners *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                        {partners.map(partner => (
                          <div key={partner.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`partner-${partner.id}`}
                              checked={formData.target_partners.includes(partner.id)}
                              onChange={() => togglePartner(partner.id)}
                              className="rounded"
                            />
                            <label htmlFor={`partner-${partner.id}`} className="text-slate-300 text-sm cursor-pointer">
                              {partner.company_name} ({partner.tier})
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Saving...' : (editingSpiff ? 'Update Campaign' : 'Create Campaign')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Spiffs Table */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
            <TabsTrigger value="active" className="data-[state=active]:bg-green-600">
              Active ({activeSpiffs.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">
              All Campaigns ({spiffs.length})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="data-[state=active]:bg-gray-600">
              Inactive ({inactiveSpiffs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6">
                <SpiffTable 
                  spiffs={activeSpiffs} 
                  onEdit={handleEdit} 
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  products={products}
                  partners={partners}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6">
                <SpiffTable 
                  spiffs={spiffs} 
                  onEdit={handleEdit} 
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  products={products}
                  partners={partners}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inactive" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6">
                <SpiffTable 
                  spiffs={inactiveSpiffs} 
                  onEdit={handleEdit} 
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  products={products}
                  partners={partners}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SpiffTable({ spiffs, onEdit, onStatusChange, onDelete, products, partners }) {
  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-600',
      inactive: 'bg-gray-600',
      expired: 'bg-red-600'
    };
    return <Badge className={colors[status] || 'bg-gray-600'}>{status}</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/10">
          <TableHead className="text-white">Campaign Name</TableHead>
          <TableHead className="text-white">Period</TableHead>
          <TableHead className="text-white">Incentive</TableHead>
          <TableHead className="text-white">Products</TableHead>
          <TableHead className="text-white">Assignment</TableHead>
          <TableHead className="text-white">Status</TableHead>
          <TableHead className="text-white">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {spiffs.map(spiff => (
          <TableRow key={spiff.id} className="border-white/10">
            <TableCell className="text-white font-medium">{spiff.name}</TableCell>
            <TableCell className="text-slate-300">
              {new Date(spiff.start_date).toLocaleDateString()} - {new Date(spiff.end_date).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-slate-300">
              {spiff.incentive_type === 'fixed' ? '$' : ''}{spiff.incentive_amount}{spiff.incentive_type === 'percentage' ? '%' : ''}
            </TableCell>
            <TableCell className="text-slate-300">
              {spiff.target_products?.length || 0} products
            </TableCell>
            <TableCell>
              {spiff.assignment_type === 'tier' ? (
                <Badge className="bg-purple-600">
                  Tier: {spiff.target_tiers?.join(', ') || 'None'}
                </Badge>
              ) : (
                <Badge className="bg-blue-600">
                  {spiff.target_partners?.length || 0} partners
                </Badge>
              )}
            </TableCell>
            <TableCell>{getStatusBadge(spiff.status)}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  onClick={() => onEdit(spiff)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Edit
                </Button>
                {spiff.status === 'active' ? (
                  <Button
                    onClick={() => onStatusChange(spiff.id, 'inactive')}
                    size="sm"
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    onClick={() => onStatusChange(spiff.id, 'active')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Activate
                  </Button>
                )}
                <Button
                  onClick={() => onDelete(spiff.id)}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default SpiffCenterNew;
