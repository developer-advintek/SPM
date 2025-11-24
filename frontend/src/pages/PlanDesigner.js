import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { createCommissionPlan } from '../utils/api';
import { toast } from 'sonner';

export const PlanDesigner = () => {
  const [plan, setPlan] = useState({
    name: '',
    description: '',
    plan_type: 'individual',
    effective_start: '',
    rules: []
  });
  const [currentRule, setCurrentRule] = useState({
    rule_type: 'percentage',
    condition: {},
    action: {},
    priority: 0
  });

  const addRule = () => {
    setPlan({
      ...plan,
      rules: [...plan.rules, { ...currentRule, id: `rule-${Date.now()}` }]
    });
    setCurrentRule({
      rule_type: 'percentage',
      condition: {},
      action: {},
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
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Commission Plan Designer</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="plan-details-card">
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
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

        <Card data-testid="rules-builder-card">
          <CardHeader>
            <CardTitle>Rules Builder (Hybrid)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Rule Type</Label>
                <select
                  data-testid="select-rule-type"
                  className="w-full p-2 border rounded"
                  value={currentRule.rule_type}
                  onChange={(e) => setCurrentRule({ ...currentRule, rule_type: e.target.value })}
                >
                  <option value="flat">Flat Rate</option>
                  <option value="percentage">Percentage</option>
                  <option value="tiered">Tiered</option>
                  <option value="formula">Formula</option>
                  <option value="multiplier">Multiplier</option>
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <Input
                  data-testid="input-rule-priority"
                  type="number"
                  value={currentRule.priority}
                  onChange={(e) => setCurrentRule({ ...currentRule, priority: parseInt(e.target.value) })}
                />
              </div>
              <Button onClick={addRule} className="w-full" data-testid="btn-add-rule">Add Rule</Button>
              
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Current Rules ({plan.rules.length})</h3>
                <div className="space-y-2" data-testid="rules-list">
                  {plan.rules.map((rule, idx) => (
                    <div key={rule.id} className="p-3 bg-slate-50 rounded" data-testid={`rule-item-${idx}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium capitalize">{rule.rule_type}</span>
                        <span className="text-sm text-slate-600">Priority: {rule.priority}</span>
                      </div>
                    </div>
                  ))}
                  {plan.rules.length === 0 && (
                    <p className="text-slate-600 text-sm" data-testid="no-rules">No rules added yet</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6" data-testid="visual-designer-card">
        <CardHeader>
          <CardTitle>Visual Flow Designer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center" data-testid="visual-flow-canvas">
            <p className="text-slate-600">Visual flow chart builder</p>
            <p className="text-sm text-slate-400 mt-2">Drag and drop rules to create commission logic flows</p>
            <div className="mt-6 flex justify-center gap-4">
              <div className="w-24 h-24 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-medium" data-testid="flow-node-condition">
                Condition
              </div>
              <div className="flex items-center">
                <div className="w-8 h-0.5 bg-slate-300"></div>
              </div>
              <div className="w-24 h-24 bg-green-100 rounded-lg flex items-center justify-center text-xs font-medium" data-testid="flow-node-action">
                Action
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
