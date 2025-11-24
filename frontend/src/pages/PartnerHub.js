import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

export const PartnerHub = () => {
  const [partner, setPartner] = useState({
    company_name: 'Acme Partners',
    tier: 'gold',
    onboarding_progress: 75,
    status: 'active'
  });
  const [payouts, setPayouts] = useState([
    { id: 1, period: 'Q4 2024', amount: '15000', status: 'completed' },
    { id: 2, period: 'Q1 2025', amount: '18500', status: 'processing' }
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="partner-hub-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Partner Hub</h1>
        <p className="text-slate-600">Self-service portal for partners</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card data-testid="partner-info-card">
          <CardHeader>
            <CardTitle>Partner Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Company</p>
                <p className="font-semibold" data-testid="partner-company">{partner.company_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Tier</p>
                <Badge variant="secondary" data-testid="partner-tier" className="uppercase">{partner.tier}</Badge>
              </div>
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <Badge variant="default" data-testid="partner-status" className="uppercase">{partner.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="onboarding-progress-card">
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={partner.onboarding_progress} data-testid="onboarding-progress-bar" />
              <p className="text-sm text-slate-600" data-testid="onboarding-percentage">
                {partner.onboarding_progress}% Complete
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span>Company Details</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span>Tax Documents</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span>Banking Information</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-300"></div>
                  <span>Compliance Training</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="quick-actions-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" variant="outline" data-testid="btn-view-payouts">View My Payouts</Button>
              <Button className="w-full" variant="outline" data-testid="btn-upload-docs">Upload Documents</Button>
              <Button className="w-full" variant="outline" data-testid="btn-submit-issue">Submit an Issue</Button>
              <Button className="w-full" variant="outline" data-testid="btn-update-banking">Update Banking</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payouts" className="w-full">
        <TabsList>
          <TabsTrigger value="payouts" data-testid="tab-payouts">My Payouts</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="payouts">
          <Card data-testid="payouts-content">
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div key={payout.id} className="flex justify-between items-center p-4 bg-slate-50 rounded" data-testid={`payout-item-${payout.id}`}>
                    <div>
                      <p className="font-semibold">{payout.period}</p>
                      <p className="text-sm text-slate-600">Amount: ${parseFloat(payout.amount).toLocaleString()}</p>
                    </div>
                    <Badge variant={payout.status === 'completed' ? 'default' : 'secondary'} data-testid={`payout-status-${payout.id}`}>
                      {payout.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card data-testid="documents-content">
            <CardHeader>
              <CardTitle>Compliance Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 bg-green-500/20 border border-green-400/40 rounded-lg backdrop-blur-sm" data-testid="doc-tax-form">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-green-100">W-9 Tax Form</p>
                      <p className="text-sm text-green-200/80">Uploaded: Jan 15, 2025</p>
                    </div>
                    <Badge className="bg-green-400/30 text-green-100 border-green-400/50">Approved</Badge>
                  </div>
                </div>
                <div className="p-4 bg-yellow-500/20 border border-yellow-400/40 rounded-lg backdrop-blur-sm" data-testid="doc-banking">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-yellow-100">Banking Information</p>
                      <p className="text-sm text-yellow-200/80">Uploaded: Jan 20, 2025</p>
                    </div>
                    <Badge className="bg-yellow-400/30 text-yellow-100 border-yellow-400/50">Under Review</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card data-testid="performance-content">
            <CardHeader>
              <CardTitle>Partner Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600">Deal Closure Rate</span>
                    <span className="font-semibold">85%</span>
                  </div>
                  <Progress value={85} data-testid="metric-closure-rate" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600">Customer Satisfaction</span>
                    <span className="font-semibold">92%</span>
                  </div>
                  <Progress value={92} data-testid="metric-satisfaction" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600">Service Activation Success</span>
                    <span className="font-semibold">78%</span>
                  </div>
                  <Progress value={78} data-testid="metric-activation" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
