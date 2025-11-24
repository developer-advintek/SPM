import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const Partners = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'review', 'edit', 'view', 'deactivate'
  const [reviewComments, setReviewComments] = useState('');
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    filterPartners();
  }, [partners, searchTerm, filterStatus, filterTier]);

  const fetchPartners = async () => {
    try {
      const response = await axios.get(`${API}/partners/all`, { headers: getAuthHeaders() });
      setPartners(response.data);
    } catch (error) {
      console.error('Failed to fetch partners', error);
    }
  };

  const filterPartners = () => {
    let filtered = [...partners];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // Tier filter
    if (filterTier !== 'all') {
      filtered = filtered.filter(p => p.tier === filterTier);
    }

    setFilteredPartners(filtered);
  };

  const openDialog = (partner, type) => {
    setSelectedPartner(partner);
    setDialogType(type);
    if (type === 'edit') {
      setEditData({
        tier: partner.tier,
        status: partner.status,
        notes: partner.notes || ''
      });
    }
    setDialogOpen(true);
  };

  const handleApprove = async (partnerId) => {
    try {
      await axios.post(`${API}/partners/${partnerId}/approve`, 
        { comments: reviewComments },
        { headers: getAuthHeaders() }
      );
      toast.success('Partner approved and activated!');
      setDialogOpen(false);
      setReviewComments('');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to approve partner');
    }
  };

  const handleReject = async (partnerId) => {
    try {
      await axios.post(`${API}/partners/${partnerId}/reject`,
        { reason: reviewComments },
        { headers: getAuthHeaders() }
      );
      toast.success('Partner application rejected');
      setDialogOpen(false);
      setReviewComments('');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to reject partner');
    }
  };

  const handleUpdatePartner = async (partnerId) => {
    try {
      await axios.patch(`${API}/partners/${partnerId}`, editData, { headers: getAuthHeaders() });
      toast.success('Partner updated successfully');
      setDialogOpen(false);
      fetchPartners();
    } catch (error) {
      toast.error('Failed to update partner');
    }
  };

  const handleDeactivate = async (partnerId) => {
    try {
      await axios.post(`${API}/partners/${partnerId}/deactivate`, 
        { reason: reviewComments },
        { headers: getAuthHeaders() }
      );
      toast.success('Partner deactivated');
      setDialogOpen(false);
      setReviewComments('');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to deactivate partner');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending_review: { class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', label: 'Pending Review' },
      under_review: { class: 'bg-blue-500/20 text-blue-300 border-blue-500/40', label: 'Under Review' },
      approved: { class: 'bg-green-500/20 text-green-300 border-green-500/40', label: 'Active' },
      rejected: { class: 'bg-red-500/20 text-red-300 border-red-500/40', label: 'Rejected' },
      inactive: { class: 'bg-slate-500/20 text-slate-300 border-slate-500/40', label: 'Inactive' },
      more_info_needed: { class: 'bg-orange-500/20 text-orange-300 border-orange-500/40', label: 'More Info Needed' }
    };
    const item = config[status] || config.pending_review;
    return <Badge className={`${item.class} border`}>{item.label}</Badge>;
  };

  const getTierBadge = (tier) => {
    const config = {
      bronze: { class: 'bg-orange-700/30 text-orange-300 border-orange-600/40', icon: '🥉' },
      silver: { class: 'bg-slate-400/30 text-slate-200 border-slate-500/40', icon: '🥈' },
      gold: { class: 'bg-yellow-600/30 text-yellow-200 border-yellow-500/40', icon: '🥇' },
      platinum: { class: 'bg-purple-500/30 text-purple-200 border-purple-400/40', icon: '💎' }
    };
    const item = config[tier] || config.bronze;
    return <Badge className={`${item.class} border`}>{item.icon} {tier.toUpperCase()}</Badge>;
  };

  const isPartner = user?.role === 'partner';
  const isAdmin = user?.role === 'admin' || user?.role === 'finance' || user?.role === 'manager';

  // Partner self-service view
  if (isPartner) {
    const myPartner = partners.find(p => p.user_id === user.id);
    
    return (
      <div className="p-6 max-w-7xl mx-auto" data-testid="partner-self-service">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Partner Portal
        </h1>

        {myPartner ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payouts">My Payouts</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white text-lg font-bold">Partner Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-slate-400">Company</p>
                        <p className="font-semibold text-slate-100">{myPartner.company_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Tier</p>
                        {getTierBadge(myPartner.tier)}
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Status</p>
                        {getStatusBadge(myPartner.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-white text-lg font-bold">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Payouts</span>
                        <span className="font-semibold text-green-400">$0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Deals Closed</span>
                        <span className="font-semibold text-blue-400">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Commission Rate</span>
                        <span className="font-semibold text-purple-400">5%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-white text-lg font-bold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button className="w-full" variant="outline">Submit a Deal</Button>
                      <Button className="w-full" variant="outline">Upload Documents</Button>
                      <Button className="w-full" variant="outline">Contact Support</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payouts">
              <Card>
                <CardHeader>
                  <CardTitle className="text-white text-xl font-bold">Payout History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">No payouts yet</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle className="text-white text-xl font-bold">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">Performance data will appear here</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="text-white text-xl font-bold">My Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">Document management coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-slate-400">No partner profile found. Please contact support.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Admin view
  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="partners-admin">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Partners
          </h1>
          <p className="text-slate-400">Manage all partner relationships</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-slate-100 font-semibold mb-2">Search</Label>
              <Input
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border-white/30 text-white"
                data-testid="input-search"
              />
            </div>
            <div>
              <Label className="text-slate-100 font-semibold mb-2">Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 rounded-lg bg-white/10 border-white/30 text-white"
                data-testid="filter-status"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Active</option>
                <option value="rejected">Rejected</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-100 font-semibold mb-2">Tier</Label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full p-2 rounded-lg bg-white/10 border-white/30 text-white"
                data-testid="filter-tier"
              >
                <option value="all">All Tiers</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterTier('all');
                }}
                data-testid="btn-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-400">Total Partners</p>
                <p className="text-3xl font-bold text-blue-400">{partners.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                <span className="text-2xl">🤝</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-400">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-400">{partners.filter(p => p.status === 'pending_review').length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-400">Active Partners</p>
                <p className="text-3xl font-bold text-green-400">{partners.filter(p => p.status === 'approved').length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-400">Gold+ Tier</p>
                <p className="text-3xl font-bold text-purple-400">{partners.filter(p => ['gold', 'platinum'].includes(p.tier)).length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partners List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Partners ({filteredPartners.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending Approvals ({filteredPartners.filter(p => p.status === 'pending_review').length})</TabsTrigger>
          <TabsTrigger value="active">Active ({filteredPartners.filter(p => p.status === 'approved').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-4">
            {filteredPartners.map(partner => (
              <Card key={partner.id} className="hover:scale-[1.005]" data-testid={`partner-${partner.id}`}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold text-white">{partner.company_name}</h3>
                          <p className="text-slate-300">{partner.contact_name}</p>
                          <p className="text-sm text-slate-400">{partner.contact_email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {getStatusBadge(partner.status)}
                        {getTierBadge(partner.tier)}
                      </div>
                    </div>

                    <div className="text-sm space-y-1">
                      <p className="text-slate-400">Business Type:</p>
                      <p className="text-slate-200">{partner.business_type || 'N/A'}</p>
                      <p className="text-slate-400 mt-2">Years in Business:</p>
                      <p className="text-slate-200">{partner.years_in_business || 'N/A'}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {partner.status === 'pending_review' && (
                        <Button size="sm" onClick={() => openDialog(partner, 'review')} data-testid={`btn-review-${partner.id}`}>
                          Review Application
                        </Button>
                      )}
                      {partner.status === 'approved' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openDialog(partner, 'edit')} data-testid={`btn-edit-${partner.id}`}>
                            Edit Partner
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openDialog(partner, 'view')} data-testid={`btn-view-${partner.id}`}>
                            View Details
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openDialog(partner, 'deactivate')} data-testid={`btn-deactivate-${partner.id}`}>
                            Deactivate
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredPartners.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-slate-400">No partners found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <div className="space-y-4">
            {filteredPartners.filter(p => p.status === 'pending_review').map(partner => (
              <Card key={partner.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white">{partner.company_name}</h3>
                      <p className="text-slate-300">{partner.contact_email}</p>
                    </div>
                    <Button onClick={() => openDialog(partner, 'review')}>Review</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="space-y-4">
            {filteredPartners.filter(p => p.status === 'approved').map(partner => (
              <Card key={partner.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white">{partner.company_name}</h3>
                      <p className="text-slate-300">{partner.contact_email}</p>
                      <div className="mt-2">{getTierBadge(partner.tier)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => openDialog(partner, 'edit')}>Edit</Button>
                      <Button variant="outline" onClick={() => openDialog(partner, 'view')}>View</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">
              {dialogType === 'review' && 'Review Partner Application'}
              {dialogType === 'edit' && 'Edit Partner'}
              {dialogType === 'view' && 'Partner Details'}
              {dialogType === 'deactivate' && 'Deactivate Partner'}
            </DialogTitle>
          </DialogHeader>

          {selectedPartner && (
            <div className="space-y-4">
              {dialogType === 'review' && (
                <>
                  <div>
                    <p className="font-semibold text-white">Company: {selectedPartner.company_name}</p>
                    <p className="text-sm text-slate-300">{selectedPartner.contact_name} - {selectedPartner.contact_email}</p>
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Review Comments</Label>
                    <Textarea
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      className="bg-white/10 border-white/30 text-white"
                    />
                  </div>
                </>
              )}

              {dialogType === 'edit' && (
                <>
                  <div>
                    <Label className="text-slate-100 font-semibold">Tier</Label>
                    <select
                      value={editData.tier}
                      onChange={(e) => setEditData({ ...editData, tier: e.target.value })}
                      className="w-full p-2 rounded-lg bg-white/10 border-white/30 text-white mt-2"
                    >
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Status</Label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full p-2 rounded-lg bg-white/10 border-white/30 text-white mt-2"
                    >
                      <option value="approved">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-slate-100 font-semibold">Notes</Label>
                    <Textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      className="bg-white/10 border-white/30 text-white"
                    />
                  </div>
                </>
              )}

              {dialogType === 'deactivate' && (
                <div>
                  <Label className="text-slate-100 font-semibold">Reason for Deactivation</Label>
                  <Textarea
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    className="bg-white/10 border-white/30 text-white"
                    placeholder="Please provide a reason..."
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {dialogType === 'review' && (
              <>
                <Button variant="outline" onClick={() => selectedPartner && handleReject(selectedPartner.id)}>
                  Reject
                </Button>
                <Button onClick={() => selectedPartner && handleApprove(selectedPartner.id)}>
                  Approve
                </Button>
              </>
            )}
            {dialogType === 'edit' && (
              <Button onClick={() => selectedPartner && handleUpdatePartner(selectedPartner.id)}>
                Save Changes
              </Button>
            )}
            {dialogType === 'deactivate' && (
              <Button onClick={() => selectedPartner && handleDeactivate(selectedPartner.id)} className="bg-red-500">
                Confirm Deactivate
              </Button>
            )}
            {dialogType === 'view' && (
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
