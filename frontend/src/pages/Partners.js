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
import { Users, Award, CheckCircle, XCircle, Clock, Shield, Building, AlertCircle, TrendingUp } from 'lucide-react';

function Partners() {
  const { user, token } = useAuth();
  const [partners, setPartners] = useState([]);
  const [pendingPartners, setPendingPartners] = useState([]);
  const [eligibilityRules, setEligibilityRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  const [registerFormData, setRegisterFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    website: '',
    business_type: '',
    years_in_business: '',
    number_of_employees: '',
    expected_monthly_volume: '',
    business_license: '',
    tax_id: '',
    identity_proof: ''
  });

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
    fetchPendingPartners();
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

  const fetchPendingPartners = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingPartners(data.filter(p => p.status === 'pending_review' || p.status === 'more_info_needed'));
      }
    } catch (error) {
      console.error('Error fetching pending partners:', error);
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

  const handleRegisterPartner = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...registerFormData,
          user_id: user.id
        })
      });

      if (response.ok) {
        await fetchPartners();
        await fetchPendingPartners();
        setShowRegisterForm(false);
        alert('Partner registered successfully! Pending admin approval.');
      } else {
        alert('Failed to register partner');
      }
    } catch (error) {
      console.error('Error registering partner:', error);
      alert('Error registering partner');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePartner = async (partnerId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comments: 'Approved by admin' })
      });

      if (response.ok) {
        await fetchPartners();
        await fetchPendingPartners();
        alert('Partner approved successfully!');
      }
    } catch (error) {
      console.error('Error approving partner:', error);
    }
  };

  const handleRejectPartner = async (partnerId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await fetchPartners();
        await fetchPendingPartners();
        alert('Partner rejected');
      }
    } catch (error) {
      console.error('Error rejecting partner:', error);
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
      }
    } catch (error) {
      console.error('Error updating tier:', error);
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
      }
    } catch (error) {
      console.error('Error creating rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPartnersByTier = (tier) => partners.filter(p => p.tier === tier && p.status !== 'rejected');
  const getTierStats = () => ({
    bronze: getPartnersByTier('bronze').length,
    silver: getPartnersByTier('silver').length,
    gold: getPartnersByTier('gold').length,
    platinum: getPartnersByTier('platinum').length
  });

  const stats = getTierStats();
  const totalPartners = partners.filter(p => p.status !== 'rejected').length;
  const activePartners = partners.filter(p => p.status === 'active' || p.status === 'approved').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Partner Management Hub</h1>
          <p className="text-slate-300">Comprehensive partner, vendor tier, and eligibility management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Partners</p>
                  <p className="text-3xl font-bold text-white mt-2">{totalPartners}</p>
                </div>
                <Building className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Active</p>
                  <p className="text-3xl font-bold text-white mt-2">{activePartners}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Pending</p>
                  <p className="text-3xl font-bold text-white mt-2">{pendingPartners.length}</p>
                </div>
                <Clock className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Gold/Platinum</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.gold + stats.platinum}</p>
                </div>
                <Award className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-sm">Eligibility Rules</p>
                  <p className="text-3xl font-bold text-white mt-2">{eligibilityRules.length}</p>
                </div>
                <Shield className="h-12 w-12 text-pink-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="partners" className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
            <TabsTrigger value="partners" className="data-[state=active]:bg-blue-600">All Partners</TabsTrigger>
            {(user?.role === 'admin' || user?.role === 'finance') && (
              <TabsTrigger value="approvals" className="data-[state=active]:bg-blue-600">
                Pending Approvals ({pendingPartners.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="tiers" className="data-[state=active]:bg-blue-600">Tier Management</TabsTrigger>
            <TabsTrigger value="eligibility" className="data-[state=active]:bg-blue-600">Eligibility Matrix</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-blue-600">Register New Partner</TabsTrigger>
          </TabsList>

          {/* All Partners Tab */}
          <TabsContent value="partners" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Partner Directory</CardTitle>
                <CardDescription className="text-slate-300">View and manage all partners</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white">Company</TableHead>
                      <TableHead className="text-white">Contact</TableHead>
                      <TableHead className="text-white">Email</TableHead>
                      <TableHead className="text-white">Tier</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Progress</TableHead>
                      {(user?.role === 'admin' || user?.role === 'finance') && (
                        <TableHead className="text-white">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.filter(p => p.status !== 'rejected').map(partner => (
                      <TableRow key={partner.id} className="border-white/10" data-testid="partner-row">
                        <TableCell className="text-white font-medium">{partner.company_name}</TableCell>
                        <TableCell className="text-slate-300">{partner.contact_name}</TableCell>
                        <TableCell className="text-slate-300">{partner.contact_email}</TableCell>
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${partner.onboarding_progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-white">{partner.onboarding_progress}%</span>
                          </div>
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

          {/* Pending Approvals Tab */}
          <TabsContent value="approvals" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Pending Partner Approvals</CardTitle>
                <CardDescription className="text-slate-300">Review and approve partner applications</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingPartners.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-300">No pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingPartners.map(partner => (
                      <Card key={partner.id} className="bg-white/5 border-white/10">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-white mb-2">{partner.company_name}</h3>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-xs text-slate-400">Contact</p>
                                  <p className="text-white">{partner.contact_name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400">Email</p>
                                  <p className="text-white">{partner.contact_email}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400">Status</p>
                                  <Badge className="bg-orange-500">{partner.status}</Badge>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400">Submitted</p>
                                  <p className="text-white">{new Date(partner.submitted_at || partner.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              {partner.review_history && partner.review_history.length > 0 && (
                                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                                  <p className="text-xs text-slate-400 mb-2">Review History:</p>
                                  {partner.review_history.map((review, idx) => (
                                    <p key={idx} className="text-sm text-slate-300">
                                      {review.action} by {review.reviewer} - {review.comments}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                onClick={() => handleApprovePartner(partner.id)}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                                data-testid="approve-partner-btn"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleRejectPartner(partner.id)}
                                className="bg-red-600 hover:bg-red-700"
                                size="sm"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tier Management Tab */}
          <TabsContent value="tiers" className="mt-6">
            <div className="space-y-6">
              {/* Tier Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

              {/* Tier Details */}
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
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
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Sales Channel *</Label>
                        <Input
                          value={ruleFormData.sales_channel}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, sales_channel: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Customer Segment *</Label>
                        <Input
                          value={ruleFormData.customer_segment}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, customer_segment: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Eligible</Label>
                        <Select
                          value={ruleFormData.eligible.toString()}
                          onValueChange={(value) => setRuleFormData({ ...ruleFormData, eligible: value === 'true' })}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white">Rate Override (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ruleFormData.commission_rate_override}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, commission_rate_override: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Effective Date *</Label>
                        <Input
                          type="date"
                          value={ruleFormData.effective_start}
                          onChange={(e) => setRuleFormData({ ...ruleFormData, effective_start: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                      {loading ? 'Creating...' : 'Create Rule'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Commission Eligibility Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                {eligibilityRules.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-300">No eligibility rules defined</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white">Product Type</TableHead>
                        <TableHead className="text-white">Sales Channel</TableHead>
                        <TableHead className="text-white">Segment</TableHead>
                        <TableHead className="text-white">Eligible</TableHead>
                        <TableHead className="text-white">Rate Override</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eligibilityRules.map(rule => (
                        <TableRow key={rule.id} className="border-white/10">
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register New Partner Tab */}
          <TabsContent value="register" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Register New Partner</CardTitle>
                <CardDescription className="text-slate-300">Submit a new partner application</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterPartner} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-white">Company Name *</Label>
                      <Input
                        value={registerFormData.company_name}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, company_name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Contact Name *</Label>
                      <Input
                        value={registerFormData.contact_name}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, contact_name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Contact Email *</Label>
                      <Input
                        type="email"
                        value={registerFormData.contact_email}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, contact_email: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Phone</Label>
                      <Input
                        value={registerFormData.phone}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, phone: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Website</Label>
                      <Input
                        value={registerFormData.website}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, website: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Business Type</Label>
                      <Input
                        value={registerFormData.business_type}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, business_type: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Years in Business</Label>
                      <Input
                        type="number"
                        value={registerFormData.years_in_business}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, years_in_business: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Number of Employees</Label>
                      <Input
                        type="number"
                        value={registerFormData.number_of_employees}
                        onChange={(e) => setRegisterFormData({ ...registerFormData, number_of_employees: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    data-testid="register-partner-btn"
                  >
                    {loading ? 'Registering...' : 'Register Partner'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Partners;
