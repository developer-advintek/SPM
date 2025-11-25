import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { Users, Shield, UserPlus, Settings, CheckCircle, XCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

function UserManagement() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'rep',
    territory_id: '',
    manager_id: '',
    active: true
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  // Role definitions with permissions
  const ROLES = {
    admin: {
      name: 'Administrator',
      color: 'bg-red-600',
      icon: '👑',
      permissions: [
        'manage_users',
        'manage_partners',
        'manage_products',
        'manage_plans',
        'view_all_data',
        'approve_workflows',
        'manage_territories',
        'manage_quotas',
        'create_spiffs',
        'manage_tiers',
        'view_analytics',
        'manage_tickets'
      ],
      description: 'Full system access and control'
    },
    finance: {
      name: 'Finance Manager',
      color: 'bg-green-600',
      icon: '💰',
      permissions: [
        'manage_partners',
        'manage_products',
        'manage_plans',
        'view_financial_data',
        'approve_payouts',
        'create_spiffs',
        'manage_tiers',
        'view_analytics',
        'export_reports'
      ],
      description: 'Financial operations and partner management'
    },
    manager: {
      name: 'Sales Manager',
      color: 'bg-blue-600',
      icon: '📊',
      permissions: [
        'view_team_data',
        'manage_territories',
        'manage_quotas',
        'approve_workflows',
        'view_analytics',
        'manage_tickets',
        'view_commissions'
      ],
      description: 'Team oversight and territory management'
    },
    rep: {
      name: 'Sales Representative',
      color: 'bg-purple-600',
      icon: '💼',
      permissions: [
        'view_own_data',
        'view_products',
        'create_transactions',
        'view_commissions',
        'create_tickets',
        'view_spiffs'
      ],
      description: 'Individual sales operations'
    },
    partner: {
      name: 'Partner (External)',
      color: 'bg-orange-600',
      icon: '🤝',
      permissions: [
        'view_own_data',
        'view_own_payouts',
        'view_products',
        'create_tickets'
      ],
      description: 'External partner with limited access',
      note: 'Partners must be registered through Partner Hub'
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Exclude partners from user management - they're managed in Partner Hub
        setUsers(data.filter(u => u.role !== 'partner'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchUsers();
        setShowCreateForm(false);
        setFormData({
          email: '',
          full_name: '',
          password: '',
          role: 'rep',
          territory_id: '',
          manager_id: '',
          active: true
        });
        alert('User created successfully!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updateData) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await fetchUsers();
        alert('User updated successfully!');
        setShowEditForm(false);
        setSelectedUser(null);
      } else {
        alert('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user');
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    await handleUpdateUser(userId, { active: !currentActive });
  };

  const handleChangeRole = async (userId, newRole) => {
    if (newRole === 'partner') {
      alert('Cannot assign Partner role here. Partners must register through Partner Hub.');
      return;
    }
    await handleUpdateUser(userId, { role: newRole });
  };

  const getRoleStats = () => {
    return {
      admin: users.filter(u => u.role === 'admin').length,
      finance: users.filter(u => u.role === 'finance').length,
      manager: users.filter(u => u.role === 'manager').length,
      rep: users.filter(u => u.role === 'rep').length
    };
  };

  const stats = getRoleStats();
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
          <p className="text-slate-300">Manage internal users, roles, and permissions</p>
          <Alert className="mt-4 bg-blue-500/20 border-blue-500/50">
            <AlertDescription className="text-blue-200">
              <strong>Note:</strong> Partners are managed separately in the Partner Hub. Only internal users (Admin, Finance, Manager, Rep) can be created here.
            </AlertDescription>
          </Alert>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-white mt-2">{totalUsers}</p>
                </div>
                <Users className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Active</p>
                  <p className="text-3xl font-bold text-white mt-2">{activeUsers}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Admins</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.admin}</p>
                </div>
                <Shield className="h-12 w-12 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Managers</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.manager}</p>
                </div>
                <Settings className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Reps</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.rep}</p>
                </div>
                <UserPlus className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create User Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="create-user-btn"
          >
            {showCreateForm ? 'Cancel' : '+ Create New User'}
          </Button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Create New Internal User</CardTitle>
              <CardDescription className="text-slate-300">
                Create users for Admin, Finance, Manager, or Rep roles only
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-white">Full Name *</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                      data-testid="user-name-input"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                      data-testid="user-email-input"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Password *</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      required
                      minLength={6}
                      data-testid="user-password-input"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="user-role-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">👑 Administrator</SelectItem>
                        <SelectItem value="finance">💰 Finance Manager</SelectItem>
                        <SelectItem value="manager">📊 Sales Manager</SelectItem>
                        <SelectItem value="rep">💼 Sales Representative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-white">Territory ID (Optional)</Label>
                    <Input
                      value={formData.territory_id}
                      onChange={(e) => setFormData({ ...formData, territory_id: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Leave empty if not assigned"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Manager ID (Optional)</Label>
                    <Input
                      value={formData.manager_id}
                      onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="For reps - assign a manager"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    id="active"
                  />
                  <label htmlFor="active" className="text-white text-sm cursor-pointer">
                    Active (user can login immediately)
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="submit-user-btn"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20">
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">All Users</TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-blue-600">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="groups" className="data-[state=active]:bg-blue-600">Groups</TabsTrigger>
          </TabsList>

          {/* All Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Internal User Directory</CardTitle>
                <CardDescription className="text-slate-300">Manage all internal system users</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white">Name</TableHead>
                      <TableHead className="text-white">Email</TableHead>
                      <TableHead className="text-white">Role</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Created</TableHead>
                      <TableHead className="text-white">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id} className="border-white/10" data-testid="user-row">
                        <TableCell className="text-white font-medium">{u.full_name}</TableCell>
                        <TableCell className="text-slate-300">{u.email}</TableCell>
                        <TableCell>
                          <Badge className={`${ROLES[u.role].color} text-white`}>
                            {ROLES[u.role].icon} {ROLES[u.role].name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.active ? (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-600 text-white">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Select
                              value={u.role}
                              onValueChange={(value) => handleChangeRole(u.id, value)}
                            >
                              <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="finance">Finance</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="rep">Rep</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => handleToggleActive(u.id, u.active)}
                              variant="outline"
                              size="sm"
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                              {u.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles & Permissions Tab */}
          <TabsContent value="roles" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(ROLES).filter(([key]) => key !== 'partner').map(([roleKey, roleInfo]) => (
                <Card key={roleKey} className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{roleInfo.icon}</div>
                        <div>
                          <CardTitle className="text-white">{roleInfo.name}</CardTitle>
                          <CardDescription className="text-slate-300">{roleInfo.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className={`${roleInfo.color} text-white`}>
                        {users.filter(u => u.role === roleKey).length} users
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-white font-semibold text-sm mb-3">Permissions:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {roleInfo.permissions.map((permission, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-slate-300 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span>{permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Partner Role Info Card */}
              <Card className="bg-orange-500/20 backdrop-blur-lg border-orange-500/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{ROLES.partner.icon}</div>
                    <div>
                      <CardTitle className="text-white">{ROLES.partner.name}</CardTitle>
                      <CardDescription className="text-orange-200">{ROLES.partner.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-orange-500/30 border-orange-500/50 mb-4">
                    <Lock className="h-4 w-4 text-orange-200" />
                    <AlertDescription className="text-orange-100">
                      <strong>{ROLES.partner.note}</strong>
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <p className="text-white font-semibold text-sm mb-3">Permissions:</p>
                    {ROLES.partner.permissions.map((permission, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-300 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>{permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sales Team Group */}
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Sales Team</CardTitle>
                  <CardDescription className="text-slate-300">Managers and Representatives</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Total Members:</span>
                      <Badge className="bg-blue-600">{stats.manager + stats.rep}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Managers:</span>
                      <Badge className="bg-blue-500">{stats.manager}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Representatives:</span>
                      <Badge className="bg-purple-500">{stats.rep}</Badge>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-slate-400">Shared Permissions:</p>
                      <ul className="mt-2 space-y-1">
                        <li className="text-sm text-slate-300">• View products</li>
                        <li className="text-sm text-slate-300">• Create transactions</li>
                        <li className="text-sm text-slate-300">• View commissions</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Finance & Admin Group */}
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Leadership Team</CardTitle>
                  <CardDescription className="text-slate-300">Administrators and Finance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Total Members:</span>
                      <Badge className="bg-red-600">{stats.admin + stats.finance}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Administrators:</span>
                      <Badge className="bg-red-500">{stats.admin}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Finance Managers:</span>
                      <Badge className="bg-green-500">{stats.finance}</Badge>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-slate-400">Shared Permissions:</p>
                      <ul className="mt-2 space-y-1">
                        <li className="text-sm text-slate-300">• Manage partners</li>
                        <li className="text-sm text-slate-300">• View all data</li>
                        <li className="text-sm text-slate-300">• Approve workflows</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default UserManagement;
