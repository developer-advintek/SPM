import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Package, DollarSign, Edit, Trash2, Award, TrendingUp } from 'lucide-react';

function ProductsNew() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    description: '',
    base_price: '',
    tier_commissions: {
      bronze: '',
      silver: '',
      gold: '',
      platinum: ''
    }
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
  const CATEGORIES = ['Mobile', 'Internet', 'TV', 'Bundle', 'Accessories', 'Other'];

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingProduct
        ? `${BACKEND_URL}/api/products/${editingProduct.id}`
        : `${BACKEND_URL}/api/products`;
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert(`Product ${editingProduct ? 'updated' : 'created'} successfully!`);
        await fetchProducts();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      category: product.category,
      description: product.description || '',
      base_price: product.base_price,
      tier_commissions: product.tier_commissions
    });
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Product deleted successfully');
        await fetchProducts();
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      category: '',
      description: '',
      base_price: '',
      tier_commissions: {
        bronze: '',
        silver: '',
        gold: '',
        platinum: ''
      }
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const getTierBadgeColor = (tier) => {
    const colors = {
      bronze: 'bg-amber-700',
      silver: 'bg-gray-400',
      gold: 'bg-yellow-500',
      platinum: 'bg-purple-600'
    };
    return colors[tier] || 'bg-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Product Management</h1>
          <p className="text-slate-300">Manage products with tier-based commission rates</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Products</p>
                  <p className="text-3xl font-bold text-white mt-2">{products.length}</p>
                </div>
                <Package className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Active Products</p>
                  <p className="text-3xl font-bold text-white mt-2">{products.filter(p => p.active).length}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Categories</p>
                  <p className="text-3xl font-bold text-white mt-2">{new Set(products.map(p => p.category)).size}</p>
                </div>
                <Award className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Avg Commission</p>
                  <p className="text-3xl font-bold text-white mt-2">12%</p>
                </div>
                <DollarSign className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Button */}
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
            {showForm ? 'Cancel' : '+ Create New Product'}
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white">
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </CardTitle>
              <CardDescription className="text-slate-300">
                Set tier-based commission rates for each partner tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-white">SKU *</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                      disabled={editingProduct !== null}
                    />
                  </div>

                  <div>
                    <Label className="text-white">Product Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      required
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Base Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-white">Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Tier Commissions */}
                <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Tier-Based Commission Rates (%)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-white flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-700"></div>
                        Bronze *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.tier_commissions.bronze}
                        onChange={(e) => setFormData({
                          ...formData,
                          tier_commissions: { ...formData.tier_commissions, bronze: e.target.value }
                        })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="e.g., 10"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        Silver *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.tier_commissions.silver}
                        onChange={(e) => setFormData({
                          ...formData,
                          tier_commissions: { ...formData.tier_commissions, silver: e.target.value }
                        })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="e.g., 12"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        Gold *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.tier_commissions.gold}
                        onChange={(e) => setFormData({
                          ...formData,
                          tier_commissions: { ...formData.tier_commissions, gold: e.target.value }
                        })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="e.g., 15"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                        Platinum *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.tier_commissions.platinum}
                        onChange={(e) => setFormData({
                          ...formData,
                          tier_commissions: { ...formData.tier_commissions, platinum: e.target.value }
                        })}
                        className="bg-white/10 border-white/20 text-white"
                        placeholder="e.g., 18"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Products Table */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Products</CardTitle>
            <CardDescription className="text-slate-300">All products with tier-based commissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white">SKU</TableHead>
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Category</TableHead>
                  <TableHead className="text-white">Base Price</TableHead>
                  <TableHead className="text-white">Commission Rates</TableHead>
                  <TableHead className="text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.id} className="border-white/10">
                    <TableCell className="text-white font-medium">{product.sku}</TableCell>
                    <TableCell className="text-slate-300">{product.name}</TableCell>
                    <TableCell>
                      <Badge className="bg-blue-600">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">${product.base_price}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Badge className={getTierBadgeColor('bronze')}>
                          Bronze: {product.tier_commissions?.bronze || 0}%
                        </Badge>
                        <Badge className={getTierBadgeColor('silver')}>
                          Silver: {product.tier_commissions?.silver || 0}%
                        </Badge>
                        <Badge className={getTierBadgeColor('gold')}>
                          Gold: {product.tier_commissions?.gold || 0}%
                        </Badge>
                        <Badge className={getTierBadgeColor('platinum')}>
                          Plat: {product.tier_commissions?.platinum || 0}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(product)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(product.id)}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProductsNew;
