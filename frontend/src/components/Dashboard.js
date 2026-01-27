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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-purple-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img 
                src="/janice-trust-logo.jpg" 
                alt="Janice's Trust" 
                className="h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-green-800">J-APP Management System</h1>
                <p className="text-xs text-purple-600">Animal Birth Control Program</p>
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
                className="border-green-600 text-green-700 hover:bg-green-50"
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
        <Card className="mb-8 border-l-4 border-l-green-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-green-800">Welcome, {user?.first_name}! 👋</CardTitle>
            <CardDescription>
              You are logged in as <strong>{user?.role}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-green-50 to-purple-50 p-4 rounded-md border border-green-200">
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> {user?.email} | <strong>Mobile:</strong> {user?.mobile}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Your Capabilities */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-purple-50">
            <CardTitle className="text-green-800">Your Access & Capabilities</CardTitle>
            <CardDescription>
              Based on your role, you have access to the following features:
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {capabilities.map((capability, index) => (
                <li key={index} className="flex items-center space-x-3 p-2 hover:bg-green-50 rounded-md transition-colors">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">{capability}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Coming Soon Section */}
        <div className="mt-8 text-center p-8 bg-white rounded-lg shadow-lg border-2 border-dashed border-green-200">
          <div className="text-5xl mb-4">🚧</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Workflow Forms Coming Soon</h3>
          <p className="text-gray-600 mb-4">
            Complete workflow management including Catching, Surgery, Treatment, Feeding, and Release forms are being built.
          </p>
          <div className="inline-flex items-center space-x-2 text-green-700">
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-medium">In Development</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;