import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

export const ApprovalCenter = () => {
  const [workflows, setWorkflows] = useState([
    {
      id: 'wf-1',
      workflow_type: 'payout',
      reference_id: 'payout-q1-2025',
      status: 'submitted',
      initiated_by: 'John Doe',
      created_at: '2025-01-25T10:00:00Z',
      current_step: 1
    },
    {
      id: 'wf-2',
      workflow_type: 'plan_change',
      reference_id: 'plan-update-2025',
      status: 'l1_approved',
      initiated_by: 'Jane Smith',
      created_at: '2025-01-24T14:30:00Z',
      current_step: 2
    }
  ]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comments, setComments] = useState('');

  const handleApprove = (workflowId) => {
    setWorkflows(workflows.map(wf => 
      wf.id === workflowId 
        ? { ...wf, status: wf.status === 'submitted' ? 'l1_approved' : 'final_approved' }
        : wf
    ));
    toast.success('Workflow approved');
    setDialogOpen(false);
    setComments('');
  };

  const handleReject = (workflowId) => {
    setWorkflows(workflows.map(wf => 
      wf.id === workflowId ? { ...wf, status: 'rejected' } : wf
    ));
    toast.success('Workflow rejected');
    setDialogOpen(false);
    setComments('');
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      draft: 'secondary',
      submitted: 'default',
      l1_approved: 'default',
      l2_approved: 'default',
      final_approved: 'default',
      rejected: 'destructive'
    };
    return <Badge variant={statusColors[status]} data-testid={`status-${status}`}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="approval-center-page">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Approval Center</h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="space-y-4" data-testid="pending-workflows">
            {workflows.filter(wf => ['submitted', 'l1_approved', 'l2_approved'].includes(wf.status)).map((workflow) => (
              <Card key={workflow.id} data-testid={`workflow-${workflow.id}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold" data-testid={`workflow-type-${workflow.id}`}>
                          {workflow.workflow_type.replace('_', ' ').toUpperCase()}
                        </h3>
                        {getStatusBadge(workflow.status)}
                      </div>
                      <p className="text-sm text-slate-600" data-testid={`workflow-ref-${workflow.id}`}>Reference: {workflow.reference_id}</p>
                      <p className="text-sm text-slate-600">Initiated by: {workflow.initiated_by}</p>
                      <p className="text-sm text-slate-600">Date: {new Date(workflow.created_at).toLocaleDateString()}</p>
                      <div className="mt-3">
                        <p className="text-xs text-slate-500">Current Step: Level {workflow.current_step}</p>
                        <div className="flex gap-2 mt-2">
                          {[1, 2, 3].map((step) => (
                            <div
                              key={step}
                              className={`w-12 h-2 rounded ${
                                step < workflow.current_step ? 'bg-green-500' :
                                step === workflow.current_step ? 'bg-blue-500' :
                                'bg-slate-200'
                              }`}
                              data-testid={`workflow-step-${workflow.id}-${step}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedWorkflow(workflow);
                          setDialogOpen(true);
                        }}
                        data-testid={`btn-review-${workflow.id}`}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {workflows.filter(wf => ['submitted', 'l1_approved', 'l2_approved'].includes(wf.status)).length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-slate-600" data-testid="no-pending-workflows">No pending approvals</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="approved">
          <div className="space-y-4" data-testid="approved-workflows">
            {workflows.filter(wf => wf.status === 'final_approved').map((workflow) => (
              <Card key={workflow.id} data-testid={`approved-workflow-${workflow.id}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{workflow.workflow_type.replace('_', ' ').toUpperCase()}</h3>
                      <p className="text-sm text-slate-600">Reference: {workflow.reference_id}</p>
                      <p className="text-sm text-slate-600">Date: {new Date(workflow.created_at).toLocaleDateString()}</p>
                    </div>
                    {getStatusBadge(workflow.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rejected">
          <div className="space-y-4" data-testid="rejected-workflows">
            {workflows.filter(wf => wf.status === 'rejected').map((workflow) => (
              <Card key={workflow.id} data-testid={`rejected-workflow-${workflow.id}`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{workflow.workflow_type.replace('_', ' ').toUpperCase()}</h3>
                      <p className="text-sm text-slate-600">Reference: {workflow.reference_id}</p>
                      <p className="text-sm text-slate-600">Date: {new Date(workflow.created_at).toLocaleDateString()}</p>
                    </div>
                    {getStatusBadge(workflow.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="review-dialog">
          <DialogHeader>
            <DialogTitle>Review Workflow</DialogTitle>
          </DialogHeader>
          {selectedWorkflow && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">Type:</p>
                <p>{selectedWorkflow.workflow_type.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div>
                <p className="font-semibold">Reference:</p>
                <p>{selectedWorkflow.reference_id}</p>
              </div>
              <div>
                <p className="font-semibold">Comments:</p>
                <Textarea
                  data-testid="textarea-comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add your comments..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => selectedWorkflow && handleReject(selectedWorkflow.id)}
              data-testid="btn-reject"
            >
              Reject
            </Button>
            <Button
              onClick={() => selectedWorkflow && handleApprove(selectedWorkflow.id)}
              data-testid="btn-approve"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
