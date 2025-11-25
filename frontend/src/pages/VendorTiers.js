import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Award, TrendingUp, Users, Shield, CheckCircle, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

function VendorTiers() {
  const { user, token } = useAuth();
  const [partners, setPartners] = useState([]);
  const [eligibilityRules, setEligibilityRules] = useState([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ruleFormData, setRuleFormData] = useState({
    product_type: '',
    sales_channel: '',
    customer_segment: '',
    eligible: true,
    commission_rate_override: '',
    effective_start: ''
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  const TIER_INFO = {
    bronze: {
      name: 'Bronze',
      color: 'from-orange-700 to-orange-900',
      badgeColor: 'bg-orange-600',
      icon: '🥉',
      benefits: ['Basic commission rates', 'Standard support', 'Quarterly reviews'],
      requirements: '$0 - $50K annual volume'
    },
    silver: {
      name: 'Silver',
      color: 'from-gray-400 to-gray-600',
      badgeColor: 'bg-gray-500',
      icon: '🥈',
      benefits: ['Enhanced commission rates', 'Priority support', 'Monthly reviews', 'Training access'],
      requirements: '$50K - $250K annual volume'
    },
    gold: {
      name: 'Gold',
      color: 'from-yellow-500 to-yellow-700',
      badgeColor: 'bg-yellow-600',
      icon: '🥇',
      benefits: ['Premium commission rates', 'Dedicated support', 'Weekly reviews', 'Marketing support'],
      requirements: '$250K - $1M annual volume'
    },
    platinum: {
      name: 'Platinum',
      color: 'from-purple-500 to-purple-700',
      badgeColor: 'bg-purple-600',
      icon: '💎',
      benefits: ['VIP commission rates', '24/7 support', 'Daily insights', 'Co-marketing programs', 'Executive access'],
      requirements: '$1M+ annual volume'
    }
  };

  useEffect(() => {
    fetchPartners();
    fetchEligibilityRules();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPartners(data);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const fetchEligibilityRules = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/eligibility-rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEligibilityRules(data);
      }
    } catch (error) {
      console.error('Error fetching eligibility rules:', error);
    }
  };

  const handleUpdateTier = async (partnerId, newTier) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tier: newTier })
      });

      if (response.ok) {
        await fetchPartners();
        alert('Partner tier updated successfully!');
      } else {
        alert('Failed to update tier');
      }
    } catch (error) {
      console.error('Error updating tier:', error);
      alert('Error updating tier');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/eligibility-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...ruleFormData,
          effective_start: new Date(ruleFormData.effective_start).toISOString(),
          commission_rate_override: ruleFormData.commission_rate_override ? parseFloat(ruleFormData.commission_rate_override) : null
        })
      });

      if (response.ok) {
        await fetchEligibilityRules();
        setShowRuleForm(false);
        setRuleFormData({
          product_type: '',
          sales_channel: '',
          customer_segment: '',
          eligible: true,
          commission_rate_override: '',
          effective_start: ''
        });
        alert('Eligibility rule created!');
      } else {
        alert('Failed to create rule');
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      alert('Error creating rule');
    } finally {
      setLoading(false);
    }
  };

  const getPartnersByTier = (tier) => {
    return partners.filter(p => p.tier === tier && p.status !== 'rejected');
  };

  const getTierStats = () => {
    return {
      bronze: getPartnersByTier('bronze').length,
      silver: getPartnersByTier('silver').length,
      gold: getPartnersByTier('gold').length,
      platinum: getPartnersByTier('platinum').length
    };
  };

  const stats = getTierStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Vendor Tier Management</h1>
          <p className="text-slate-300">Manage partner tiers and commission eligibility matrix</p>
        </div>

        {/* Tier Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Object.entries(TIER_INFO).map(([tier, info]) => (
            <Card key={tier} className={`bg-gradient-to-br ${info.color} border-0`}>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-2">{info.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-1">{info.name}</h3>
                  <p className="text-3xl font-bold text-white mb-2">{stats[tier]}</p>
                  <p className="text-xs text-white/80">Partners</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="tiers" className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
            <TabsTrigger value="tiers" className="data-[state=active]:bg-blue-600">Tier Details</TabsTrigger>
            <TabsTrigger value="partners" className="data-[state=active]:bg-blue-600">Partner Management</TabsTrigger>
            <TabsTrigger value="eligibility" className="data-[state=active]:bg-blue-600">Eligibility Matrix</TabsTrigger>
          </TabsList>

          {/* Tier Details Tab */}
          <TabsContent value="tiers" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(TIER_INFO).map(([tier, info]) => (
                <Card key={tier} className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{info.icon}</div>
                      <div>
                        <CardTitle className="text-white text-2xl">{info.name} Tier</CardTitle>
                        <CardDescription className="text-slate-300">{info.requirements}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-white font-semibold mb-3">Benefits:</p>
                        <ul className="space-y-2">
                          {info.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-slate-300">
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Current Partners:</span>
                          <Badge className={`${info.badgeColor} text-white`}>
                            {stats[tier]} partners
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Partner Management Tab */}
          <TabsContent value="partners" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Partner Tier Assignments</CardTitle>
                <CardDescription className="text-slate-300">
                  View and manage partner tier assignments based on performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white">Company</TableHead>
                      <TableHead className="text-white">Contact</TableHead>
                      <TableHead className="text-white">Current Tier</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      {(user?.role === 'admin' || user?.role === 'finance') && (
                        <TableHead className="text-white">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.filter(p => p.status !== 'rejected').map(partner => (
                      <TableRow key={partner.id} className="border-white/10" data-testid="partner-tier-row">
                        <TableCell className="text-white font-medium">{partner.company_name}</TableCell>
                        <TableCell className="text-slate-300">{partner.contact_name}</TableCell>
                        <TableCell>
                          <Badge className={`${TIER_INFO[partner.tier].badgeColor} text-white`}>
                            {TIER_INFO[partner.tier].icon} {TIER_INFO[partner.tier].name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-white border-white/30">
                            {partner.status}
                          </Badge>
                        </TableCell>
                        {(user?.role === 'admin' || user?.role === 'finance') && (
                          <TableCell>
                            <Select
                              value={partner.tier}
                              onValueChange={(value) => handleUpdateTier(partner.id, value)}
                            >
                              <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bronze">Bronze</SelectItem>
                                <SelectItem value="silver">Silver</SelectItem>
                                <SelectItem value="gold">Gold</SelectItem>
                                <SelectItem value="platinum">Platinum</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Eligibility Matrix Tab */}
          <TabsContent value="eligibility" className="mt-6">
            {(user?.role === 'admin' || user?.role === 'finance') && (
              <div className="mb-6">
                <Button
                  onClick={() => setShowRuleForm(!showRuleForm)}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="create-rule-btn"
                >
                  {showRuleForm ? 'Cancel' : '+ Create Eligibility Rule'}
                </Button>
              </div>
            )}

            {showRuleForm && (
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
                <CardHeader>
                  <CardTitle className="text-white">Create Eligibility Rule</CardTitle>
                  <CardDescription className="text-slate-300">
                    Define commission eligibility based on product, channel, and segment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateRule} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-white">Product Type *</Label>
                        <Input
                          value={ruleFormData.product_type}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, product_type: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="e.g., Software, Hardware"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-white">Sales Channel *</Label>
                        <Input
                          value={ruleFormData.sales_channel}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, sales_channel: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="e.g., Direct, Partner"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-white">Customer Segment *</Label>
                        <Input
                          value={ruleFormData.customer_segment}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, customer_segment: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="e.g., Enterprise, SMB"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-white">Eligible *</Label>
                        <Select
                          value={ruleFormData.eligible.toString()}
                          onValueChange={(value) => setRuleFormData({ ...ruleFormData, eligible: value === 'true' })}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes (Eligible)</SelectItem>
                            <SelectItem value="false">No (Not Eligible)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-white">Commission Rate Override (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ruleFormData.commission_rate_override}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, commission_rate_override: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          placeholder="Leave empty for default"
                        />
                      </div>

                      <div>
                        <Label className="text-white">Effective Start Date *</Label>
                        <Input
                          type="date"
                          value={ruleFormData.effective_start}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, effective_start: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="submit-rule-btn"
                    >
                      {loading ? 'Creating...' : 'Create Eligibility Rule'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Commission Eligibility Matrix</CardTitle>
                <CardDescription className="text-slate-300">
                  Rules defining commission eligibility by product, channel, and segment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eligibilityRules.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-300">No eligibility rules defined yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white">Product Type</TableHead>
                        <TableHead className="text-white">Sales Channel</TableHead>
                        <TableHead className="text-white">Customer Segment</TableHead>
                        <TableHead className="text-white">Eligible</TableHead>
                        <TableHead className="text-white">Rate Override</TableHead>
                        <TableHead className="text-white">Effective Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eligibilityRules.map(rule => (
                        <TableRow key={rule.id} className="border-white/10" data-testid="eligibility-rule-row">
                          <TableCell className="text-white">{rule.product_type}</TableCell>
                          <TableCell className="text-slate-300">{rule.sales_channel}</TableCell>
                          <TableCell className="text-slate-300">{rule.customer_segment}</TableCell>
                          <TableCell>
                            {rule.eligible ? (
                              <CheckCircle className="h-5 w-5 text-green-400" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-400" />
                            )}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {rule.commission_rate_override ? `${rule.commission_rate_override}%` : '-'}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {new Date(rule.effective_start).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default VendorTiers;
