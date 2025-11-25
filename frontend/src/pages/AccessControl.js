import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Shield, Plus, Edit, Trash2, Users, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

function AccessControl() {
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
      const response = await fetch(`${BACKEND_URL}/api/roles/custom`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomRoles(data);
      }
    } catch (error) {
      console.error('Error fetching custom roles:', error);
    }
  };

  const fetchCustomGroups = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/groups/custom`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCustomGroups(data);
      }
    } catch (error) {
      console.error('Error fetching custom groups:', error);
    }
  };

  const fetchAvailablePermissions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/permissions/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailablePermissions(data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
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
        ? `${BACKEND_URL}/api/roles/custom/${editingRole.id}`
        : `${BACKEND_URL}/api/roles/custom`;
      
      const method = editingRole ? 'PATCH' : 'POST';

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
        alert('Failed to save role');
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
        ? `${BACKEND_URL}/api/groups/custom/${editingGroup.id}`
        : `${BACKEND_URL}/api/groups/custom`;
      
      const method = editingGroup ? 'PATCH' : 'POST';

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
      const response = await fetch(`${BACKEND_URL}/api/roles/custom/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchCustomRoles();
        alert('Role deleted!');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/groups/custom/${groupId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchCustomGroups();
        alert('Group deleted!');
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
    <div className=\"min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8\">
      <div className=\"max-w-7xl mx-auto\">
        <div className=\"mb-8\">
          <h1 className=\"text-4xl font-bold text-white mb-2\">Access Control Management</h1>
          <p className=\"text-slate-300\">Create custom roles and groups with granular permission control</p>
        </div>

        <Alert className=\"mb-6 bg-blue-500/20 border-blue-500/50\">
          <Shield className=\"h-4 w-4 text-blue-200\" />
          <AlertDescription className=\"text-blue-200\">
            <strong>Granular Permission Control:</strong> Select specific functionalities that each role or group can access. Only checked permissions will be granted.
          </AlertDescription>
        </Alert>

        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4 mb-8\">
          <Card className=\"bg-gradient-to-br from-blue-500 to-blue-600 border-0\">
            <CardContent className=\"p-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-blue-100 text-sm\">Custom Roles</p>
                  <p className=\"text-3xl font-bold text-white mt-2\">{customRoles.length}</p>
                </div>
                <Shield className=\"h-12 w-12 text-blue-200\" />
              </div>
            </CardContent>
          </Card>

          <Card className=\"bg-gradient-to-br from-purple-500 to-purple-600 border-0\">
            <CardContent className=\"p-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-purple-100 text-sm\">Custom Groups</p>
                  <p className=\"text-3xl font-bold text-white mt-2\">{customGroups.length}</p>
                </div>
                <Users className=\"h-12 w-12 text-purple-200\" />
              </div>
            </CardContent>
          </Card>

          <Card className=\"bg-gradient-to-br from-green-500 to-green-600 border-0\">
            <CardContent className=\"p-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-green-100 text-sm\">Permissions</p>
                  <p className=\"text-3xl font-bold text-white mt-2\">
                    {Object.values(availablePermissions).flat().length}
                  </p>
                </div>
                <CheckCircle className=\"h-12 w-12 text-green-200\" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue=\"roles\" className=\"w-full\">
          <TabsList className=\"bg-white/10 backdrop-blur-lg border-white/20\">
            <TabsTrigger value=\"roles\" className=\"data-[state=active]:bg-blue-600\">Custom Roles</TabsTrigger>
            <TabsTrigger value=\"groups\" className=\"data-[state=active]:bg-blue-600\">Custom Groups</TabsTrigger>
          </TabsList>

          {/* Custom Roles Tab */}
          <TabsContent value=\"roles\" className=\"mt-6\">
            <div className=\"mb-6\">
              <Button
                onClick={() => {
                  setShowRoleForm(!showRoleForm);
                  setEditingRole(null);
                  setRoleFormData({ name: '', description: '', permissions: [] });
                }}
                className=\"bg-blue-600 hover:bg-blue-700\"
                data-testid=\"create-role-btn\"
              >
                <Plus className=\"h-4 w-4 mr-2\" />
                {showRoleForm ? 'Cancel' : 'Create Custom Role'}
              </Button>
            </div>

            {showRoleForm && (
              <Card className=\"bg-white/10 backdrop-blur-lg border-white/20 mb-8\">
                <CardHeader>
                  <CardTitle className=\"text-white\">
                    {editingRole ? 'Edit Custom Role' : 'Create New Custom Role'}
                  </CardTitle>
                  <CardDescription className=\"text-slate-300\">
                    Select specific permissions for this role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateRole} className=\"space-y-6\">
                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
                      <div>
                        <Label className=\"text-white\">Role Name *</Label>
                        <Input
                          value={roleFormData.name}
                          onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                          className=\"bg-white/10 border-white/20 text-white\"
                          required
                          placeholder=\"e.g., Regional Manager\"
                        />
                      </div>
                      <div>
                        <Label className=\"text-white\">Description *</Label>
                        <Input
                          value={roleFormData.description}
                          onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                          className=\"bg-white/10 border-white/20 text-white\"
                          required
                          placeholder=\"e.g., Manages regional operations\"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className=\"text-white mb-4 block text-lg\">
                        Select Permissions ({roleFormData.permissions.length} selected)
                      </Label>
                      <div className=\"space-y-4 max-h-96 overflow-y-auto p-4 bg-white/5 rounded-lg\">
                        {Object.entries(availablePermissions).map(([category, permissions]) => (
                          <div key={category} className=\"border border-white/20 rounded-lg p-4\">
                            <div className=\"flex items-center justify-between mb-3\">
                              <h3 className=\"text-white font-semibold capitalize\">
                                {category.replace(/_/g, ' ')}
                              </h3>
                              <div className=\"space-x-2\">
                                <Button
                                  type=\"button\"
                                  onClick={() => selectAllInCategory(category, true)}
                                  className=\"bg-green-600 hover:bg-green-700 text-xs\"
                                  size=\"sm\"
                                >
                                  Select All
                                </Button>
                                <Button
                                  type=\"button\"
                                  onClick={() => deselectAllInCategory(category, true)}
                                  className=\"bg-red-600 hover:bg-red-700 text-xs\"
                                  size=\"sm\"
                                >
                                  Deselect All
                                </Button>
                              </div>
                            </div>
                            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-3\">
                              {permissions.map((permission) => (
                                <div
                                  key={permission.key}
                                  className=\"flex items-start space-x-2 p-2 hover:bg-white/10 rounded cursor-pointer\"
                                  onClick={() => togglePermission(permission.key, true)}
                                >
                                  <Checkbox
                                    checked={roleFormData.permissions.includes(permission.key)}
                                    onCheckedChange={() => togglePermission(permission.key, true)}
                                    className=\"mt-1\"
                                  />
                                  <div className=\"flex-1\">
                                    <label className=\"text-white text-sm font-medium cursor-pointer\">
                                      {permission.label}
                                    </label>
                                    <p className=\"text-slate-400 text-xs\">{permission.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      type=\"submit\"
                      disabled={loading || roleFormData.permissions.length === 0}
                      className=\"w-full bg-green-600 hover:bg-green-700\"
                    >
                      {loading ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
              {customRoles.map(role => (
                <Card key={role.id} className=\"bg-white/10 backdrop-blur-lg border-white/20\">
                  <CardHeader>
                    <div className=\"flex items-start justify-between\">
                      <div>
                        <CardTitle className=\"text-white\">{role.name}</CardTitle>
                        <CardDescription className=\"text-slate-300\">{role.description}</CardDescription>
                      </div>
                      <div className=\"flex gap-2\">
                        <Button
                          onClick={() => handleEditRole(role)}
                          variant=\"outline\"
                          size=\"sm\"
                          className=\"bg-blue-600 hover:bg-blue-700 text-white border-0\"
                        >
                          <Edit className=\"h-4 w-4\" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteRole(role.id)}
                          variant=\"outline\"
                          size=\"sm\"
                          className=\"bg-red-600 hover:bg-red-700 text-white border-0\"
                        >
                          <Trash2 className=\"h-4 w-4\" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className=\"space-y-2\">
                      <p className=\"text-white text-sm font-semibold\">
                        {role.permissions.length} Permissions Granted
                      </p>
                      <div className=\"flex flex-wrap gap-2\">
                        {role.permissions.slice(0, 6).map((perm, idx) => (
                          <Badge key={idx} variant=\"outline\" className=\"text-xs text-white border-white/30\">
                            {perm.split('.').pop()}
                          </Badge>
                        ))}
                        {role.permissions.length > 6 && (
                          <Badge variant=\"outline\" className=\"text-xs text-white border-white/30\">
                            +{role.permissions.length - 6} more
                          </Badge>
                        )}
                      </div>
                      <p className=\"text-slate-400 text-xs mt-3\">
                        Created: {new Date(role.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {customRoles.length === 0 && !showRoleForm && (
              <Card className=\"bg-white/10 backdrop-blur-lg border-white/20\">
                <CardContent className=\"p-12 text-center\">
                  <Shield className=\"h-16 w-16 text-slate-400 mx-auto mb-4\" />
                  <p className=\"text-slate-300 mb-4\">No custom roles created yet</p>
                  <Button
                    onClick={() => setShowRoleForm(true)}
                    className=\"bg-blue-600 hover:bg-blue-700\"
                  >
                    Create Your First Custom Role
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Custom Groups Tab */}
          <TabsContent value=\"groups\" className=\"mt-6\">
            <div className=\"mb-6\">
              <Button
                onClick={() => {
                  setShowGroupForm(!showGroupForm);
                  setEditingGroup(null);
                  setGroupFormData({ name: '', description: '', role_id: '', permissions: [], user_ids: [] });
                }}
                className=\"bg-purple-600 hover:bg-purple-700\"
                data-testid=\"create-group-btn\"
              >
                <Plus className=\"h-4 w-4 mr-2\" />
                {showGroupForm ? 'Cancel' : 'Create Custom Group'}
              </Button>
            </div>

            {showGroupForm && (
              <Card className=\"bg-white/10 backdrop-blur-lg border-white/20 mb-8\">
                <CardHeader>
                  <CardTitle className=\"text-white\">
                    {editingGroup ? 'Edit Custom Group' : 'Create New Custom Group'}
                  </CardTitle>
                  <CardDescription className=\"text-slate-300\">
                    Assign users and permissions to this group
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateGroup} className=\"space-y-6\">
                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
                      <div>
                        <Label className=\"text-white\">Group Name *</Label>
                        <Input
                          value={groupFormData.name}
                          onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                          className=\"bg-white/10 border-white/20 text-white\"
                          required
                          placeholder=\"e.g., Finance Team\"
                        />
                      </div>
                      <div>
                        <Label className=\"text-white\">Description *</Label>
                        <Input
                          value={groupFormData.description}
                          onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                          className=\"bg-white/10 border-white/20 text-white\"
                          required
                          placeholder=\"e.g., Financial operations team\"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className=\"text-white mb-3 block\">Assign Users ({groupFormData.user_ids.length} selected)</Label>
                      <div className=\"grid grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-4 bg-white/5 rounded-lg\">
                        {allUsers.map(u => (
                          <div
                            key={u.id}
                            onClick={() => toggleUser(u.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${
                              groupFormData.user_ids.includes(u.id)
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                            }`}
                          >
                            <div className=\"font-medium text-sm\">{u.full_name}</div>
                            <div className=\"text-xs opacity-80\">{u.role}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className=\"text-white mb-4 block text-lg\">
                        Select Permissions ({groupFormData.permissions.length} selected)
                      </Label>
                      <div className=\"space-y-4 max-h-96 overflow-y-auto p-4 bg-white/5 rounded-lg\">
                        {Object.entries(availablePermissions).map(([category, permissions]) => (
                          <div key={category} className=\"border border-white/20 rounded-lg p-4\">
                            <div className=\"flex items-center justify-between mb-3\">
                              <h3 className=\"text-white font-semibold capitalize\">
                                {category.replace(/_/g, ' ')}
                              </h3>
                              <div className=\"space-x-2\">
                                <Button
                                  type=\"button\"
                                  onClick={() => selectAllInCategory(category, false)}
                                  className=\"bg-green-600 hover:bg-green-700 text-xs\"
                                  size=\"sm\"
                                >
                                  Select All
                                </Button>
                                <Button
                                  type=\"button\"
                                  onClick={() => deselectAllInCategory(category, false)}
                                  className=\"bg-red-600 hover:bg-red-700 text-xs\"
                                  size=\"sm\"
                                >
                                  Deselect All
                                </Button>
                              </div>
                            </div>
                            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-3\">
                              {permissions.map((permission) => (
                                <div
                                  key={permission.key}
                                  className=\"flex items-start space-x-2 p-2 hover:bg-white/10 rounded cursor-pointer\"
                                  onClick={() => togglePermission(permission.key, false)}
                                >
                                  <Checkbox
                                    checked={groupFormData.permissions.includes(permission.key)}
                                    onCheckedChange={() => togglePermission(permission.key, false)}
                                    className=\"mt-1\"
                                  />
                                  <div className=\"flex-1\">
                                    <label className=\"text-white text-sm font-medium cursor-pointer\">
                                      {permission.label}
                                    </label>
                                    <p className=\"text-slate-400 text-xs\">{permission.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      type=\"submit\"
                      disabled={loading || groupFormData.permissions.length === 0}
                      className=\"w-full bg-green-600 hover:bg-green-700\"
                    >
                      {loading ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
              {customGroups.map(group => (
                <Card key={group.id} className=\"bg-white/10 backdrop-blur-lg border-white/20\">
                  <CardHeader>
                    <div className=\"flex items-start justify-between\">
                      <div>
                        <CardTitle className=\"text-white\">{group.name}</CardTitle>
                        <CardDescription className=\"text-slate-300\">{group.description}</CardDescription>
                      </div>
                      <div className=\"flex gap-2\">
                        <Button
                          onClick={() => handleEditGroup(group)}
                          variant=\"outline\"
                          size=\"sm\"
                          className=\"bg-blue-600 hover:bg-blue-700 text-white border-0\"
                        >
                          <Edit className=\"h-4 w-4\" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteGroup(group.id)}
                          variant=\"outline\"
                          size=\"sm\"
                          className=\"bg-red-600 hover:bg-red-700 text-white border-0\"
                        >
                          <Trash2 className=\"h-4 w-4\" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className=\"space-y-3\">
                      <div>
                        <p className=\"text-white text-sm font-semibold mb-2\">
                          {group.user_ids.length} Users Assigned
                        </p>
                        <p className=\"text-white text-sm font-semibold\">
                          {group.permissions.length} Permissions Granted
                        </p>
                      </div>
                      <div className=\"flex flex-wrap gap-2\">
                        {group.permissions.slice(0, 6).map((perm, idx) => (
                          <Badge key={idx} variant=\"outline\" className=\"text-xs text-white border-white/30\">
                            {perm.split('.').pop()}
                          </Badge>
                        ))}
                        {group.permissions.length > 6 && (
                          <Badge variant=\"outline\" className=\"text-xs text-white border-white/30\">
                            +{group.permissions.length - 6} more
                          </Badge>
                        )}
                      </div>
                      <p className=\"text-slate-400 text-xs mt-3\">
                        Created: {new Date(group.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {customGroups.length === 0 && !showGroupForm && (
              <Card className=\"bg-white/10 backdrop-blur-lg border-white/20\">
                <CardContent className=\"p-12 text-center\">
                  <Users className=\"h-16 w-16 text-slate-400 mx-auto mb-4\" />
                  <p className=\"text-slate-300 mb-4\">No custom groups created yet</p>
                  <Button
                    onClick={() => setShowGroupForm(true)}
                    className=\"bg-purple-600 hover:bg-purple-700\"
                  >
                    Create Your First Custom Group
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AccessControl;
