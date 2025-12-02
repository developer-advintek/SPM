import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Shield, Plus, Edit, Trash2, Users, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function AccessControl() {
  const { user, token } = useAuth();
  const [customRoles, setCustomRoles] = useState([]);
  const [customGroups, setCustomGroups] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    role_id: '',
    permissions: [],
    user_ids: []
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchCustomRoles();
    fetchCustomGroups();
    fetchAvailablePermissions();
    fetchAllUsers();
  }, []);

  const fetchCustomRoles = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/access-control/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomRoles(data.custom_roles || []);
      }
    } catch (error) {
      console.error('Error fetching custom roles:', error);
    }
  };

  const fetchCustomGroups = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/access-control/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching custom groups:', error);
    }
  };

  const fetchAvailablePermissions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/access-control/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailablePermissions(data.categories || {});
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingRole 
        ? `${BACKEND_URL}/api/access-control/roles/${editingRole.id}`
        : `${BACKEND_URL}/api/access-control/roles`;
      
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(roleFormData)
      });

      if (response.ok) {
        await fetchCustomRoles();
        setShowRoleForm(false);
        setEditingRole(null);
        setRoleFormData({ name: '', description: '', permissions: [] });
        alert(editingRole ? 'Role updated!' : 'Role created!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to save role');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Error saving role');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingGroup
        ? `${BACKEND_URL}/api/access-control/groups/${editingGroup.id}`
        : `${BACKEND_URL}/api/access-control/groups`;
      
      const method = editingGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(groupFormData)
      });

      if (response.ok) {
        await fetchCustomGroups();
        setShowGroupForm(false);
        setEditingGroup(null);
        setGroupFormData({ name: '', description: '', role_id: '', permissions: [], user_ids: [] });
        alert(editingGroup ? 'Group updated!' : 'Group created!');
      } else {
        alert('Failed to save group');
      }
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Error saving group');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/access-control/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchCustomRoles();
        alert('Role deleted!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/access-control/groups/${groupId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchCustomGroups();
        alert('Group deleted!');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
    setShowRoleForm(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description,
      role_id: group.role_id || '',
      permissions: group.permissions,
      user_ids: group.user_ids
    });
    setShowGroupForm(true);
  };

  const togglePermission = (permissionKey, isRole = true) => {
    if (isRole) {
      setRoleFormData(prev => ({
        ...prev,
        permissions: prev.permissions.includes(permissionKey)
          ? prev.permissions.filter(p => p !== permissionKey)
          : [...prev.permissions, permissionKey]
      }));
    } else {
      setGroupFormData(prev => ({
        ...prev,
        permissions: prev.permissions.includes(permissionKey)
          ? prev.permissions.filter(p => p !== permissionKey)
          : [...prev.permissions, permissionKey]
      }));
    }
  };

  const toggleUser = (userId) => {
    setGroupFormData(prev => ({
      ...prev,
      user_ids: prev.user_ids.includes(userId)
        ? prev.user_ids.filter(id => id !== userId)
        : [...prev.user_ids, userId]
    }));
  };

  const selectAllInCategory = (category, isRole = true) => {
    const categoryPermissions = availablePermissions[category]?.map(p => p.key) || [];
    if (isRole) {
      setRoleFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissions])]
      }));
    } else {
      setGroupFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissions])]
      }));
    }
  };

  const deselectAllInCategory = (category, isRole = true) => {
    const categoryPermissions = availablePermissions[category]?.map(p => p.key) || [];
    if (isRole) {
      setRoleFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPermissions.includes(p))
      }));
    } else {
      setGroupFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPermissions.includes(p))
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Access Control Management</h1>
          <p className="text-slate-300">Create custom roles and groups with granular permission control</p>
        </div>

        <Alert className="mb-6 bg-blue-500/20 border-blue-500/50">
          <Shield className="h-4 w-4 text-blue-200" />
          <AlertDescription className="text-blue-200">
            <strong>Granular Permission Control:</strong> Select specific functionalities that each role or group can access.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Custom Roles</p>
                  <p className="text-3xl font-bold text-white mt-2">{customRoles.length}</p>
                </div>
                <Shield className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Custom Groups</p>
                  <p className="text-3xl font-bold text-white mt-2">{customGroups.length}</p>
                </div>
                <Users className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Permissions</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {Object.values(availablePermissions).flat().length}
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Roles, Groups, Permissions */}
        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
            <TabsTrigger value="roles">Custom Roles</TabsTrigger>
            <TabsTrigger value="groups">Custom Groups</TabsTrigger>
            <TabsTrigger value="permissions">View All Permissions</TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Roles List */}
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Custom Roles</CardTitle>
                    <Button onClick={() => setShowRoleForm(!showRoleForm)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      New Role
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {customRoles.map(role => (
                      <Card key={role.id} className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white text-lg">{role.name}</h3>
                              <p className="text-slate-300 text-sm mt-1">{role.description}</p>
                              <Badge className="mt-2 bg-blue-600">{role.permissions?.length || 0} permissions</Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => handleEditRole(role)} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => handleDeleteRole(role.id)} size="sm" className="bg-red-600 hover:bg-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {customRoles.length === 0 && (
                      <p className="text-center text-slate-400 py-8">No custom roles yet. Create one to get started!</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Role Form */}
              {showRoleForm && (
                <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">{editingRole ? 'Edit Role' : 'Create New Role'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateRole} className="space-y-4">
                      <div>
                        <Label className="text-white">Role Name *</Label>
                        <Input
                          value={roleFormData.name}
                          onChange={e => setRoleFormData({...roleFormData, name: e.target.value})}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Description</Label>
                        <Input
                          value={roleFormData.description}
                          onChange={e => setRoleFormData({...roleFormData, description: e.target.value})}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-2 block">Permissions ({roleFormData.permissions.length} selected)</Label>
                        <div className="max-h-96 overflow-y-auto bg-black/20 rounded p-3 space-y-3">
                          {Object.entries(availablePermissions).map(([category, perms]) => (
                            <div key={category}>
                              <p className="text-blue-400 font-semibold text-sm mb-2">{category}</p>
                              <div className="space-y-1 pl-2">
                                {perms.map(perm => (
                                  <label key={perm.key || perm} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                                    <Checkbox
                                      checked={roleFormData.permissions.includes(perm.key || perm)}
                                      onCheckedChange={() => togglePermission(perm.key || perm, true)}
                                    />
                                    <span className="text-white text-sm">{(perm.name || perm).replace(/_/g, ' ')}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
                          {editingRole ? 'Update Role' : 'Create Role'}
                        </Button>
                        <Button type="button" onClick={() => { setShowRoleForm(false); setEditingRole(null); }} className="bg-gray-600 hover:bg-gray-700">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Groups List */}
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Custom Groups</CardTitle>
                    <Button onClick={() => setShowGroupForm(!showGroupForm)} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4 mr-2" />
                      New Group
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {customGroups.map(group => (
                      <Card key={group.id} className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white text-lg">{group.name}</h3>
                              <p className="text-slate-300 text-sm mt-1">{group.description}</p>
                              <div className="flex gap-3 mt-2">
                                <Badge className="bg-purple-600">{group.user_ids?.length || 0} users</Badge>
                                <Badge className="bg-blue-600">{group.permissions?.length || 0} permissions</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => handleEditGroup(group)} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => handleDeleteGroup(group.id)} size="sm" className="bg-red-600 hover:bg-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {customGroups.length === 0 && (
                      <p className="text-center text-slate-400 py-8">No custom groups yet. Create one to get started!</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Group Form */}
              {showGroupForm && (
                <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">{editingGroup ? 'Edit Group' : 'Create New Group'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateGroup} className="space-y-4">
                      <div>
                        <Label className="text-white">Group Name *</Label>
                        <Input
                          value={groupFormData.name}
                          onChange={e => setGroupFormData({...groupFormData, name: e.target.value})}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-white">Description</Label>
                        <Input
                          value={groupFormData.description}
                          onChange={e => setGroupFormData({...groupFormData, description: e.target.value})}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-2 block">Users ({groupFormData.user_ids.length} selected)</Label>
                        <div className="max-h-48 overflow-y-auto bg-black/20 rounded p-3 space-y-1">
                          {allUsers.map(u => (
                            <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                              <Checkbox
                                checked={groupFormData.user_ids.includes(u.id)}
                                onCheckedChange={() => toggleUser(u.id)}
                              />
                              <span className="text-white text-sm">{u.full_name} ({u.email})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-white mb-2 block">Permissions ({groupFormData.permissions.length} selected)</Label>
                        <div className="max-h-64 overflow-y-auto bg-black/20 rounded p-3 space-y-3">
                          {Object.entries(availablePermissions).map(([category, perms]) => (
                            <div key={category}>
                              <p className="text-purple-400 font-semibold text-sm mb-2">{category}</p>
                              <div className="space-y-1 pl-2">
                                {perms.map(perm => (
                                  <label key={perm.key || perm} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                                    <Checkbox
                                      checked={groupFormData.permissions.includes(perm.key || perm)}
                                      onCheckedChange={() => togglePermission(perm.key || perm, false)}
                                    />
                                    <span className="text-white text-sm">{(perm.name || perm).replace(/_/g, ' ')}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
                          {editingGroup ? 'Update Group' : 'Create Group'}
                        </Button>
                        <Button type="button" onClick={() => { setShowGroupForm(false); setEditingGroup(null); }} className="bg-gray-600 hover:bg-gray-700">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">All Available Permissions</CardTitle>
                <CardDescription className="text-slate-300">System-wide permissions that can be assigned to roles and groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(availablePermissions).map(([category, perms]) => (
                    <Card key={category} className="bg-white/5 border-white/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base">{category}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {perms.map(perm => (
                            <div key={perm.key || perm} className="flex items-center gap-2 p-2 bg-black/20 rounded">
                              <Shield className="h-4 w-4 text-green-400" />
                              <span className="text-white text-sm">{(perm.name || perm).replace(/_/g, ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
