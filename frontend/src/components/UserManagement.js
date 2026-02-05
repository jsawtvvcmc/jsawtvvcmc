import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Pencil, Trash2, UserX, UserCheck } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserManagement = () => {
  const { token, user, effectiveProjectId } = useAuth();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const isSuperAdmin = user?.role === 'Super Admin';
  
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    mobile: '',
    role: '',
    project_id: effectiveProjectId || '',
    password: ''  // Manual password (optional)
  });

  useEffect(() => {
    fetchUsers();
    if (isSuperAdmin) {
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProjectId]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter users by project if Super Admin has selected a project
      let filteredUsers = response.data;
      if (isSuperAdmin && effectiveProjectId) {
        // Show users belonging to selected project, users without project, and Super Admins
        filteredUsers = response.data.filter(u => 
          u.project_id === effectiveProjectId || 
          !u.project_id || 
          u.role === 'Super Admin'
        );
      } else if (!isSuperAdmin) {
        // Non-Super Admin sees only their project users
        filteredUsers = response.data.filter(u => 
          u.project_id === effectiveProjectId || 
          u.role === 'Super Admin'
        );
      }
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getErrorMessage = (error) => {
    const detail = error.response?.data?.detail;
    if (!detail) return 'Failed to create user';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      // Pydantic validation errors
      return detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
    }
    if (typeof detail === 'object') {
      return detail.msg || detail.message || JSON.stringify(detail);
    }
    return 'Failed to create user';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // For non-Super Admin, always use their project_id
      const submitData = {
        ...formData,
        project_id: isSuperAdmin ? formData.project_id : effectiveProjectId,
        password: formData.password || undefined  // Only send if provided
      };
      
      const response = await axios.post(`${API}/users`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: `User created successfully!` });
      setFormData({ 
        email: '', 
        first_name: '', 
        last_name: '', 
        mobile: '', 
        role: '',
        project_id: effectiveProjectId || '',
        password: ''
      });
      setShowForm(false);
      fetchUsers();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (userToEdit) => {
    setEditingUser({
      ...userToEdit,
      first_name: userToEdit.first_name,
      last_name: userToEdit.last_name,
      mobile: userToEdit.mobile,
      role: userToEdit.role,
      project_id: userToEdit.project_id || '',
      password: ''  // New password field (empty by default)
    });
  };

  const handleUpdateUser = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updateData = {
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        mobile: editingUser.mobile,
        role: editingUser.role,
        project_id: editingUser.project_id || null,
        is_active: editingUser.is_active
      };
      
      // Only include password if it's been changed
      if (editingUser.password) {
        updateData.password = editingUser.password;
      }
      
      await axios.put(`${API}/users/${editingUser.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'User updated successfully!' });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userToToggle) => {
    try {
      await axios.put(`${API}/users/${userToToggle.id}`, {
        is_active: !userToToggle.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ 
        type: 'success', 
        text: `User ${!userToToggle.is_active ? 'activated' : 'deactivated'} successfully!` 
      });
      fetchUsers();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error)
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API}/users/${deleteConfirm.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'User deleted successfully!' });
      setDeleteConfirm(null);
      fetchUsers();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error) 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Create and manage system users</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700"
          data-testid="add-user-button"
        >
          {showForm ? 'Cancel' : '+ Add User'}
        </Button>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
            <CardDescription>Enter user details. Password will be auto-generated.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                    data-testid="first-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    required
                    data-testid="last-name-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  data-testid="email-input"
                />
              </div>

              <div>
                <Label htmlFor="mobile">Mobile Number (10 digits) *</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  data-testid="mobile-input"
                />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select onValueChange={(value) => setFormData({...formData, role: value})} required>
                  <SelectTrigger data-testid="role-select">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value="Super Admin">Super Admin</SelectItem>}
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Driver">Driver</SelectItem>
                    <SelectItem value="Catcher">Catcher</SelectItem>
                    <SelectItem value="Veterinary Doctor">Veterinary Doctor</SelectItem>
                    <SelectItem value="Caretaker">Caretaker</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project Selection - Only for Super Admin and non-Super Admin roles */}
              {isSuperAdmin && formData.role && formData.role !== 'Super Admin' && (
                <div>
                  <Label htmlFor="project">Assign to Project *</Label>
                  <Select 
                    onValueChange={(value) => setFormData({...formData, project_id: value})} 
                    value={formData.project_id}
                    required
                  >
                    <SelectTrigger data-testid="project-select">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.organization_shortcode}-{project.project_code}: {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Password field */}
              <div>
                <Label htmlFor="password">Password (Optional - leave blank for auto-generated)</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter password or leave blank"
                  data-testid="password-input"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> {formData.password ? 'Using custom password' : `Auto-generated password: ${formData.first_name || 'FirstName'}#${formData.mobile.slice(-4) || '1234'}`}
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={loading || (isSuperAdmin && formData.role !== 'Super Admin' && !formData.project_id)}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="create-user-submit"
              >
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Existing Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Mobile</th>
                  <th className="text-left p-2">Role</th>
                  {isSuperAdmin && <th className="text-left p-2">Project</th>}
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{u.first_name} {u.last_name}</td>
                    <td className="p-2 text-sm">{u.email}</td>
                    <td className="p-2">{u.mobile}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        {u.role}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="p-2">
                        {u.role === 'Super Admin' ? (
                          <span className="text-gray-400 text-xs">All Projects</span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {projects.find(p => p.id === u.project_id)?.project_code || 'N/A'}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="p-2">
                      {u.is_active ? (
                        <span className="text-green-600">✓ Active</span>
                      ) : (
                        <span className="text-red-600">✗ Inactive</span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(u)}
                          className="h-7 w-7 p-0"
                          title="Edit User"
                          data-testid={`edit-user-${u.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(u)}
                          className={`h-7 w-7 p-0 ${u.is_active ? 'text-orange-600' : 'text-green-600'}`}
                          title={u.is_active ? 'Deactivate User' : 'Activate User'}
                          data-testid={`toggle-user-${u.id}`}
                        >
                          {u.is_active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                        </Button>
                        {u.id !== user?.id && u.role !== 'Super Admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(u)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                            title="Delete User"
                            data-testid={`delete-user-${u.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={editingUser.first_name}
                    onChange={(e) => setEditingUser({...editingUser, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={editingUser.last_name}
                    onChange={(e) => setEditingUser({...editingUser, last_name: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Mobile</Label>
                <Input
                  value={editingUser.mobile}
                  onChange={(e) => setEditingUser({...editingUser, mobile: e.target.value})}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value="Super Admin">Super Admin</SelectItem>}
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Driver">Driver</SelectItem>
                    <SelectItem value="Catcher">Catcher</SelectItem>
                    <SelectItem value="Veterinary Doctor">Veterinary Doctor</SelectItem>
                    <SelectItem value="Caretaker">Caretaker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isSuperAdmin && editingUser.role !== 'Super Admin' && (
                <div>
                  <Label>Project</Label>
                  <Select 
                    value={editingUser.project_id || ''} 
                    onValueChange={(value) => setEditingUser({...editingUser, project_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.organization_shortcode}-{project.project_code}: {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleUpdateUser} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteConfirm?.first_name} {deleteConfirm?.last_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button 
              onClick={handleDeleteUser} 
              disabled={loading} 
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;