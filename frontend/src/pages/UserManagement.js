import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'rep',
    territory_id: '',
    manager_id: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, { headers: getAuthHeaders() });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/auth/register`, formData, { headers: getAuthHeaders() });
      toast.success('User created successfully');
      setOpen(false);
      fetchUsers();
      setFormData({
        email: '',
        full_name: '',
        password: '',
        role: 'rep',
        territory_id: '',
        manager_id: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.patch(`${API}/users/${userId}`, 
        { active: !currentStatus }, 
        { headers: getAuthHeaders() }
      );
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-500/20 text-red-400 border-red-500/40',
      finance: 'bg-green-500/20 text-green-400 border-green-500/40',
      manager: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      rep: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      partner: 'bg-orange-500/20 text-orange-400 border-orange-500/40'
    };
    return colors[role] || 'bg-slate-500/20 text-slate-400 border-slate-500/40';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="user-management-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            User Management
          </h1>
          <p className="text-slate-400">Create and manage system users</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="btn-create-user" className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-user" className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-200">Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  data-testid="input-fullname"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  data-testid="input-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  data-testid="input-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <Label>Role</Label>
                <select
                  data-testid="select-role"
                  className="w-full p-2 border rounded"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="rep">Sales Rep</option>
                  <option value="manager">Manager</option>
                  <option value="finance">Finance</option>
                  <option value="admin">Admin</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div>
                <Label>Territory ID (Optional)</Label>
                <Input
                  data-testid="input-territory"
                  value={formData.territory_id}
                  onChange={(e) => setFormData({ ...formData, territory_id: e.target.value })}
                  placeholder="Leave blank if not applicable"
                />
              </div>
              <div>
                <Label>Manager ID (Optional)</Label>
                <Input
                  data-testid="input-manager"
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  placeholder="Leave blank for no manager"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="btn-submit-user">
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card data-testid="users-table-card" className="hover:scale-[1.005]">
        <CardHeader>
          <CardTitle className="text-slate-200">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${getRoleBadgeColor(user.role)} border`}>
                        {user.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {user.territory_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? 'default' : 'secondary'}>
                        {user.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(user.id, user.active)}
                          data-testid={`btn-toggle-${user.id}`}
                        >
                          {user.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400" data-testid="no-users">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card className="hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Users</p>
                <p className="text-3xl font-bold text-blue-400" data-testid="stat-total-users">{users.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Users</p>
                <p className="text-3xl font-bold text-green-400" data-testid="stat-active-users">
                  {users.filter(u => u.active).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Admins</p>
                <p className="text-3xl font-bold text-red-400" data-testid="stat-admins">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Partners</p>
                <p className="text-3xl font-bold text-orange-400" data-testid="stat-partners">
                  {users.filter(u => u.role === 'partner').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/50">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
