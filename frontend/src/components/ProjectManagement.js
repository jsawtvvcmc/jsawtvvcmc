import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Building2, Users, MapPin, Calendar, CheckCircle, XCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ProjectManagement = () => {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newProject, setNewProject] = useState({
    organization_name: 'Janice Smith Animal Welfare Trust',
    organization_shortcode: 'JS',
    project_name: '',
    project_code: '',
    project_address: '',
    max_kennels: 300,
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
    admin_mobile: '',
    admin_password: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.clone().json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      // Validate project code
      if (newProject.project_code.length !== 3 || !/^[A-Za-z]+$/.test(newProject.project_code)) {
        throw new Error('Project code must be exactly 3 letters');
      }

      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProject)
      });

      let data;
      try {
        data = await response.clone().json();
      } catch (parseError) {
        const text = await response.text();
        throw new Error(`Server error: ${text || response.statusText}`);
      }
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create project');
      }

      // Success - refresh projects and close dialog
      await fetchProjects();
      setIsCreateDialogOpen(false);
      setNewProject({
        organization_name: 'Janice Smith Animal Welfare Trust',
        organization_shortcode: 'JS',
        project_name: '',
        project_code: '',
        project_address: '',
        max_kennels: 300,
        admin_first_name: '',
        admin_last_name: '',
        admin_email: '',
        admin_mobile: '',
        admin_password: ''
      });
      alert(`Project created successfully!\n\nAdmin Email: ${data.admin_email}\nProject URL: ${data.project_url}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (field, value) => {
    setNewProject(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Only Super Admin can access this page
  if (user?.role !== 'Super Admin') {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">Access denied. Only Super Admin can manage projects.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
          <p className="text-gray-500 mt-1">Create and manage ABC projects for different cities</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700" data-testid="create-project-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new ABC project for a city or municipal corporation
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateProject} className="space-y-6 mt-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              {/* Organization Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Organization Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="org_name">Organization Name</Label>
                    <Input
                      id="org_name"
                      value={newProject.organization_name}
                      onChange={(e) => handleInputChange('organization_name', e.target.value)}
                      placeholder="Janice Smith Animal Welfare Trust"
                    />
                  </div>
                  <div>
                    <Label htmlFor="org_code">Organization Code (2 letters)</Label>
                    <Input
                      id="org_code"
                      value={newProject.organization_shortcode}
                      onChange={(e) => handleInputChange('organization_shortcode', e.target.value.toUpperCase())}
                      placeholder="JS"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              {/* Project Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Project Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="project_name">Project Name *</Label>
                    <Input
                      id="project_name"
                      value={newProject.project_name}
                      onChange={(e) => handleInputChange('project_name', e.target.value)}
                      placeholder="e.g., Vasai Virar Municipal Corporation ABC Project"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="project_code">Project Code (3 letters) *</Label>
                    <Input
                      id="project_code"
                      value={newProject.project_code}
                      onChange={(e) => handleInputChange('project_code', e.target.value.toUpperCase())}
                      placeholder="e.g., VVC"
                      maxLength={3}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Used in case numbers: JS-VVC-JAN-C0001</p>
                  </div>
                  <div>
                    <Label htmlFor="max_kennels">Max Kennels</Label>
                    <Input
                      id="max_kennels"
                      type="number"
                      value={newProject.max_kennels}
                      onChange={(e) => handleInputChange('max_kennels', parseInt(e.target.value) || 300)}
                      min={1}
                      max={500}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="project_address">Project Address</Label>
                    <Input
                      id="project_address"
                      value={newProject.project_address}
                      onChange={(e) => handleInputChange('project_address', e.target.value)}
                      placeholder="Full address of the project location"
                    />
                  </div>
                </div>
              </div>

              {/* Admin User Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Project Admin User</h3>
                <p className="text-sm text-gray-500">This user will have Admin access to manage this project</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin_first_name">First Name *</Label>
                    <Input
                      id="admin_first_name"
                      value={newProject.admin_first_name}
                      onChange={(e) => handleInputChange('admin_first_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin_last_name">Last Name *</Label>
                    <Input
                      id="admin_last_name"
                      value={newProject.admin_last_name}
                      onChange={(e) => handleInputChange('admin_last_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin_email">Email *</Label>
                    <Input
                      id="admin_email"
                      type="email"
                      value={newProject.admin_email}
                      onChange={(e) => handleInputChange('admin_email', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin_mobile">Mobile *</Label>
                    <Input
                      id="admin_mobile"
                      value={newProject.admin_mobile}
                      onChange={(e) => handleInputChange('admin_mobile', e.target.value)}
                      placeholder="10 digit mobile"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="admin_password">Password *</Label>
                    <Input
                      id="admin_password"
                      type="password"
                      value={newProject.admin_password}
                      onChange={(e) => handleInputChange('admin_password', e.target.value)}
                      placeholder="Min 8 characters"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={creating}
                  data-testid="submit-create-project"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
            <p className="text-gray-500 mt-1">Create your first ABC project to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow" data-testid={`project-card-${project.project_code}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{project.project_name}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {project.organization_shortcode}-{project.project_code}
                      </span>
                    </CardDescription>
                  </div>
                  {project.status === 'Active' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{project.organization_name}</p>
                </div>
                
                {project.project_address && (
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{project.project_address}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{project.max_kennels} kennels</span>
                  </div>
                </div>
                
                {project.created_at && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    Case Number Format: <code className="bg-gray-100 px-1 rounded">{project.organization_shortcode}-{project.project_code}-MMM-C0001</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
