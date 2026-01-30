import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import axios from 'axios';
import { Settings as SettingsIcon, Building2, Cloud, Save, Upload, Image } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const { token } = useAuth();
  const [config, setConfig] = useState(null);
  const [driveStatus, setDriveStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const orgLogoRef = useRef(null);
  const municipalLogoRef = useRef(null);

  useEffect(() => {
    fetchConfig();
    checkDriveStatus();
    
    // Check URL params for drive connection result
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('drive_connected') === 'true') {
      setMessage({ type: 'success', text: 'Google Drive connected successfully!' });
      window.history.replaceState({}, document.title, window.location.pathname);
      checkDriveStatus();
    } else if (urlParams.get('drive_error')) {
      setMessage({ type: 'error', text: `Failed to connect: ${urlParams.get('drive_error')}` });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const checkDriveStatus = async () => {
    try {
      const response = await axios.get(`${API}/drive/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDriveStatus(response.data);
    } catch (error) {
      setDriveStatus({ connected: false });
    }
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(`${API}/config`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (logoType, file) => {
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Logo file must be less than 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await axios.post(`${API}/config/logo/${logoType}`, 
          { logo_base64: reader.result },
          { headers: { Authorization: `Bearer ${token}` }}
        );
        setMessage({ type: 'success', text: `${logoType === 'organization' ? 'Organization' : 'Municipal'} logo uploaded!` });
        fetchConfig();
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to upload logo' });
      }
    };
    reader.readAsDataURL(file);
  };

  const connectGoogleDrive = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/drive/connect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = response.data.authorization_url;
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to initiate Google Drive connection' });
      setLoading(false);
    }
  };

  const testDriveUpload = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.post(`${API}/drive/upload-test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Test upload successful! File: ${response.data.file.filename}` 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Upload test failed' });
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-8 h-8" />
          Configuration
        </h1>
        <p className="text-gray-600">Manage organization, project, and system settings</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} 
               className={message.type === 'success' ? 'border-green-500 bg-green-50' : ''}>
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : ''}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="organization">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="organization" data-testid="tab-organization">
            <Building2 className="w-4 h-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="project" data-testid="tab-project">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Project
          </TabsTrigger>
          <TabsTrigger value="cloud" data-testid="tab-cloud">
            <Cloud className="w-4 h-4 mr-2" />
            Cloud Storage
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Configure your organization information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="org_name">Organization Name *</Label>
                  <Input
                    id="org_name"
                    value={config.organization_name || ''}
                    onChange={(e) => handleConfigChange('organization_name', e.target.value)}
                    placeholder="e.g., Janice Smith Animal Welfare Trust"
                    data-testid="input-org-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="org_shortcode">Organization Short Code * (2-5 chars)</Label>
                  <Input
                    id="org_shortcode"
                    value={config.organization_shortcode || ''}
                    onChange={(e) => handleConfigChange('organization_shortcode', e.target.value.toUpperCase())}
                    placeholder="e.g., JS"
                    maxLength={5}
                    className="uppercase"
                    data-testid="input-org-shortcode"
                  />
                  <p className="text-xs text-gray-500">Used in case numbers: JS-TAL-JAN-0001</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registered_office">Registered Office Address *</Label>
                <Input
                  id="registered_office"
                  value={config.registered_office || ''}
                  onChange={(e) => handleConfigChange('registered_office', e.target.value)}
                  placeholder="Full registered office address"
                  data-testid="input-registered-office"
                />
              </div>

              {/* Organization Logo */}
              <div className="space-y-2">
                <Label>Organization Logo</Label>
                <div className="flex items-center gap-4">
                  {config.organization_logo ? (
                    <img 
                      src={config.organization_logo} 
                      alt="Organization Logo" 
                      className="w-20 h-20 object-contain border rounded"
                    />
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center text-gray-400">
                      <Image className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      ref={orgLogoRef}
                      onChange={(e) => handleLogoUpload('organization', e.target.files[0])}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => orgLogoRef.current?.click()}
                      data-testid="upload-org-logo"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">Max 2MB, JPG/PNG</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Tab */}
        <TabsContent value="project">
          <Card>
            <CardHeader>
              <CardTitle>Project Configuration</CardTitle>
              <CardDescription>Configure project-specific settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="project_name">Project Name *</Label>
                  <Input
                    id="project_name"
                    value={config.project_name || ''}
                    onChange={(e) => handleConfigChange('project_name', e.target.value)}
                    placeholder="e.g., Talegaon ABC Project"
                    data-testid="input-project-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project_code">Project Short Code * (2-5 chars)</Label>
                  <Input
                    id="project_code"
                    value={config.project_code || ''}
                    onChange={(e) => handleConfigChange('project_code', e.target.value.toUpperCase())}
                    placeholder="e.g., TAL"
                    maxLength={5}
                    className="uppercase"
                    data-testid="input-project-code"
                  />
                  <p className="text-xs text-gray-500">Used in case numbers: JS-TAL-JAN-0001</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_address">Project Address *</Label>
                <Input
                  id="project_address"
                  value={config.project_address || ''}
                  onChange={(e) => handleConfigChange('project_address', e.target.value)}
                  placeholder="Full project location address"
                  data-testid="input-project-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_kennels">Maximum Kennels (1-300)</Label>
                <Input
                  id="max_kennels"
                  type="number"
                  min="1"
                  max="300"
                  value={config.max_kennels || 300}
                  onChange={(e) => handleConfigChange('max_kennels', parseInt(e.target.value) || 300)}
                  data-testid="input-max-kennels"
                />
                <p className="text-xs text-gray-500">Kennel numbers will be 1 to {config.max_kennels || 300}</p>
              </div>

              {/* Municipal Logo */}
              <div className="space-y-2">
                <Label>Municipal Corporation Logo</Label>
                <div className="flex items-center gap-4">
                  {config.municipal_logo ? (
                    <img 
                      src={config.municipal_logo} 
                      alt="Municipal Logo" 
                      className="w-20 h-20 object-contain border rounded"
                    />
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center text-gray-400">
                      <Image className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      ref={municipalLogoRef}
                      onChange={(e) => handleLogoUpload('municipal', e.target.files[0])}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => municipalLogoRef.current?.click()}
                      data-testid="upload-municipal-logo"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">Max 2MB, JPG/PNG</p>
                  </div>
                </div>
              </div>

              {/* Case Number Preview */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Case Number Format Preview</h4>
                <p className="text-2xl font-mono text-blue-900">
                  {config.organization_shortcode || 'JS'}-{config.project_code || 'TAL'}-JAN-0001
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  Format: [Org Code]-[Project Code]-[Month]-[Serial]
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cloud Storage Tab */}
        <TabsContent value="cloud">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
                Your Google Drive Connection
              </CardTitle>
              <CardDescription>
                Connect your personal Google Drive to store case photos and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Multi-User Support:</strong> Each user connects their own Google Drive. Photos uploaded by you will be stored in your connected Drive account.
                </p>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className={`w-4 h-4 rounded-full ${driveStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div>
                  <span className="font-medium">
                    {driveStatus?.connected ? 'Connected' : 'Not Connected'}
                  </span>
                  {driveStatus?.user_email && (
                    <p className="text-sm text-gray-500">{driveStatus.user_email}</p>
                  )}
                  {driveStatus?.connected_at && (
                    <p className="text-xs text-gray-400">Connected on: {new Date(driveStatus.connected_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                {!driveStatus?.connected ? (
                  <Button 
                    onClick={connectGoogleDrive}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="connect-drive-btn"
                  >
                    {loading ? 'Connecting...' : 'Connect Your Google Drive'}
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={testDriveUpload}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="test-upload-btn"
                    >
                      {loading ? 'Testing...' : 'Test Upload'}
                    </Button>
                    <Button 
                      onClick={connectGoogleDrive}
                      disabled={loading}
                      variant="outline"
                    >
                      Reconnect Account
                    </Button>
                    <Button 
                      onClick={disconnectGoogleDrive}
                      disabled={loading}
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  </>
                )}
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">Folder Structure</h4>
                <p className="text-sm text-yellow-700 font-mono">
                  📁 Root Folder<br/>
                  &nbsp;&nbsp;├── 📁 Catching / Year / Month / a,b,c,d<br/>
                  &nbsp;&nbsp;├── 📁 Surgery / Year / Month / a,b,c,d<br/>
                  &nbsp;&nbsp;├── 📁 Release / Year / Month / a,b,c,d<br/>
                  &nbsp;&nbsp;├── 📁 Feeding / Year / Month / a,b,c,d<br/>
                  &nbsp;&nbsp;└── 📁 Post-op-care / Year / Month / a,b,c,d
                </p>
              </div>

              {/* Google Maps API Key */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                    <circle cx="12" cy="9" r="2.5" fill="white"/>
                  </svg>
                  Google Maps API (for Address Detection)
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Enter your Google Maps API key to enable accurate address detection from GPS coordinates.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="google_maps_api_key">Google Maps API Key</Label>
                  <Input
                    id="google_maps_api_key"
                    type="password"
                    value={config.google_maps_api_key || ''}
                    onChange={(e) => handleConfigChange('google_maps_api_key', e.target.value)}
                    placeholder="Enter your Google Maps API key"
                    data-testid="input-google-maps-key"
                  />
                  <p className="text-xs text-blue-600">
                    {config.google_maps_api_key ? '✅ API key configured - using Google Maps for geocoding' : '⚠️ No API key - using OpenStreetMap (free but less accurate)'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Get your API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a>. 
                    Enable the &quot;Geocoding API&quot; for your project.
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                <p><strong>Note:</strong> All photos from forms will be uploaded to the connected Google Drive account.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveConfig}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 px-8"
          data-testid="save-config-btn"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Version:</span>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <span className="text-gray-500">Max Kennels:</span>
              <p className="font-medium">{config.max_kennels}</p>
            </div>
            <div>
              <span className="text-gray-500">Cloud Provider:</span>
              <p className="font-medium">{config.cloud_provider === 'google_drive' ? 'Google Drive' : 'Not Set'}</p>
            </div>
            <div>
              <span className="text-gray-500">Last Updated:</span>
              <p className="font-medium">{config.updated_at ? new Date(config.updated_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
