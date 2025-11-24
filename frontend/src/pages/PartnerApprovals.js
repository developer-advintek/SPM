import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const PartnerApprovals = () => {
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [viewDocumentDialog, setViewDocumentDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await axios.get(`${API}/partners/pending`, { headers: getAuthHeaders() });
      setPartners(response.data);
    } catch (error) {
      console.error('Failed to fetch partners', error);
    }
  };

  const handleApprove = async (partnerId) => {
    try {
      await axios.post(`${API}/partners/${partnerId}/approve`, 
        { comments: reviewComments },
        { headers: getAuthHeaders() }
      );
      toast.success('Partner approved successfully! Activation email sent.');
      setDialogOpen(false);
      setReviewComments('');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to approve partner');
    }
  };

  const handleReject = async (partnerId) => {
    if (!reviewComments) {
      toast.error('Please provide rejection reason');
      return;
    }
    
    try {
      await axios.post(`${API}/partners/${partnerId}/reject`,
        { reason: reviewComments },
        { headers: getAuthHeaders() }
      );
      toast.success('Partner rejected. Notification email sent.');
      setDialogOpen(false);
      setReviewComments('');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to reject partner');
    }
  };

  const handleRequestMore = async (partnerId) => {
    if (!reviewComments) {
      toast.error('Please specify what additional information is needed');
      return;
    }
    
    try {
      await axios.post(`${API}/partners/${partnerId}/request-more`,
        { message: reviewComments },
        { headers: getAuthHeaders() }
      );
      toast.success('Request sent to partner');
      setDialogOpen(false);
      setReviewComments('');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_review: { class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', label: 'Pending Review' },
      under_review: { class: 'bg-blue-500/20 text-blue-300 border-blue-500/40', label: 'Under Review' },
      approved: { class: 'bg-green-500/20 text-green-300 border-green-500/40', label: 'Approved' },
      rejected: { class: 'bg-red-500/20 text-red-300 border-red-500/40', label: 'Rejected' },
      more_info_needed: { class: 'bg-orange-500/20 text-orange-300 border-orange-500/40', label: 'More Info Needed' }
    };
    
    const config = statusConfig[status] || statusConfig.pending_review;
    return <Badge className={`${config.class} border`}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="partner-approvals-page">
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Partner Approvals
        </h1>
        <p className="text-slate-400">Review and approve partner onboarding applications</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending Review</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="space-y-4" data-testid="pending-partners">
            {partners.filter(p => ['pending_review', 'under_review', 'more_info_needed'].includes(p.status)).map((partner) => (
              <Card key={partner.id} data-testid={`partner-${partner.id}`} className="hover:scale-[1.01]">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Company Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{partner.company_name}</h3>
                          <p className="text-slate-300">{partner.contact_name}</p>
                          <p className="text-sm text-slate-400">{partner.contact_email}</p>
                        </div>
                        {getStatusBadge(partner.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Business Type</p>
                          <p className="text-slate-200 font-medium">{partner.business_type || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Years in Business</p>
                          <p className="text-slate-200 font-medium">{partner.years_in_business || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Employees</p>
                          <p className="text-slate-200 font-medium">{partner.number_of_employees || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Expected Volume</p>
                          <p className="text-slate-200 font-medium">{partner.expected_monthly_volume || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-3">Uploaded Documents</h4>
                      <div className="space-y-2 text-sm">
                        {partner.documents && partner.documents.business_license && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">📄 Business License</span>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedDocument({ type: 'Business License', url: partner.documents.business_license });
                              setViewDocumentDialog(true);
                            }}>View</Button>
                          </div>
                        )}
                        {partner.documents && partner.documents.tax_id && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">📄 Tax ID</span>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedDocument({ type: 'Tax ID', url: partner.documents.tax_id });
                              setViewDocumentDialog(true);
                            }}>View</Button>
                          </div>
                        )}
                        {partner.documents && partner.documents.identity_proof && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">🪪 Identity Proof</span>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedDocument({ type: 'Identity Proof', url: partner.documents.identity_proof });
                              setViewDocumentDialog(true);
                            }}>View</Button>
                          </div>
                        )}
                        {partner.documents && partner.documents.bank_statement && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">🏦 Bank Statement</span>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedDocument({ type: 'Bank Statement', url: partner.documents.bank_statement });
                              setViewDocumentDialog(true);
                            }}>View</Button>
                          </div>
                        )}
                        {(!partner.documents || Object.keys(partner.documents).length === 0) && (
                          <p className="text-slate-500 text-xs">No documents uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => {
                        setSelectedPartner(partner);
                        setDialogOpen(true);
                      }}
                      data-testid={`btn-review-${partner.id}`}
                    >
                      Review Application
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRequestMore(partner.id)}
                      data-testid={`btn-request-more-${partner.id}`}
                    >
                      Request More Info
                    </Button>
                  </div>

                  {partner.review_history && partner.review_history.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-blue-300 font-semibold">Review History:</p>
                      {partner.review_history.map((review, idx) => (
                        <p key={idx} className="text-xs text-blue-200 mt-1">
                          {review.date}: {review.action} - {review.comments}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {partners.filter(p => ['pending_review', 'under_review', 'more_info_needed'].includes(p.status)).length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-slate-400" data-testid="no-pending">No pending partner applications</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="approved">
          <div className="space-y-4" data-testid="approved-partners">
            {partners.filter(p => p.status === 'approved').map((partner) => (
              <Card key={partner.id} data-testid={`approved-partner-${partner.id}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white">{partner.company_name}</h3>
                      <p className="text-slate-300">{partner.contact_email}</p>
                      <p className="text-sm text-slate-400 mt-1">Approved on: {new Date(partner.approved_at).toLocaleDateString()}</p>
                    </div>
                    {getStatusBadge(partner.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rejected">
          <div className="space-y-4" data-testid="rejected-partners">
            {partners.filter(p => p.status === 'rejected').map((partner) => (
              <Card key={partner.id} data-testid={`rejected-partner-${partner.id}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white">{partner.company_name}</h3>
                      <p className="text-slate-300">{partner.contact_email}</p>
                      {partner.rejection_reason && (
                        <p className="text-sm text-red-300 mt-2">Reason: {partner.rejection_reason}</p>
                      )}
                    </div>
                    {getStatusBadge(partner.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="review-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">Review Partner Application</DialogTitle>
          </DialogHeader>
          {selectedPartner && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-white">Company: {selectedPartner.company_name}</p>
                <p className="text-sm text-slate-300">{selectedPartner.contact_name} - {selectedPartner.contact_email}</p>
              </div>
              <div>
                <Label className="text-slate-100 font-semibold">Review Comments / Notes</Label>
                <Textarea
                  data-testid="textarea-review"
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Add your review comments here..."
                  className="bg-white/10 border-white/30 text-white placeholder:text-slate-400"
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => selectedPartner && handleReject(selectedPartner.id)}
              data-testid="btn-reject-partner"
              className="bg-red-500/20 hover:bg-red-500/30 border-red-500/40"
            >
              Reject
            </Button>
            <Button
              onClick={() => selectedPartner && handleApprove(selectedPartner.id)}
              data-testid="btn-approve-partner"
              className="bg-green-500 hover:bg-green-600"
            >
              Approve & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document View Dialog */}
      <Dialog open={viewDocumentDialog} onOpenChange={setViewDocumentDialog}>
        <DialogContent data-testid="document-view-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedDocument?.type}</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-slate-700/30 border border-slate-600/30 rounded-lg text-center">
            <p className="text-slate-300 mb-4">Document Preview</p>
            <p className="text-sm text-slate-400">📄 {selectedDocument?.url}</p>
            <p className="text-xs text-slate-500 mt-2">(In production, this would show the actual document)</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDocumentDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
