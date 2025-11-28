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
import DocumentUploadSection, { DOCUMENT_TYPES } from '../components/DocumentUploadSection';
import { 
  Users, Award, CheckCircle, XCircle, Clock, Shield, Building, 
  AlertCircle, TrendingUp, Upload, FileText, Eye, MessageSquare,
  Pause, Send, RefreshCw, DollarSign
} from 'lucide-react';

function PartnerHubComplete() {
  const { user, token } = useAuth();
  const [partners, setPartners] = useState([]);
  const [l1Queue, setL1Queue] = useState([]);
  const [l2Queue, setL2Queue] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('directory');
  
  // Form states
  const [onboardingForm, setOnboardingForm] = useState({
    company_name: '',
    business_type: '',
    tax_id: '',
    years_in_business: '',
    number_of_employees: '',
    expected_monthly_volume: '',
    business_address: '',
    website: '',
    contact_person_name: '',
    contact_person_email: '',
    contact_person_phone: '',
    contact_person_designation: '',
    documents: [] // Documents to upload during registration
  });

  const [documentUpload, setDocumentUpload] = useState({
    document_type: '',
    document_name: '',
    document_data: '',
    file_size: 0
  });

  const [productAssignment, setProductAssignment] = useState({
    products: [],
    payout_period: 'monthly'
  });

  const [noteForm, setNoteForm] = useState({
    note: '',
    visibility: 'internal'
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  const TIER_INFO = {
    bronze: { name: 'Bronze', icon: '🥉', color: 'bg-orange-600' },
    silver: { name: 'Silver', icon: '🥈', color: 'bg-gray-500' },
    gold: { name: 'Gold', icon: '🥇', color: 'bg-yellow-600' },
    platinum: { name: 'Platinum', icon: '💎', color: 'bg-purple-600' },
    null: { name: 'Not Assigned', icon: '⏳', color: 'bg-gray-400' },
    undefined: { name: 'Not Assigned', icon: '⏳', color: 'bg-gray-400' }
  };
  
  const getTierInfo = (tier) => {
    return TIER_INFO[tier] || TIER_INFO.null;
  };

  const PAYOUT_PERIODS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semi_annually', label: 'Semi-Annually' },
    { value: 'yearly', label: 'Yearly' }
  ];

  const canManagePartners = () => ['admin', 'partner_manager'].includes(user?.role);
  const canApproveL1 = () => ['admin', 'l1_approver'].includes(user?.role);
  const canApproveL2 = () => ['admin', 'l2_approver'].includes(user?.role);
  const isPartner = () => user?.role === 'partner';

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchPartners(),
      fetchL1Queue(),
      fetchL2Queue(),
      fetchRejected(),
      fetchProducts()
    ]);
  };

  const fetchPartners = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/directory`, {
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

  const fetchRejected = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/rejected`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRejected(data);
      }
    } catch (error) {
      console.error('Error fetching rejected partners:', error);
    }
  };

  const fetchL1Queue = async () => {
    if (!canApproveL1()) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/l1-queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setL1Queue(data);
      }
    } catch (error) {
      console.error('Error fetching L1 queue:', error);
    }
  };

  const fetchL2Queue = async () => {
    if (!canApproveL2()) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/l2-queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setL2Queue(data);
      }
    } catch (error) {
      console.error('Error fetching L2 queue:', error);
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

  // ============= ONBOARDING =============

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const endpoint = isPartner() ? 
        `${BACKEND_URL}/api/partners/self-register` : 
        `${BACKEND_URL}/api/partners/create`;
      
      // Payload with documents
      const payload = {
        ...onboardingForm,
        documents: (onboardingForm.documents || []).map(doc => ({
          document_type: doc.document_type,
          document_name: doc.document_name,
          document_data: doc.document_data
        }))
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchAllData();
        setOnboardingForm({
          company_name: '',
          business_type: '',
          tax_id: '',
          years_in_business: '',
          number_of_employees: '',
          expected_monthly_volume: '',
          business_address: '',
          website: '',
          contact_person_name: '',
          contact_person_email: '',
          contact_person_phone: '',
          contact_person_designation: '',
          documents: []
        });
        setActiveTab('directory');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      alert('Error submitting application');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentUpload({
          ...documentUpload,
          document_name: file.name,
          document_data: reader.result.split(',')[1],
          file_size: file.size
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Document upload functionality is now handled by DocumentUploadSection component

  const handleUploadDocument = async (partnerId) => {
    if (!documentUpload.document_type || !documentUpload.document_data) {
      alert('Please select document type and file');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/upload-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(documentUpload)
      });

      if (response.ok) {
        alert('Document uploaded successfully!');
        setDocumentUpload({ document_type: '', document_name: '', document_data: '', file_size: 0 });
        fetchAllData();
        if (selectedPartner) {
          await fetchPartnerDetails(selectedPartner.id);
        }
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document');
    } finally {
      setLoading(false);
    }
  };

  // ============= REVIEW & TIER ASSIGNMENT =============

  const handleReviewAndAssignTier = async (partnerId, tier) => {
    if (!tier) {
      alert('Please select a tier');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tier })
      });

      if (response.ok) {
        alert('Partner reviewed and tier assigned!');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error reviewing partner:', error);
      alert('Error reviewing partner');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToL1 = async (partnerId) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/send-to-l1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Partner sent to L1 approval queue!');
        fetchAllData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to send to L1');
      }
    } catch (error) {
      console.error('Error sending to L1:', error);
      alert('Error sending to L1');
    } finally {
      setLoading(false);
    }
  };

  // ============= L1 APPROVAL =============

  const handleApproveL1 = async (partnerId) => {
    const comments = prompt('Enter approval comments (optional):');
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/l1-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comments: comments || '' })
      });

      if (response.ok) {
        alert('Level 1 approval completed!');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error approving L1:', error);
      alert('Error approving L1');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectL1 = async (partnerId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    const comments = prompt('Additional comments (optional):');
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/l1-reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason, comments: comments || '' })
      });

      if (response.ok) {
        alert('Application rejected at Level 1');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error rejecting L1:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============= L2 APPROVAL =============

  const handleApproveL2 = async (partnerId) => {
    const comments = prompt('Enter approval comments (optional):');
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/l2-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comments: comments || '' })
      });

      if (response.ok) {
        alert('Level 2 approval completed! Partner fully approved.');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error approving L2:', error);
      alert('Error approving L2');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectL2 = async (partnerId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    const comments = prompt('Additional comments (optional):');
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/l2-reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason, comments: comments || '' })
      });

      if (response.ok) {
        alert('Application rejected at Level 2');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error rejecting L2:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============= ADMIN/PM ACTIONS =============

  const handlePutOnHold = async (partnerId) => {
    const reason = prompt('Enter hold reason:');
    if (!reason) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/put-on-hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('Partner put on hold');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error putting on hold:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBackToPartner = async (partnerId) => {
    const message = prompt('Enter feedback message for partner:');
    if (!message) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/send-back-to-partner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        alert('Feedback sent to partner');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPermanently = async (partnerId) => {
    const reason = prompt('Enter permanent rejection reason:');
    if (!reason) return;

    if (!confirm('Are you sure you want to permanently reject this partner?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/reject-permanently`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('Partner permanently rejected');
        fetchAllData();
      }
    } catch (error) {
      console.error('Error rejecting partner:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============= PRODUCT & COMMISSION ASSIGNMENT =============

  const toggleProductSelection = (productId, customMargin = 0) => {
    setProductAssignment(prev => {
      const existing = prev.products.find(p => p.product_id === productId);
      if (existing) {
        return {
          ...prev,
          products: prev.products.filter(p => p.product_id !== productId)
        };
      } else {
        return {
          ...prev,
          products: [...prev.products, { product_id: productId, custom_margin: customMargin }]
        };
      }
    });
  };

  const updateProductMargin = (productId, margin) => {
    setProductAssignment(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.product_id === productId ? { ...p, custom_margin: parseFloat(margin) || 0 } : p
      )
    }));
  };

  const handleAssignProductsCommission = async (partnerId) => {
    if (productAssignment.products.length === 0) {
      alert('Please select at least one product');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/assign-products-commission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(productAssignment)
      });

      if (response.ok) {
        alert('Products and commission assigned successfully!');
        fetchAllData();
        setProductAssignment({ products: [], payout_period: 'monthly' });
        setSelectedPartner(null);
      }
    } catch (error) {
      console.error('Error assigning products:', error);
      alert('Error assigning products');
    } finally {
      setLoading(false);
    }
  };

  // ============= NOTES =============

  const handleAddNote = async (partnerId) => {
    if (!noteForm.note) {
      alert('Please enter a note');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/add-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(noteForm)
      });

      if (response.ok) {
        alert('Note added successfully!');
        setNoteForm({ note: '', visibility: 'internal' });
        if (selectedPartner) {
          await fetchPartnerDetails(selectedPartner.id);
        }
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error adding note');
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async (partnerId) => {
    if (!window.confirm('Resubmit this partner for approval? Make sure you have made necessary corrections.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/resubmit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        alert('Partner resubmitted successfully! Sent to L1 approval queue.');
        await fetchAllData();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to resubmit partner');
      }
    } catch (error) {
      console.error('Error resubmitting:', error);
      alert('Error resubmitting partner');
    } finally {
      setLoading(false);
    }
  };

  // ============= PORTAL =============

  const fetchPartnerDetails = async (partnerId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/portal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedPartner(data.partner);
      }
    } catch (error) {
      console.error('Error fetching partner details:', error);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      draft: 'bg-gray-500',
      pending_review: 'bg-yellow-500',
      pending_l1: 'bg-orange-500',
      pending_l2: 'bg-blue-500',
      approved: 'bg-green-500',
      on_hold: 'bg-purple-500',
      rejected: 'bg-red-500',
      more_info_needed: 'bg-pink-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  // Stats
  const stats = {
    total: partners.length,
    approved: partners.filter(p => p.status === 'approved').length,
    l1Queue: l1Queue.length,
    l2Queue: l2Queue.length,
    rejected: rejected.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Partner Hub</h1>
          <p className="text-slate-300">Comprehensive telecom partner onboarding and management system</p>
          <p className="text-xs text-slate-400 mt-1">Logged in as: {user?.full_name} ({user?.role})</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
            <CardContent className="p-4">
              <p className="text-blue-100 text-xs">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardContent className="p-4">
              <p className="text-green-100 text-xs">Approved</p>
              <p className="text-2xl font-bold text-white">{stats.approved}</p>
            </CardContent>
          </Card>
          {canManagePartners() && (
            <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 border-0">
              <CardContent className="p-4">
                <p className="text-yellow-100 text-xs">Review</p>
                <p className="text-2xl font-bold text-white">{stats.pendingReview}</p>
              </CardContent>
            </Card>
          )}
          {canApproveL1() && (
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
              <CardContent className="p-4">
                <p className="text-orange-100 text-xs">L1 Queue</p>
                <p className="text-2xl font-bold text-white">{stats.l1Queue}</p>
              </CardContent>
            </Card>
          )}
          {canApproveL2() && (
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
              <CardContent className="p-4">
                <p className="text-purple-100 text-xs">L2 Queue</p>
                <p className="text-2xl font-bold text-white">{stats.l2Queue}</p>
              </CardContent>
            </Card>
          )}
          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 border-0">
            <CardContent className="p-4">
              <p className="text-pink-100 text-xs">On Hold</p>
              <p className="text-2xl font-bold text-white">{stats.onHold}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20 flex-wrap">
            <TabsTrigger value="directory" className="data-[state=active]:bg-blue-600">Directory</TabsTrigger>
            <TabsTrigger value="onboarding" className="data-[state=active]:bg-blue-600">
              {isPartner() ? 'Register' : 'Create Partner'}
            </TabsTrigger>
            {canApproveL1() && (
              <TabsTrigger value="l1" className="data-[state=active]:bg-orange-600">
                L1 Queue ({stats.l1Queue})
              </TabsTrigger>
            )}
            {canApproveL2() && (
              <TabsTrigger value="l2" className="data-[state=active]:bg-purple-600">
                L2 Queue ({stats.l2Queue})
              </TabsTrigger>
            )}
            {(canManagePartners() || isPartner()) && (
              <TabsTrigger value="rejected" className="data-[state=active]:bg-red-600">
                Rejected ({stats.rejected})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Partner Directory Tab */}
          <TabsContent value="directory" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Partner Directory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white">Company</TableHead>
                        <TableHead className="text-white">Contact</TableHead>
                        <TableHead className="text-white">Email</TableHead>
                        <TableHead className="text-white">Tier</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                        <TableHead className="text-white">Progress</TableHead>
                        <TableHead className="text-white">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partners.map(partner => (
                        <TableRow key={partner.id} className="border-white/10">
                          <TableCell className="text-white font-medium">{partner.company_name}</TableCell>
                          <TableCell className="text-slate-300">{partner.contact_person_name}</TableCell>
                          <TableCell className="text-slate-300 text-sm">{partner.contact_person_email}</TableCell>
                          <TableCell>
                            {partner.tier ? (
                              <Badge className={`${getTierInfo(partner.tier).color} text-white`}>
                                {getTierInfo(partner.tier).icon} {getTierInfo(partner.tier).name}
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500 text-white">No Tier</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadgeColor(partner.status)} text-white`}>
                              {partner.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500"
                                  style={{ width: `${partner.onboarding_progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-white">{partner.onboarding_progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => {
                                fetchPartnerDetails(partner.id);
                              }}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partner Onboarding Tab */}
          <TabsContent value="onboarding" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">
                  {isPartner() ? 'Partner Self-Registration' : 'Create New Partner'}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  {isPartner() ? 'Submit your application for partner onboarding' : 'Create a partner with tier assignment'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOnboardingSubmit} className="space-y-6">
                  {/* Company Details */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Company Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Company Name *</Label>
                        <Input
                          value={onboardingForm.company_name}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, company_name: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Business Type</Label>
                        <Input
                          value={onboardingForm.business_type}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, business_type: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Tax ID</Label>
                        <Input
                          value={onboardingForm.tax_id}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, tax_id: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Years in Business</Label>
                        <Input
                          type="number"
                          value={onboardingForm.years_in_business}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, years_in_business: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Number of Employees</Label>
                        <Input
                          type="number"
                          value={onboardingForm.number_of_employees}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, number_of_employees: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Expected Monthly Volume</Label>
                        <Input
                          value={onboardingForm.expected_monthly_volume}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, expected_monthly_volume: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Website</Label>
                        <Input
                          value={onboardingForm.website}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, website: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-white">Business Address</Label>
                        <Textarea
                          value={onboardingForm.business_address}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, business_address: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Person Details */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Contact Person Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Contact Person Name *</Label>
                        <Input
                          value={onboardingForm.contact_person_name}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, contact_person_name: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Contact Email *</Label>
                        <Input
                          type="email"
                          value={onboardingForm.contact_person_email}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, contact_person_email: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Contact Phone</Label>
                        <Input
                          value={onboardingForm.contact_person_phone}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, contact_person_phone: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Designation</Label>
                        <Input
                          value={onboardingForm.contact_person_designation}
                          onChange={(e) => setOnboardingForm({ ...onboardingForm, contact_person_designation: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <DocumentUploadSection
                    documents={onboardingForm.documents || []}
                    onDocumentsChange={(docs) => setOnboardingForm({ ...onboardingForm, documents: docs })}
                  />

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Submitting...' : isPartner() ? 'Submit Application' : 'Create Partner'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REMOVED: Review tab - partners now go directly to L1 queue */}
            
          {/* Rejected Tab */}
          {(canManagePartners() || isPartner()) && (
            <TabsContent value="rejected" className="mt-6">
                <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Rejected Partners</CardTitle>
                    <CardDescription className="text-slate-300">
                      Partners rejected during L1 or L2 approval - can be resubmitted after corrections
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rejected.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-300">No rejected partners</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {rejected.map(partner => (
                          <Card key={partner.id} className="bg-red-900/20 border-red-500/30">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-xl font-semibold text-white">{partner.company_name}</h3>
                                    <Badge className="bg-red-600">
                                      Rejected at {partner.rejected_level}
                                    </Badge>
                                  </div>
                                  
                                  <div className="bg-red-500/20 border border-red-500/30 rounded p-3 mb-4">
                                    <p className="text-xs text-red-300 mb-1">Rejection Reason:</p>
                                    <p className="text-white">{partner.rejection_reason}</p>
                                    <p className="text-xs text-slate-400 mt-2">
                                      Rejected by: {partner.rejected_by_name} on {new Date(partner.rejected_at).toLocaleDateString()}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                      <p className="text-xs text-slate-400">Contact</p>
                                      <p className="text-white">{partner.contact_person_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Email</p>
                                      <p className="text-white text-sm">{partner.contact_person_email}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Tier</p>
                                      {partner.tier ? (
                                        <Badge className={`${getTierInfo(partner.tier).color}`}>
                                          {getTierInfo(partner.tier).icon} {getTierInfo(partner.tier).name}
                                        </Badge>
                                      ) : (
                                        <p className="text-slate-400">Not Assigned</p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-400">Rejection Count</p>
                                      <p className="text-white">{partner.rejection_count || 1}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 mt-4">
                                    <Button
                                      onClick={() => fetchPartnerDetails(partner.id)}
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View & Edit
                                    </Button>
                                    <Button
                                      onClick={() => handleResubmit(partner.id)}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Resubmit for Approval
                                    </Button>
                                  </div>
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
            )}

            {/* OLD REVIEW TAB - COMMENTED OUT
            <TabsContent value="review" className="mt-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Pending Review</CardTitle>
                  <CardDescription className="text-slate-300">
                    Self-registered partners waiting for tier assignment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingReview.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300">No pending reviews</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingReview.map(partner => (
                        <Card key={partner.id} className="bg-white/5 border-white/10">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-3">{partner.company_name}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <p className="text-xs text-slate-400">Contact Person</p>
                                    <p className="text-white">{partner.contact_person_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">Email</p>
                                    <p className="text-white text-sm">{partner.contact_person_email}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">Business Type</p>
                                    <p className="text-white">{partner.business_type || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">Documents</p>
                                    <p className="text-white">{partner.documents?.length || 0} uploaded</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 mt-4">
                                  <Select onValueChange={(value) => handleReviewAndAssignTier(partner.id, value)}>
                                    <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                                      <SelectValue placeholder="Assign Tier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="bronze">Bronze</SelectItem>
                                      <SelectItem value="silver">Silver</SelectItem>
                                      <SelectItem value="gold">Gold</SelectItem>
                                      <SelectItem value="platinum">Platinum</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    onClick={() => fetchPartnerDetails(partner.id)}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent> */}

          {/* L1 Queue Tab */}
          {canApproveL1() && (
            <TabsContent value="l1" className="mt-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Level 1 Approval Queue</CardTitle>
                  <CardDescription className="text-slate-300">
                    Review and approve partner applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {l1Queue.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300">No pending L1 approvals</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {l1Queue.map(partner => (
                        <Card key={partner.id} className="bg-white/5 border-white/10">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-3">{partner.company_name}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                  <div>
                                    <p className="text-xs text-slate-400">Contact</p>
                                    <p className="text-white">{partner.contact_person_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">Email</p>
                                    <p className="text-white text-sm">{partner.contact_person_email}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">Tier</p>
                                    <Badge className={`${getTierInfo(partner.tier).color}`}>
                                      {getTierInfo(partner.tier).icon} {getTierInfo(partner.tier).name}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">Documents</p>
                                    <p className="text-white">{partner.documents?.length || 0} files</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  onClick={() => fetchPartnerDetails(partner.id)}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleApproveL1(partner.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                  disabled={loading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleRejectL1(partner.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  size="sm"
                                  disabled={loading}
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
          )}

          {/* L2 Queue Tab */}
          {canApproveL2() && (
            <TabsContent value="l2" className="mt-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Level 2 Approval Queue</CardTitle>
                  <CardDescription className="text-slate-300">
                    Final approval for partner applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {l2Queue.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300">No pending L2 approvals</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {l2Queue.map(partner => (
                        <Card key={partner.id} className="bg-white/5 border-white/10">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-3">{partner.company_name}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                  <div>
                                    <p className="text-xs text-slate-400">Contact</p>
                                    <p className="text-white">{partner.contact_person_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">Tier</p>
                                    <Badge className={`${getTierInfo(partner.tier).color}`}>
                                      {getTierInfo(partner.tier).icon} {getTierInfo(partner.tier).name}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">L1 Status</p>
                                    <p className="text-green-400 font-semibold">✓ Approved</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">L1 Date</p>
                                    <p className="text-white text-sm">
                                      {partner.l1_approved_at ? new Date(partner.l1_approved_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                  </div>
                                </div>

                                {partner.approval_workflow?.filter(s => s.level === 1 && s.status === 'approved').length > 0 && (
                                  <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                                    <p className="text-xs text-green-400 mb-1">L1 Approval Comments:</p>
                                    {partner.approval_workflow.filter(s => s.level === 1).map((step, idx) => (
                                      <p key={idx} className="text-sm text-slate-300">
                                        {step.comments || 'No comments'} - by {step.approver_name}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  onClick={() => fetchPartnerDetails(partner.id)}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleApproveL2(partner.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                  disabled={loading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleRejectL2(partner.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  size="sm"
                                  disabled={loading}
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
          )}
        </Tabs>

        {/* Partner Detail Modal - Full Screen */}
        {selectedPartner && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="bg-slate-900 border-white/20 w-full max-w-7xl h-[95vh] flex flex-col">
              <CardHeader className="border-b border-white/10 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-3xl font-bold">{selectedPartner.company_name}</CardTitle>
                    <div className="flex gap-2 mt-3">
                      {selectedPartner.tier && (
                        <Badge className={`${getTierInfo(selectedPartner.tier).color} text-base px-3 py-1`}>
                          {getTierInfo(selectedPartner.tier).icon} {getTierInfo(selectedPartner.tier).name}
                        </Badge>
                      )}
                      <Badge className={`${getStatusBadgeColor(selectedPartner.status)} text-base px-3 py-1`}>
                        {selectedPartner.status}
                      </Badge>
                      <Badge className="bg-blue-600 text-base px-3 py-1">
                        {selectedPartner.onboarding_progress}% Complete
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedPartner(null)}
                    className="bg-red-600 hover:bg-red-700 text-lg px-6"
                    size="lg"
                  >
                    ✕ Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* Company & Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                      <Building className="h-6 w-6" />
                      Company Details
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div><span className="text-slate-400">Tax ID:</span> <span className="text-white">{selectedPartner.tax_id || 'N/A'}</span></div>
                      <div><span className="text-slate-400">Business Type:</span> <span className="text-white">{selectedPartner.business_type || 'N/A'}</span></div>
                      <div><span className="text-slate-400">Years in Business:</span> <span className="text-white">{selectedPartner.years_in_business || 'N/A'}</span></div>
                      <div><span className="text-slate-400">Employees:</span> <span className="text-white">{selectedPartner.number_of_employees || 'N/A'}</span></div>
                      <div><span className="text-slate-400">Monthly Volume:</span> <span className="text-white">{selectedPartner.expected_monthly_volume || 'N/A'}</span></div>
                      <div><span className="text-slate-400">Address:</span> <span className="text-white">{selectedPartner.business_address || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Contact Person
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-slate-400">Name:</span> <span className="text-white">{selectedPartner.contact_person_name}</span></div>
                      <div><span className="text-slate-400">Email:</span> <span className="text-white">{selectedPartner.contact_person_email}</span></div>
                      <div><span className="text-slate-400">Phone:</span> <span className="text-white">{selectedPartner.contact_person_phone || 'N/A'}</span></div>
                      <div><span className="text-slate-400">Designation:</span> <span className="text-white">{selectedPartner.contact_person_designation || 'N/A'}</span></div>
                    </div>
                  </div>
                </div>

                {/* Documents with View/Download */}
                <div>
                  <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Documents ({Array.isArray(selectedPartner.documents) ? selectedPartner.documents.length : 0})
                  </h3>
                  {Array.isArray(selectedPartner.documents) && selectedPartner.documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedPartner.documents.map((doc, idx) => (
                        <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5 text-blue-400" />
                                <p className="text-white font-semibold">
                                  {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                                </p>
                              </div>
                              <p className="text-slate-300 text-sm mb-1">{doc.document_name}</p>
                              <p className="text-slate-400 text-xs">
                                Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                              {doc.verified && (
                                <div className="mt-2">
                                  <Badge className="bg-green-600 text-xs">✓ Verified</Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                onClick={() => {
                                  try {
                                    // Open document in new tab
                                    const base64Data = doc.document_data;
                                    
                                    // Determine MIME type from file extension
                                    const extension = doc.document_name.split('.').pop().toLowerCase();
                                    let mimeType = 'application/octet-stream';
                                    
                                    if (['pdf'].includes(extension)) {
                                      mimeType = 'application/pdf';
                                    } else if (['jpg', 'jpeg'].includes(extension)) {
                                      mimeType = 'image/jpeg';
                                    } else if (['png'].includes(extension)) {
                                      mimeType = 'image/png';
                                    } else if (['gif'].includes(extension)) {
                                      mimeType = 'image/gif';
                                    } else if (['webp'].includes(extension)) {
                                      mimeType = 'image/webp';
                                    } else if (['doc', 'docx'].includes(extension)) {
                                      mimeType = 'application/msword';
                                    }
                                    
                                    const byteCharacters = atob(base64Data);
                                    const byteNumbers = new Array(byteCharacters.length);
                                    for (let i = 0; i < byteCharacters.length; i++) {
                                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                                    }
                                    const byteArray = new Uint8Array(byteNumbers);
                                    const blob = new Blob([byteArray], { type: mimeType });
                                    const url = URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                  } catch (error) {
                                    console.error('Error viewing document:', error);
                                    alert('Failed to open document. Please try downloading instead.');
                                  }
                                }}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                onClick={() => {
                                  try {
                                    // Download document
                                    const base64Data = doc.document_data;
                                    const byteCharacters = atob(base64Data);
                                    const byteNumbers = new Array(byteCharacters.length);
                                    for (let i = 0; i < byteCharacters.length; i++) {
                                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                                    }
                                    const byteArray = new Uint8Array(byteNumbers);
                                    const blob = new Blob([byteArray]);
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = doc.document_name;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error('Error downloading document:', error);
                                    alert('Failed to download document.');
                                  }
                                }}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-xs"
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                      <FileText className="h-12 w-12 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400">No documents uploaded</p>
                    </div>
                  )}
                </div>
                  
                {/* Upload Document */}
                  {(canManagePartners() || selectedPartner.user_id === user?.id) && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <h4 className="text-white font-medium mb-3">Upload New Document</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Select
                          value={documentUpload.document_type}
                          onValueChange={(value) => setDocumentUpload({ ...documentUpload, document_type: value })}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Document Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="file"
                          onChange={handleFileUpload}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Button
                          onClick={() => handleUploadDocument(selectedPartner.id)}
                          disabled={loading || !documentUpload.document_type || !documentUpload.document_data}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  )}

                {/* Approval Workflow */}
                {Array.isArray(selectedPartner.approval_workflow) && selectedPartner.approval_workflow.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Approval Workflow
                    </h3>
                    <div className="space-y-3">
                      {selectedPartner.approval_workflow.map((step, idx) => (
                        <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">Level {step.level}</p>
                              <p className="text-sm text-slate-400">
                                {step.approver_name || 'Pending'} - {step.comments || 'No comments'}
                              </p>
                              {step.rejection_reason && (
                                <p className="text-sm text-red-400 mt-1">Reason: {step.rejection_reason}</p>
                              )}
                            </div>
                            <Badge className={
                              step.status === 'approved' ? 'bg-green-600' :
                              step.status === 'rejected' ? 'bg-red-600' : 'bg-orange-600'
                            }>
                              {step.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin/PM Actions */}
                {canManagePartners() && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Management Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPartner.status === 'draft' && (
                        <Button
                          onClick={() => handleSendToL1(selectedPartner.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={loading}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send to L1
                        </Button>
                      )}
                      {['pending_l1', 'pending_l2', 'draft'].includes(selectedPartner.status) && (
                        <Button
                          onClick={() => handlePutOnHold(selectedPartner.id)}
                          className="bg-purple-600 hover:bg-purple-700"
                          disabled={loading}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Put on Hold
                        </Button>
                      )}
                      {selectedPartner.created_by_role === 'partner' && (
                        <Button
                          onClick={() => handleSendBackToPartner(selectedPartner.id)}
                          className="bg-yellow-600 hover:bg-yellow-700"
                          disabled={loading}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Send Back to Partner
                        </Button>
                      )}
                      <Button
                        onClick={() => handleRejectPermanently(selectedPartner.id)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={loading}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Permanently
                      </Button>
                    </div>
                  </div>
                )}

                {/* Product Assignment (for approved partners) */}
                {selectedPartner.status === 'approved' && canManagePartners() && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Product & Commission Assignment
                    </h3>
                    
                    {/* Current Assignments */}
                    {Array.isArray(selectedPartner.assigned_products) && selectedPartner.assigned_products.length > 0 && (
                      <div className="mb-4 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                        <p className="text-green-400 font-medium mb-2">Currently Assigned:</p>
                        <div className="space-y-1">
                          {selectedPartner.assigned_products.map((pc, idx) => (
                            <div key={idx} className="text-sm text-white">
                              {pc.product_name}: {pc.final_rate}% 
                              {pc.custom_margin && ` (Base: ${pc.base_commission_rate}% + Custom: ${pc.custom_margin}%)`}
                            </div>
                          ))}
                        </div>
                        <p className="text-white text-sm mt-2">Payout Period: <span className="font-medium">{selectedPartner.payout_period}</span></p>
                      </div>
                    )}

                    {/* New Assignment Form */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white mb-2 block">Select Products & Set Custom Margins</Label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {products.map(product => (
                            <div key={product.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                              <input
                                type="checkbox"
                                checked={productAssignment.products.some(p => p.product_id === product.id)}
                                onChange={() => toggleProductSelection(product.id)}
                                className="w-4 h-4"
                              />
                              <div className="flex-1">
                                <p className="text-white font-medium">{product.name}</p>
                                <p className="text-xs text-slate-400">Base Rate: {product.base_commission_rate}%</p>
                              </div>
                              {productAssignment.products.some(p => p.product_id === product.id) && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-white text-xs">Custom Margin %:</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="0"
                                    className="w-20 bg-white/10 border-white/20 text-white"
                                    onChange={(e) => updateProductMargin(product.id, e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-white">Payout Period</Label>
                        <Select
                          value={productAssignment.payout_period}
                          onValueChange={(value) => setProductAssignment({ ...productAssignment, payout_period: value })}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYOUT_PERIODS.map(period => (
                              <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={() => handleAssignProductsCommission(selectedPartner.id)}
                        disabled={loading || productAssignment.products.length === 0}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {loading ? 'Assigning...' : 'Assign Products & Commission'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes & Communication */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Notes & Communication
                  </h3>
                  
                  {/* Existing Notes */}
                  {Array.isArray(selectedPartner.notes) && selectedPartner.notes.length > 0 && (
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                      {selectedPartner.notes.map((note, idx) => (
                        <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-white font-medium text-sm">{note.created_by_name}</p>
                            <div className="flex gap-2">
                              <Badge className={note.visibility === 'partner_visible' ? 'bg-blue-600' : 'bg-gray-600'}>
                                {note.visibility}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {new Date(note.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-300 text-sm">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Note Form */}
                  <div className="space-y-3">
                    <Textarea
                      value={noteForm.note}
                      onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                      placeholder="Add a note or communication..."
                      className="bg-white/10 border-white/20 text-white"
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <Select
                        value={noteForm.visibility}
                        onValueChange={(value) => setNoteForm({ ...noteForm, visibility: value })}
                      >
                        <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal Only</SelectItem>
                          <SelectItem value="partner_visible">Visible to Partner</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => handleAddNote(selectedPartner.id)}
                        disabled={loading || !noteForm.note}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Add Note
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default PartnerHubComplete;
