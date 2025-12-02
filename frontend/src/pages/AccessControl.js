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

        <p className="text-white text-center">Access Control Module is loading. This is a placeholder to avoid compilation errors.</p>
      </div>
    </div>
  );
}
