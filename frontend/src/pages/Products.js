import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { getProducts, createProduct, bulkUploadProducts } from '../utils/api';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export const Products = () => {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    commission_rate_code: '',
    gross_margin_percent: '',
    base_commission_rate: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      toast.error('Failed to fetch products');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createProduct(formData);
      toast.success('Product created successfully');
      setOpen(false);
      fetchProducts();
      setFormData({
        sku: '',
        name: '',
        category: '',
        commission_rate_code: '',
        gross_margin_percent: '',
        base_commission_rate: ''
      });
    } catch (error) {
      toast.error('Failed to create product');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const result = await bulkUploadProducts(file);
        toast.success(`${result.products_created} products uploaded`);
        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} errors occurred`);
        }
        fetchProducts();
      } catch (error) {
        toast.error('Failed to upload products');
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="products-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Product Catalog</h1>
          <p className="text-slate-400">Manage products, commissions & eligibility</p>
        </div>
        <div className="flex gap-3">
          <label className="cursor-pointer">
            <Button variant="outline" as="span" data-testid="btn-bulk-upload">Bulk Upload CSV</Button>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="btn-add-product">Add Product</Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-product">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>SKU</Label>
                  <Input
                    data-testid="input-sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    data-testid="input-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    data-testid="input-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Commission Rate Code</Label>
                  <Input
                    data-testid="input-commission-code"
                    value={formData.commission_rate_code}
                    onChange={(e) => setFormData({ ...formData, commission_rate_code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Gross Margin %</Label>
                  <Input
                    data-testid="input-margin"
                    type="number"
                    step="0.01"
                    value={formData.gross_margin_percent}
                    onChange={(e) => setFormData({ ...formData, gross_margin_percent: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Base Commission Rate</Label>
                  <Input
                    data-testid="input-commission-rate"
                    type="number"
                    step="0.01"
                    value={formData.base_commission_rate}
                    onChange={(e) => setFormData({ ...formData, base_commission_rate: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="btn-submit-product">Create Product</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card data-testid="products-table-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Margin %</TableHead>
                <TableHead>Commission Rate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id} data-testid={`product-row-${product.sku}`}>
                    <TableCell className="font-medium">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{parseFloat(product.gross_margin_percent).toFixed(2)}%</TableCell>
                    <TableCell>{parseFloat(product.base_commission_rate).toFixed(4)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${product.eligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.eligible ? 'Eligible' : 'Not Eligible'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-600" data-testid="no-products">
                    No products found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
