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
import { Users, Award, CheckCircle, XCircle, Clock, Shield, Building, AlertCircle, TrendingUp, Upload, FileText, Eye } from 'lucide-react';

function Partners() {
  const { user, token } = useAuth();
  const [partners, setPartners] = useState([]);
  const [l1Queue, setL1Queue] = useState([]);
  const [l2Queue, setL2Queue] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [onboardingFormData, setOnboardingFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    website: '',
    business_type: '',
    tax_id: '',
    years_in_business: '',
    number_of_employees: '',
    expected_monthly_volume: '',
    business_address: '',
    tier: 'bronze'
  });

  const [adminCreateData, setAdminCreateData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    website: '',
    business_type: '',
    tax_id: '',
    years_in_business: '',
    number_of_employees: '',
    expected_monthly_volume: '',
    business_address: '',
    tier: 'bronze'
  });

  const [documentUpload, setDocumentUpload] = useState({
    partner_id: '',
    document_type: '',
    document_name: '',
    document_data: ''
  });

  const [productAssignment, setProductAssignment] = useState({
    partner_id: '',
    product_ids: []
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  const DOCUMENT_TYPES = [
    { value: 'business_license', label: 'Business License' },
    { value: 'tax_document', label: 'Tax Document' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'signed_agreement', label: 'Signed Agreement' },
    { value: 'identity_proof', label: 'Identity Proof' }
  ];

  const TIER_INFO = {
    bronze: { name: 'Bronze', icon: '🥉', color: 'bg-orange-600' },
    silver: { name: 'Silver', icon: '🥈', color: 'bg-gray-500' },
    gold: { name: 'Gold', icon: '🥇', color: 'bg-yellow-600' },
    platinum: { name: 'Platinum', icon: '💎', color: 'bg-purple-600' }
  };

  useEffect(() => {
    fetchPartners();
    fetchL1Queue();
    fetchL2Queue();
    fetchProducts();
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

  const fetchL1Queue = async () => {
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

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/admin-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(onboardingFormData)
      });

      if (response.ok) {
        alert('Partner application submitted for approval!');
        fetchPartners();
        fetchL1Queue();
        setOnboardingFormData({
          company_name: '',
          contact_name: '',
          contact_email: '',
          phone: '',
          website: '',
          business_type: '',
          tax_id: '',
          years_in_business: '',
          number_of_employees: '',
          expected_monthly_volume: '',
          business_address: '',
          tier: 'bronze'
        });
      } else {
        alert('Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      alert('Error submitting application');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/admin-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(adminCreateData)
      });

      if (response.ok) {
        alert('Partner created successfully!');
        fetchPartners();
        fetchL1Queue();
        setAdminCreateData({
          company_name: '',
          contact_name: '',
          contact_email: '',
          phone: '',
          website: '',
          business_type: '',
          tax_id: '',
          years_in_business: '',
          number_of_employees: '',
          expected_monthly_volume: '',
          business_address: '',
          tier: 'bronze'
        });
      }
    } catch (error) {
      console.error('Error creating partner:', error);
      alert('Error creating partner');
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
          document_data: reader.result.split(',')[1] // Base64 string
        });
      };
      reader.readAsDataURL(file);
    }
  };

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
        body: JSON.stringify({
          document_type: documentUpload.document_type,
          document_name: documentUpload.document_name,
          document_data: documentUpload.document_data
        })
      });

      if (response.ok) {
        alert('Document uploaded successfully!');
        setDocumentUpload({ partner_id: '', document_type: '', document_name: '', document_data: '' });
        fetchPartners();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveL1 = async (partnerId) => {
    const comments = prompt('Enter approval comments (optional):');
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/approve-l1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comments: comments || '' })
      });

      if (response.ok) {
        alert('Level 1 approval completed!');
        fetchL1Queue();
        fetchL2Queue();
        fetchPartners();
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

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/reject-l1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason, comments: reason })
      });

      if (response.ok) {
        alert('Application rejected at Level 1');
        fetchL1Queue();
        fetchPartners();
      }
    } catch (error) {
      console.error('Error rejecting L1:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveL2 = async (partnerId) => {
    const comments = prompt('Enter approval comments (optional):');
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/approve-l2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comments: comments || '' })
      });

      if (response.ok) {
        alert('Level 2 approval completed! Partner fully approved.');
        fetchL2Queue();
        fetchPartners();
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

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/reject-l2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason, comments: reason })
      });

      if (response.ok) {
        alert('Application rejected at Level 2');
        fetchL2Queue();
        fetchPartners();
      }
    } catch (error) {
      console.error('Error rejecting L2:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignProducts = async (partnerId) => {
    const selectedProducts = productAssignment.product_ids;
    if (selectedProducts.length === 0) {
      alert('Please select at least one product');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/partners/${partnerId}/assign-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ product_ids: selectedProducts })
      });

      if (response.ok) {
        alert('Products assigned successfully!');
        fetchPartners();
        setProductAssignment({ partner_id: '', product_ids: [] });
      }
    } catch (error) {
      console.error('Error assigning products:', error);
      alert('Error assigning products');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId) => {
    setProductAssignment(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
  };

  const totalPartners = partners.filter(p => p.status !== 'rejected_level1' && p.status !== 'rejected_level2').length;
  const approvedPartners = partners.filter(p => p.status === 'approved').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Partner Hub</h1>
          <p className="text-slate-300">Comprehensive partner onboarding and approval management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                  <p className="text-green-100 text-sm">Approved</p>
                  <p className="text-3xl font-bold text-white mt-2">{approvedPartners}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">L1 Queue</p>
                  <p className="text-3xl font-bold text-white mt-2">{l1Queue.length}</p>
                </div>
                <Clock className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">L2 Queue</p>
                  <p className="text-3xl font-bold text-white mt-2">{l2Queue.length}</p>
                </div>
                <Shield className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="directory" className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
            <TabsTrigger value="directory" className="data-[state=active]:bg-blue-600">Partner Directory</TabsTrigger>
            <TabsTrigger value="onboarding" className="data-[state=active]:bg-blue-600">Partner Onboarding</TabsTrigger>
            {(user?.role === 'admin' || user?.role === 'finance') && (
              <>
                <TabsTrigger value="admin-create" className="data-[state=active]:bg-blue-600">Admin Create</TabsTrigger>
                <TabsTrigger value="l1-queue" className="data-[state=active]:bg-blue-600">L1 Queue ({l1Queue.length})</TabsTrigger>
                <TabsTrigger value="l2-queue" className="data-[state=active]:bg-blue-600">L2 Queue ({l2Queue.length})</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Partner Directory Tab */}
          <TabsContent value="directory" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Partner Directory</CardTitle>
                <CardDescription className="text-slate-300">View all partners and their status</CardDescription>
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
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.filter(p => p.status !== 'rejected_level1' && p.status !== 'rejected_level2').map(partner => (
                      <TableRow key={partner.id} className="border-white/10">
                        <TableCell className="text-white font-medium">{partner.company_name}</TableCell>
                        <TableCell className="text-slate-300">{partner.contact_name}</TableCell>
                        <TableCell className="text-slate-300">{partner.contact_email}</TableCell>
                        <TableCell>
                          <Badge className={`${TIER_INFO[partner.tier].color} text-white`}>
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
                        <TableCell>
                          <Button
                            onClick={() => setSelectedPartner(partner)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partner Onboarding Tab */}
          <TabsContent value="onboarding" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Partner Self-Service Onboarding</CardTitle>
                <CardDescription className="text-slate-300">Submit your partner application</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOnboardingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-white">Company Name *</Label>
                      <Input
                        value={onboardingFormData.company_name}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, company_name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Contact Name *</Label>
                      <Input
                        value={onboardingFormData.contact_name}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, contact_name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Contact Email *</Label>
                      <Input
                        type="email"
                        value={onboardingFormData.contact_email}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, contact_email: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Phone</Label>
                      <Input
                        value={onboardingFormData.phone}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, phone: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Website</Label>
                      <Input
                        value={onboardingFormData.website}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, website: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Business Type</Label>
                      <Input
                        value={onboardingFormData.business_type}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, business_type: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Tax ID</Label>
                      <Input
                        value={onboardingFormData.tax_id}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, tax_id: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Years in Business</Label>
                      <Input
                        type="number"
                        value={onboardingFormData.years_in_business}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, years_in_business: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Number of Employees</Label>
                      <Input
                        type="number"
                        value={onboardingFormData.number_of_employees}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, number_of_employees: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Expected Monthly Volume</Label>
                      <Input
                        value={onboardingFormData.expected_monthly_volume}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, expected_monthly_volume: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-white">Business Address</Label>
                      <Textarea
                        value={onboardingFormData.business_address}
                        onChange={(e) => setOnboardingFormData({ ...onboardingFormData, business_address: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Create Tab */}
          {(user?.role === 'admin' || user?.role === 'finance') && (
            <TabsContent value="admin-create" className="mt-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Admin-Led Partner Creation</CardTitle>
                  <CardDescription className="text-slate-300">Create a new partner on behalf of the company</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdminCreate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-white">Company Name *</Label>
                        <Input
                          value={adminCreateData.company_name}
                          onChange={(e) => setAdminCreateData({ ...adminCreateData, company_name: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Contact Name *</Label>
                        <Input
                          value={adminCreateData.contact_name}
                          onChange={(e) => setAdminCreateData({ ...adminCreateData, contact_name: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Contact Email *</Label>
                        <Input
                          type="email"
                          value={adminCreateData.contact_email}
                          onChange={(e) => setAdminCreateData({ ...adminCreateData, contact_email: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Tier *</Label>
                        <Select
                          value={adminCreateData.tier}
                          onValueChange={(value) => setAdminCreateData({ ...adminCreateData, tier: value })}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bronze">Bronze</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="platinum">Platinum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white">Phone</Label>
                        <Input
                          value={adminCreateData.phone}
                          onChange={(e) => setAdminCreateData({ ...adminCreateData, phone: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Website</Label>
                        <Input
                          value={adminCreateData.website}
                          onChange={(e) => setAdminCreateData({ ...adminCreateData, website: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {loading ? 'Creating...' : 'Create Partner'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* L1 Approval Queue Tab */}
          {(user?.role === 'admin' || user?.role === 'finance') && (
            <TabsContent value="l1-queue" className="mt-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Level 1 Approval Queue</CardTitle>
                  <CardDescription className="text-slate-300">Review and approve pending Level 1 applications</CardDescription>
                </CardHeader>
                <CardContent>
                  {l1Queue.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300">No pending Level 1 approvals</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {l1Queue.map(partner => (
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
                                    <p className="text-xs text-slate-400">Tier</p>
                                    <Badge className={TIER_INFO[partner.tier].color}>
                                      {TIER_INFO[partner.tier].icon} {TIER_INFO[partner.tier].name}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">Submitted</p>
                                    <p className="text-white">
                                      {partner.submitted_at ? new Date(partner.submitted_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  onClick={() => handleApproveL1(partner.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                  disabled={loading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve L1
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

          {/* L2 Approval Queue Tab */}
          {(user?.role === 'admin' || user?.role === 'finance') && (
            <TabsContent value="l2-queue" className="mt-6">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Level 2 Approval Queue</CardTitle>
                  <CardDescription className="text-slate-300">Final approval for partner applications</CardDescription>
                </CardHeader>
                <CardContent>
                  {l2Queue.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300">No pending Level 2 approvals</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {l2Queue.map(partner => (
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
                                    <p className="text-xs text-slate-400">Tier</p>
                                    <Badge className={TIER_INFO[partner.tier].color}>
                                      {TIER_INFO[partner.tier].icon} {TIER_INFO[partner.tier].name}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-400">L1 Approved</p>
                                    <p className="text-green-400">✓ Level 1 Passed</p>
                                  </div>
                                </div>

                                {/* Show L1 approval details */}
                                {partner.approval_workflow && partner.approval_workflow.length > 0 && (
                                  <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                                    <p className="text-xs text-green-400 mb-2">Level 1 Approval:</p>
                                    {partner.approval_workflow.filter(step => step.level === 1).map((step, idx) => (
                                      <p key={idx} className="text-sm text-slate-300">
                                        Approved by {step.approver_name || 'Admin'} - {step.comments || 'No comments'}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  onClick={() => handleApproveL2(partner.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                  disabled={loading}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve L2
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

        {/* Partner Detail Modal */}
        {selectedPartner && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white text-2xl">{selectedPartner.company_name}</CardTitle>
                    <CardDescription className="text-slate-300">Partner Details</CardDescription>
                  </div>
                  <Button
                    onClick={() => setSelectedPartner(null)}
                    className="bg-red-600 hover:bg-red-700"
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-white font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Contact Name</p>
                      <p className="text-white">{selectedPartner.contact_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Email</p>
                      <p className="text-white">{selectedPartner.contact_email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Phone</p>
                      <p className="text-white">{selectedPartner.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Website</p>
                      <p className="text-white">{selectedPartner.website || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Tier</p>
                      <Badge className={TIER_INFO[selectedPartner.tier].color}>
                        {TIER_INFO[selectedPartner.tier].icon} {TIER_INFO[selectedPartner.tier].name}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Status</p>
                      <Badge variant="outline" className="text-white border-white/30">
                        {selectedPartner.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Approval Workflow */}
                {selectedPartner.approval_workflow && selectedPartner.approval_workflow.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Approval Workflow</h3>
                    <div className="space-y-3">
                      {selectedPartner.approval_workflow.map((step, idx) => (
                        <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">Level {step.level}</p>
                              <p className="text-xs text-slate-400">
                                {step.approver_name || 'Pending'} - {step.comments || 'No comments'}
                              </p>
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

                {/* Product Assignment (if approved) */}
                {selectedPartner.status === 'approved' && (user?.role === 'admin' || user?.role === 'finance') && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Assign Products</h3>
                    <div className="space-y-3">
                      {products.map(product => (
                        <div key={product.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                          <input
                            type="checkbox"
                            checked={productAssignment.product_ids.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-4 h-4"
                          />
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                            <p className="text-xs text-slate-400">{product.category}</p>
                          </div>
                        </div>
                      ))}
                      <Button
                        onClick={() => handleAssignProducts(selectedPartner.id)}
                        disabled={loading || productAssignment.product_ids.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {loading ? 'Assigning...' : 'Assign Selected Products'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Document Upload */}
                {(user?.role === 'admin' || user?.role === 'finance') && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">Upload Document</h3>
                    <div className="space-y-3">
                      <Select
                        value={documentUpload.document_type}
                        onValueChange={(value) => setDocumentUpload({ ...documentUpload, document_type: value })}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select document type" />
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
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {loading ? 'Uploading...' : 'Upload Document'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default Partners;
