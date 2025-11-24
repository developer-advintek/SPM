import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';

export const Tickets = () => {
  const [tickets, setTickets] = useState([
    {
      id: 'TKT-001',
      ticket_number: 'TKT-001',
      subject: 'Commission Calculation Issue',
      category: 'dispute',
      severity: 'high',
      status: 'investigating',
      submitted_by: 'Current User',
      created_at: '2025-01-25T10:00:00Z',
      sla_hours: 24,
      sla_breach: false
    },
    {
      id: 'TKT-002',
      ticket_number: 'TKT-002',
      subject: 'Payout Not Received',
      category: 'payout_inquiry',
      severity: 'critical',
      status: 'assigned',
      submitted_by: 'Current User',
      created_at: '2025-01-24T15:30:00Z',
      sla_hours: 4,
      sla_breach: true
    }
  ]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'technical',
    severity: 'medium'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newTicket = {
      id: `TKT-${Date.now()}`,
      ticket_number: `TKT-${Date.now()}`,
      ...formData,
      status: 'new',
      submitted_by: 'Current User',
      created_at: new Date().toISOString(),
      sla_hours: formData.severity === 'critical' ? 4 : 48,
      sla_breach: false
    };
    setTickets([newTicket, ...tickets]);
    toast.success('Ticket submitted successfully');
    setOpen(false);
    setFormData({
      subject: '',
      description: '',
      category: 'technical',
      severity: 'medium'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      investigating: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-slate-100 text-slate-800'
    };
    return colors[status] || colors.new;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'secondary',
      medium: 'default',
      high: 'default',
      critical: 'destructive'
    };
    return colors[severity] || 'secondary';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="tickets-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Support Tickets</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-submit-ticket">Submit an Issue</Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-ticket">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input
                  data-testid="input-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  data-testid="textarea-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  data-testid="select-category"
                  className="w-full p-2 border rounded"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="dispute">Dispute</option>
                  <option value="technical">Technical</option>
                  <option value="data_error">Data Error</option>
                  <option value="payout_inquiry">Payout Inquiry</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label>Severity</Label>
                <select
                  data-testid="select-severity"
                  className="w-full p-2 border rounded"
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <Button type="submit" className="w-full" data-testid="btn-submit-form">Submit Ticket</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} data-testid={`ticket-${ticket.id}`}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold" data-testid={`ticket-subject-${ticket.id}`}>{ticket.subject}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`} data-testid={`ticket-status-${ticket.id}`}>
                      {ticket.status.toUpperCase()}
                    </span>
                    <Badge variant={getSeverityColor(ticket.severity)} data-testid={`ticket-severity-${ticket.id}`}>
                      {ticket.severity.toUpperCase()}
                    </Badge>
                    {ticket.sla_breach && (
                      <Badge variant="destructive" data-testid={`ticket-sla-breach-${ticket.id}`}>SLA BREACH</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p>Ticket #: <span className="font-medium">{ticket.ticket_number}</span></p>
                      <p>Category: <span className="font-medium">{ticket.category.replace('_', ' ')}</span></p>
                    </div>
                    <div>
                      <p>Created: <span className="font-medium">{new Date(ticket.created_at).toLocaleDateString()}</span></p>
                      <p>SLA: <span className="font-medium">{ticket.sla_hours}h</span></p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" data-testid={`btn-view-${ticket.id}`}>View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
