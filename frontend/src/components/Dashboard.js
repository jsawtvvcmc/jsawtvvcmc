import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const getRoleCapabilities = (role) => {
    const capabilities = {
      'Super User': [
        'All sections access',
        'User Management',
        'All reports',
        'Bulk data generator',
        'System configuration'
      ],
      'Admin': [
        'Daily Treatment form',
        'Mortality form',
        'Medicine stock management',
        'Food stock management',
        'User management'
      ],
      'Driver': [
        'Catching Form',
        'GPS location capture',
        'Photo upload'
      ],
      'Catcher': [
        'Initial Observations Form',
        'Release details',
        'Photo documentation'
      ],
      'Veterinary Doctor': [
        'Surgery form',
        'Pre-surgery assessment',
        'Post-surgery status'
      ],
      'Caretaker': [
        'Daily Feeding form',
        'Despatch form',
        'Animal care records'
      ]
    };
    return capabilities[role] || [];
  };

  const capabilities = getRoleCapabilities(user?.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ABC Program</h1>
                <p className="text-xs text-gray-500">Animal Birth Control Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <Button 
                onClick={logout} 
                variant="outline" 
                size="sm"
                data-testid="logout-button"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 border-l-4 border-l-green-600">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome, {user?.first_name}! 👋</CardTitle>
            <CardDescription>
              You are logged in as <strong>{user?.role}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-4 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Email:</strong> {user?.email} | <strong>Mobile:</strong> {user?.mobile}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Your Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle>Your Access & Capabilities</CardTitle>
            <CardDescription>
              Based on your role, you have access to the following features:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {capabilities.map((capability, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{capability}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Coming Soon Section */}
        <div className="mt-8 text-center p-8 bg-white rounded-lg shadow-sm">
          <div className="text-4xl mb-4">🚧</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Workflow Forms Coming Soon</h3>
          <p className="text-gray-600">
            Complete workflow management including Catching, Surgery, Treatment, Feeding, and Release forms are being built.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;