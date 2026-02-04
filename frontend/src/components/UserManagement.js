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
    project_id: effectiveProjectId || ''
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
      // Filter users by project if not Super Admin or if Super Admin has selected a project
      let filteredUsers = response.data;
      if (effectiveProjectId) {
        filteredUsers = response.data.filter(u => u.project_id === effectiveProjectId || u.role === 'Super Admin');
      }
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // For non-Super Admin, always use their project_id
      const submitData = {
        ...formData,
        project_id: isSuperAdmin ? formData.project_id : effectiveProjectId
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
        project_id: effectiveProjectId || ''
      });
      setShowForm(false);
      fetchUsers();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to create user' 
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

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Password will be auto-generated as: FirstName#Last4DigitsOfMobile
                  <br />
                  Example: {formData.first_name || 'John'}#{formData.mobile.slice(-4) || '1234'}
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
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{u.first_name} {u.last_name}</td>
                    <td className="p-2">{u.email}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;