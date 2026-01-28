import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const { token } = useAuth();
  const [driveStatus, setDriveStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    checkDriveStatus();
    
    // Check URL params for drive connection result
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('drive_connected') === 'true') {
      setMessage({ type: 'success', text: 'Google Drive connected successfully!' });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      checkDriveStatus();
    } else if (urlParams.get('drive_error')) {
      setMessage({ type: 'error', text: `Failed to connect: ${urlParams.get('drive_error')}` });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const connectGoogleDrive = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/drive/connect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Redirect to Google OAuth
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
          text: `Test upload successful! View file: ${response.data.file.direct_link}` 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Upload test failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure system settings and integrations</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>
            {message.text}
            {message.type === 'success' && message.text.includes('http') && (
              <a 
                href={message.text.split('View file: ')[1]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 underline"
              >
                Open File
              </a>
            )}
          </AlertDescription>
        </Alert>
      )}

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
            Google Drive Integration
          </CardTitle>
          <CardDescription>
            Connect Google Drive to store case photos and documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${driveStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">
              {driveStatus?.connected ? 'Connected' : 'Not Connected'}
            </span>
            {driveStatus?.user_email && (
              <span className="text-gray-500">({driveStatus.user_email})</span>
            )}
          </div>

          <div className="flex gap-3">
            {!driveStatus?.connected ? (
              <Button 
                onClick={connectGoogleDrive}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="connect-drive-btn"
              >
                {loading ? 'Connecting...' : 'Connect Google Drive'}
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
                  Reconnect
                </Button>
              </>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Connecting Google Drive allows the system to store photos directly in your Drive instead of the database.
            This improves performance and provides easy access to all case photos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Backend URL:</span>
              <p className="font-mono text-xs">{BACKEND_URL}</p>
            </div>
            <div>
              <span className="text-gray-500">Version:</span>
              <p>1.0.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
