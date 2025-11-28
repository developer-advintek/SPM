import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { createCommissionPlan } from '../utils/api';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const PlanDesigner = () => {
  const [products, setProducts] = useState([]);
  const [plan, setPlan] = useState({
    name: '',
    description: '',
    plan_type: 'individual',
    effective_start: '',
    rules: []
  });
  const [currentRule, setCurrentRule] = useState({
    rule_type: 'percentage',
    condition: {
      product_ids: [],
      min_amount: '',
      max_amount: ''
    },
    action: {
      commission_rate: '',
      bonus_amount: ''
    },
    priority: 0
  });
  const [showVisualDesigner, setShowVisualDesigner] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const addRule = () => {
    setPlan({
      ...plan,
      rules: [...plan.rules, { ...currentRule, id: `rule-${Date.now()}` }]
    });
    setCurrentRule({
      rule_type: 'percentage',
      condition: {
        product_ids: [],
        min_amount: '',
        max_amount: ''
      },
      action: {
        commission_rate: '',
        bonus_amount: ''
      },
      priority: 0
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createCommissionPlan(plan);
      toast.success('Commission plan created successfully');
      setPlan({
        name: '',
        description: '',
        plan_type: 'individual',
        effective_start: '',
        rules: []
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create plan');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto" data-testid="plan-designer-page">
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Commission Plan Designer</h1>
        <p className="text-slate-400">Build intelligent commission rules with our hybrid designer</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="plan-details-card" className="hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="text-slate-200">Plan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Plan Name</Label>
                <Input
                  data-testid="input-plan-name"
                  value={plan.name}
                  onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  data-testid="input-plan-description"
                  value={plan.description}
                  onChange={(e) => setPlan({ ...plan, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Plan Type</Label>
                <select
                  data-testid="select-plan-type"
                  className="w-full p-2 border rounded"
                  value={plan.plan_type}
                  onChange={(e) => setPlan({ ...plan, plan_type: e.target.value })}
                >
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div>
                <Label>Effective Start Date</Label>
                <Input
                  data-testid="input-effective-start"
                  type="datetime-local"
                  value={plan.effective_start}
                  onChange={(e) => setPlan({ ...plan, effective_start: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" data-testid="btn-create-plan">Create Plan</Button>
            </form>
          </CardContent>
        </Card>

        <Card data-testid="rules-builder-card" className="hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="text-slate-200">Rules Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-100 font-semibold">Rule Type</Label>
                <select
                  data-testid="select-rule-type"
                  className="w-full p-3 border rounded-lg bg-white/10 border-white/30 text-white"
                  value={currentRule.rule_type}
                  onChange={(e) => setCurrentRule({ ...currentRule, rule_type: e.target.value })}
                >
                  <option value="flat">Flat Rate</option>
                  <option value="percentage">Percentage Based</option>
                  <option value="tiered">Tiered (Volume-based)</option>
                  <option value="formula">Custom Formula</option>
                  <option value="multiplier">Multiplier</option>
                </select>
              </div>

              <div>
                <Label className="text-slate-100 font-semibold mb-2">Apply to Products</Label>
                <div className="max-h-40 overflow-y-auto bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 space-y-2">
                  {products.length > 0 ? (
                    products.slice(0, 10).map(product => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`product-${product.id}`}
                          checked={currentRule.condition?.product_ids?.includes(product.id) || false}
                          onChange={(e) => {
                            const currentProductIds = currentRule.condition?.product_ids || [];
                            const newProductIds = e.target.checked
                              ? [...currentProductIds, product.id]
                              : currentProductIds.filter(id => id !== product.id);
                            setCurrentRule({
                              ...currentRule,
                              condition: { ...currentRule.condition, product_ids: newProductIds }
                            });
                          }}
                          className="rounded"
                        />
                        <label htmlFor={`product-${product.id}`} className="text-sm text-slate-300 cursor-pointer">
                          {product.name} ({product.sku}) - {parseFloat(product.base_commission_rate).toFixed(2)}%
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-sm">No products available</p>
                  )}
                </div>
                {products.length > 10 && (
                  <p className="text-xs text-slate-400 mt-1">Showing first 10 products. Use "All Products" for more.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-100 font-semibold">Min Amount ($)</Label>
                  <Input
                    type="number"
                    value={currentRule.condition.min_amount}
                    onChange={(e) => setCurrentRule({
                      ...currentRule,
                      condition: { ...currentRule.condition, min_amount: e.target.value }
                    })}
                    placeholder="0"
                    className="bg-white/10 border-white/30 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-100 font-semibold">Max Amount ($)</Label>
                  <Input
                    type="number"
                    value={currentRule.condition.max_amount}
                    onChange={(e) => setCurrentRule({
                      ...currentRule,
                      condition: { ...currentRule.condition, max_amount: e.target.value }
                    })}
                    placeholder="Unlimited"
                    className="bg-white/10 border-white/30 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-100 font-semibold">Commission Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={currentRule.action.commission_rate}
                    onChange={(e) => setCurrentRule({
                      ...currentRule,
                      action: { ...currentRule.action, commission_rate: e.target.value }
                    })}
                    placeholder="5.00"
                    className="bg-white/10 border-white/30 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-100 font-semibold">Bonus Amount ($)</Label>
                  <Input
                    type="number"
                    value={currentRule.action.bonus_amount}
                    onChange={(e) => setCurrentRule({
                      ...currentRule,
                      action: { ...currentRule.action, bonus_amount: e.target.value }
                    })}
                    placeholder="0"
                    className="bg-white/10 border-white/30 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-100 font-semibold">Priority (Lower = Higher Priority)</Label>
                <Input
                  data-testid="input-rule-priority"
                  type="number"
                  value={currentRule.priority}
                  onChange={(e) => setCurrentRule({ ...currentRule, priority: parseInt(e.target.value) || 0 })}
                  className="bg-white/10 border-white/30 text-white"
                />
              </div>

              <Button onClick={addRule} className="w-full" data-testid="btn-add-rule">
                Add Rule to Plan
              </Button>
              
              <div className="mt-6">
                <h3 className="font-semibold mb-3 text-slate-200">Current Rules ({plan.rules.length})</h3>
                <div className="space-y-2" data-testid="rules-list">
                  {plan.rules.map((rule, idx) => (
                    <div key={rule.id} className="p-3 bg-purple-500/20 border border-purple-400/40 rounded-lg backdrop-blur-sm" data-testid={`rule-item-${idx}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium capitalize text-purple-200">{rule.rule_type}</span>
                            <span className="text-xs text-purple-300">Priority: {rule.priority}</span>
                          </div>
                          <div className="text-xs text-purple-300 space-y-1">
                            {rule.condition.product_ids.length > 0 && (
                              <p>Products: {rule.condition.product_ids.length} selected</p>
                            )}
                            {rule.action.commission_rate && (
                              <p>Rate: {rule.action.commission_rate}%</p>
                            )}
                            {rule.condition.min_amount && (
                              <p>Min: ${rule.condition.min_amount}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            setPlan({
                              ...plan,
                              rules: plan.rules.filter(r => r.id !== rule.id)
                            });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {plan.rules.length === 0 && (
                    <p className="text-slate-400 text-sm" data-testid="no-rules">No rules added yet</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 hover:scale-[1.01]" data-testid="visual-designer-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-200">Visual Flow Designer</CardTitle>
          <Button
            variant="outline"
            onClick={() => setShowVisualDesigner(!showVisualDesigner)}
            data-testid="btn-toggle-visual"
          >
            {showVisualDesigner ? 'Hide Visual Designer' : 'Show Visual Designer'}
          </Button>
        </CardHeader>
        <CardContent>
          {showVisualDesigner ? (
            <div className="bg-slate-800/20 rounded-lg p-6 min-h-96" data-testid="visual-flow-canvas">
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Commission Plan Flow</h3>
                <p className="text-sm text-slate-400">Visual representation of your commission rules</p>
              </div>

              {plan.rules.length > 0 ? (
                <div className="space-y-6">
                  {plan.rules.sort((a, b) => a.priority - b.priority).map((rule, idx) => (
                    <div key={rule.id} className="flex items-center gap-4" data-testid={`flow-rule-${idx}`}>
                      {/* Priority Badge */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg">
                        {rule.priority}
                      </div>

                      {/* Arrow */}
                      <div className="w-8 h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>

                      {/* Condition Node */}
                      <div className="flex-1 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-400/40 rounded-lg p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">IF</span>
                          <span className="font-semibold text-white capitalize">{rule.rule_type}</span>
                        </div>
                        <div className="text-xs text-blue-200 space-y-1">
                          {rule.condition.product_ids.length > 0 && (
                            <p>• {rule.condition.product_ids.length} product(s) selected</p>
                          )}
                          {rule.condition.min_amount && (
                            <p>• Amount ≥ ${rule.condition.min_amount}</p>
                          )}
                          {rule.condition.max_amount && (
                            <p>• Amount ≤ ${rule.condition.max_amount}</p>
                          )}
                          {!rule.condition.product_ids.length && !rule.condition.min_amount && !rule.condition.max_amount && (
                            <p>• All transactions</p>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="w-8 h-1 bg-gradient-to-r from-blue-500 to-green-500"></div>

                      {/* Action Node */}
                      <div className="flex-1 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/40 rounded-lg p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">THEN</span>
                          <span className="font-semibold text-white">Apply Commission</span>
                        </div>
                        <div className="text-xs text-green-200 space-y-1">
                          {rule.action.commission_rate && (
                            <p>• Rate: {rule.action.commission_rate}%</p>
                          )}
                          {rule.action.bonus_amount && (
                            <p>• Bonus: ${rule.action.bonus_amount}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Final Result */}
                  <div className="flex items-center gap-4 justify-center mt-8">
                    <div className="w-8 h-1 bg-gradient-to-r from-green-500 to-yellow-500"></div>
                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-400/40 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">💰</span>
                        <span className="font-semibold text-white">Final Commission Calculated</span>
                      </div>
                      <p className="text-xs text-yellow-200 mt-1">Based on highest priority matching rule</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-purple-500/30 rounded-lg p-12 text-center">
                  <p className="text-slate-300 text-lg font-semibold">No Rules Defined Yet</p>
                  <p className="text-sm text-slate-400 mt-2">Add rules using the form builder to see the visual flow</p>
                  <div className="mt-6 flex justify-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-xs font-medium shadow-lg shadow-blue-500/50 opacity-30">
                      <span className="text-white">IF</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-30"></div>
                    </div>
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-xs font-medium shadow-lg shadow-purple-500/50 opacity-30">
                      <span className="text-white">THEN</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400">Click "Show Visual Designer" to see the flow visualization</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
