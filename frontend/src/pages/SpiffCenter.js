import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import axios from 'axios';
import { toast } from 'sonner';
import { Zap, Award, Clock, DollarSign, Target } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const SpiffCenter = () => {
  const [spiffs, setSpiffs] = useState([]);
  const [activeSpiffs, setActiveSpiffs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [newSpiff, setNewSpiff] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    target_products: [],
    target_segments: ['enterprise'],
    incentive_amount: 0,
    incentive_type: 'percentage',
    eligibility_criteria: {}
  });

  useEffect(() => {
    fetchSpiffs();
    fetchActiveSpiffs();
    fetchProducts();
  }, []);

  const fetchSpiffs = async () => {
    try {
      const response = await axios.get(`${API}/spiffs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSpiffs(response.data);
    } catch (error) {
      console.error('Failed to fetch spiffs', error);
    }
  };

  const fetchActiveSpiffs = async () => {
    try {
      const response = await axios.get(`${API}/spiffs/active`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActiveSpiffs(response.data);
    } catch (error) {
      console.error('Failed to fetch active spiffs', error);
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

  const handleCreateSpiff = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/spiffs`, newSpiff, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Spiff created successfully!');
      fetchSpiffs();
      setNewSpiff({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        target_products: [],
        target_segments: ['enterprise'],
        incentive_amount: 0,
        incentive_type: 'percentage',
        eligibility_criteria: {}
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create spiff');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSpiff = async (spiffId) => {
    try {
      await axios.put(`${API}/spiffs/${spiffId}/activate`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Spiff activated!');
      fetchSpiffs();
      fetchActiveSpiffs();
    } catch (error) {
      toast.error('Failed to activate spiff');
    }
  };

  const handleEndSpiff = async (spiffId) => {
    try {
      await axios.put(`${API}/spiffs/${spiffId}/end`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Spiff ended!');
      fetchSpiffs();
      fetchActiveSpiffs();
    } catch (error) {
      toast.error('Failed to end spiff');
    }
  };

  const toggleProductSelection = (sku) => {
    const isSelected = newSpiff.target_products.includes(sku);
    setNewSpiff({
      ...newSpiff,
      target_products: isSelected
        ? newSpiff.target_products.filter(s => s !== sku)
        : [...newSpiff.target_products, sku]
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-2">
          Spiff Center
        </h1>
        <p className="text-slate-400">Manage short-term incentives and boost sales performance</p>
      </div>

      {/* Active Spiffs Banner */}
      <Card className="mb-6 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Zap className="w-12 h-12 text-amber-400" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">Active Spiffs</h3>
              <p className="text-slate-300">You have {activeSpiffs.length} active spiffs running right now!</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-amber-400">{activeSpiffs.length}</p>
              <p className="text-slate-300 text-sm">Live</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="bg-slate-800/50 border-slate-700/50">
          <TabsTrigger value="active" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
            Active Spiffs
          </TabsTrigger>
          <TabsTrigger value="create" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
            Create Spiff
          </TabsTrigger>
          <TabsTrigger value="all" className="text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
            All Spiffs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSpiffs.map(spiff => (
              <Card key={spiff.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl hover:scale-105 transition-transform">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-6 h-6 text-amber-400" />
                      <CardTitle className="text-slate-100">{spiff.name}</CardTitle>
                    </div>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-slate-300 text-sm">{spiff.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/20 p-3 rounded-lg">
                      <p className="text-slate-400 text-xs mb-1">Incentive</p>
                      <p className="text-amber-400 font-bold text-lg">
                        {spiff.incentive_type === 'percentage' ? `${spiff.incentive_amount}%` :
                         spiff.incentive_type === 'fixed' ? `$${spiff.incentive_amount}` :
                         `${spiff.incentive_amount}x`}
                      </p>
                    </div>
                    
                    <div className="bg-slate-700/20 p-3 rounded-lg">
                      <p className="text-slate-400 text-xs mb-1">Type</p>
                      <p className="text-white font-semibold capitalize">{spiff.incentive_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>Ends: {new Date(spiff.end_date).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Target className="w-4 h-4" />
                    <span>{spiff.target_products?.length || 0} Products Targeted</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-red-500 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleEndSpiff(spiff.id)}
                  >
                    End Spiff
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {activeSpiffs.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <Zap className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No active spiffs. Create one to boost sales!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="create">
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">Create New Spiff</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSpiff} className="space-y-4">
                <div>
                  <Label className="text-slate-200">Spiff Name</Label>
                  <Input
                    className="bg-slate-700/30 border-slate-600/30 text-white"
                    value={newSpiff.name}
                    onChange={(e) => setNewSpiff({ ...newSpiff, name: e.target.value })}
                    placeholder="Q4 Product Push Spiff"
                    required
                  />
                </div>

                <div>
                  <Label className="text-slate-200">Description</Label>
                  <textarea
                    className="w-full p-3 rounded-lg bg-slate-700/30 border border-slate-600/30 text-white"
                    value={newSpiff.description}
                    onChange={(e) => setNewSpiff({ ...newSpiff, description: e.target.value })}
                    placeholder="Extra incentive for selling target products"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-200">Start Date</Label>
                    <Input
                      type="datetime-local"
                      className="bg-slate-700/30 border-slate-600/30 text-white"
                      value={newSpiff.start_date}
                      onChange={(e) => setNewSpiff({ ...newSpiff, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-slate-200">End Date</Label>
                    <Input
                      type="datetime-local"
                      className="bg-slate-700/30 border-slate-600/30 text-white"
                      value={newSpiff.end_date}
                      onChange={(e) => setNewSpiff({ ...newSpiff, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-200">Incentive Type</Label>
                    <select
                      className="w-full p-3 rounded-lg bg-slate-700/30 border border-slate-600/30 text-white"
                      value={newSpiff.incentive_type}
                      onChange={(e) => setNewSpiff({ ...newSpiff, incentive_type: e.target.value })}
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="multiplier">Multiplier</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-slate-200">Incentive Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="bg-slate-700/30 border-slate-600/30 text-white"
                      value={newSpiff.incentive_amount}
                      onChange={(e) => setNewSpiff({ ...newSpiff, incentive_amount: parseFloat(e.target.value) })}
                      placeholder={newSpiff.incentive_type === 'percentage' ? '10' : newSpiff.incentive_type === 'fixed' ? '500' : '1.5'}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-200 mb-2">Target Products (Select SKUs)</Label>
                  <div className="max-h-48 overflow-y-auto bg-slate-700/20 border border-slate-600/30 rounded-lg p-3 space-y-2">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`spiff-product-${product.id}`}
                          checked={newSpiff.target_products.includes(product.sku)}
                          onChange={() => toggleProductSelection(product.sku)}
                          className="rounded"
                        />
                        <label htmlFor={`spiff-product-${product.id}`} className="text-sm text-slate-300 cursor-pointer flex-1">
                          {product.name} ({product.sku})
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {newSpiff.target_products.length} product(s) selected
                  </p>
                </div>

                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-amber-400 font-semibold mb-2">Spiff Preview:</p>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• Duration: {newSpiff.start_date && newSpiff.end_date ? 
                        Math.ceil((new Date(newSpiff.end_date) - new Date(newSpiff.start_date)) / (1000 * 60 * 60 * 24)) : '0'} days</li>
                    <li>• Incentive: {newSpiff.incentive_type === 'percentage' ? `${newSpiff.incentive_amount}%` :
                                      newSpiff.incentive_type === 'fixed' ? `$${newSpiff.incentive_amount}` :
                                      `${newSpiff.incentive_amount}x multiplier`}</li>
                    <li>• Products: {newSpiff.target_products.length} SKUs targeted</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {loading ? 'Creating...' : 'Create Spiff'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <div className="space-y-3">
            {spiffs.map(spiff => (
              <Card key={spiff.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-bold text-lg">{spiff.name}</h3>
                        <Badge className={
                          spiff.status === 'active' ? 'bg-green-500' :
                          spiff.status === 'ended' ? 'bg-red-500' : 'bg-gray-500'
                        }>
                          {spiff.status}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{spiff.description}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(spiff.start_date).toLocaleDateString()} - {new Date(spiff.end_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {spiff.incentive_type === 'percentage' ? `${spiff.incentive_amount}%` :
                           spiff.incentive_type === 'fixed' ? `$${spiff.incentive_amount}` :
                           `${spiff.incentive_amount}x`}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {spiff.status === 'draft' && (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-emerald-500"
                          onClick={() => handleActivateSpiff(spiff.id)}
                        >
                          Activate
                        </Button>
                      )}
                      {spiff.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400"
                          onClick={() => handleEndSpiff(spiff.id)}
                        >
                          End Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {spiffs.length === 0 && (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No spiffs created yet. Create your first spiff to get started!</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpiffCenter;
