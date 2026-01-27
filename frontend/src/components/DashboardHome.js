import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardHome = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API}/statistics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = 'green' }) => (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-3xl font-bold text-${color}-700 mt-2`}>{value}</p>
          </div>
          <div className={`text-4xl opacity-20`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="border-l-4 border-l-green-700 shadow-lg">
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

      {/* Statistics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overview Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            title="Total Cases" 
            value={stats?.total_cases || 0} 
            icon="📋" 
            color="blue"
          />
          <StatCard 
            title="Active Cases" 
            value={stats?.active_cases || 0} 
            icon="🔄" 
            color="green"
          />
          <StatCard 
            title="Total Surgeries" 
            value={stats?.total_surgeries || 0} 
            icon="⚕️" 
            color="red"
          />
          <StatCard 
            title="Occupied Kennels" 
            value={stats?.occupied_kennels || 0} 
            icon="🏘️" 
            color="orange"
          />
          <StatCard 
            title="Available Kennels" 
            value={stats?.available_kennels || 0} 
            icon="✅" 
            color="green"
          />
          <StatCard 
            title="Total Kennels" 
            value={stats?.total_kennels || 0} 
            icon="🏛️" 
            color="purple"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-purple-50">
          <CardTitle className="text-green-800">Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {user?.role === 'Driver' || user?.role === 'Super User' ? (
              <a href="/catching" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center">
                <div className="text-3xl mb-2">🚗</div>
                <p className="font-medium text-gray-900">New Catching</p>
              </a>
            ) : null}
            {user?.role === 'Catcher' || user?.role === 'Super User' ? (
              <a href="/observations" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center">
                <div className="text-3xl mb-2">📋</div>
                <p className="font-medium text-gray-900">Add Observation</p>
              </a>
            ) : null}
            {user?.role === 'Veterinary Doctor' || user?.role === 'Super User' ? (
              <a href="/surgery" className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-center">
                <div className="text-3xl mb-2">⚕️</div>
                <p className="font-medium text-gray-900">Surgery Form</p>
              </a>
            ) : null}
            {user?.role === 'Admin' || user?.role === 'Super User' ? (
              <a href="/treatment" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center">
                <div className="text-3xl mb-2">💊</div>
                <p className="font-medium text-gray-900">Daily Treatment</p>
              </a>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;