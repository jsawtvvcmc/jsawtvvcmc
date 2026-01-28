import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reports = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    caseNumber: ''
  });

  const [stats, setStats] = useState({
    totalCases: 0,
    surgeryCompleted: 0,
    released: 0,
    deceased: 0,
    cancelled: 0,
    underTreatment: 0
  });

  useEffect(() => {
    fetchAllCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    calculateStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases, filters]);

  const fetchAllCases = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(response.data);
      setFilteredCases(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch cases' });
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cases];

    if (filters.caseNumber) {
      filtered = filtered.filter(c => 
        c.case_number.toLowerCase().includes(filters.caseNumber.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    if (filters.startDate) {
      filtered = filtered.filter(c => 
        new Date(c.created_at) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(c => 
        new Date(c.created_at) <= endDate
      );
    }

    setFilteredCases(filtered);
  };

  const calculateStats = () => {
    const newStats = {
      totalCases: cases.length,
      surgeryCompleted: cases.filter(c => c.status === 'Surgery Completed' || c.status === 'Under Treatment').length,
      released: cases.filter(c => c.status === 'Released').length,
      deceased: cases.filter(c => c.status === 'Deceased').length,
      cancelled: cases.filter(c => c.status === 'Surgery Cancelled').length,
      underTreatment: cases.filter(c => c.status === 'Under Treatment').length
    };
    setStats(newStats);
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: '',
      caseNumber: ''
    });
  };

  const exportToCSV = () => {
    const csvData = filteredCases.map(c => ({
      'Case Number': c.case_number,
      'Status': c.status,
      'Created Date': new Date(c.created_at).toLocaleDateString(),
      'Location': c.catching?.address || '',
      'Kennel': c.initial_observation?.kennel_number || 'N/A',
      'Gender': c.initial_observation?.gender || 'N/A',
      'Surgery Date': c.surgery?.surgery_date ? new Date(c.surgery.surgery_date).toLocaleDateString() : 'N/A'
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abc-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getTodayCases = () => {
    const today = new Date().toDateString();
    return cases.filter(c => new Date(c.created_at).toDateString() === today);
  };

  const getThisMonthCases = () => {
    const now = new Date();
    return cases.filter(c => {
      const caseDate = new Date(c.created_at);
      return caseDate.getMonth() === now.getMonth() && 
             caseDate.getFullYear() === now.getFullYear();
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics 📊</h1>
        <p className="text-gray-600">View comprehensive reports and statistics</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          <TabsTrigger value="search">Case Search</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overall Statistics</CardTitle>
                <CardDescription>Complete system overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Cases</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.totalCases}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Surgeries Done</p>
                    <p className="text-3xl font-bold text-green-700">{stats.surgeryCompleted}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Under Treatment</p>
                    <p className="text-3xl font-bold text-purple-700">{stats.underTreatment}</p>
                  </div>
                  <div className="p-4 bg-teal-50 rounded-lg">
                    <p className="text-sm text-gray-600">Released</p>
                    <p className="text-3xl font-bold text-teal-700">{stats.released}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Deceased</p>
                    <p className="text-3xl font-bold text-red-700">{stats.deceased}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Cancelled</p>
                    <p className="text-3xl font-bold text-orange-700">{stats.cancelled}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
                    📥 Export All Cases (CSV)
                  </Button>
                  <Button onClick={fetchAllCases} variant="outline">
                    🔄 Refresh Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Daily Report Tab */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Report - {new Date().toLocaleDateString()}</CardTitle>
              <CardDescription>Cases registered today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-blue-50 rounded">
                <p className="text-lg font-semibold">Total Cases Today: {getTodayCases().length}</p>
              </div>
              {getTodayCases().length === 0 ? (
                <p className="text-gray-500 text-center py-8">No cases registered today</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Case No</th>
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTodayCases().map(c => (
                        <tr key={c.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{c.case_number}</td>
                          <td className="p-2">{new Date(c.created_at).toLocaleTimeString()}</td>
                          <td className="p-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              {c.status}
                            </span>
                          </td>
                          <td className="p-2 text-sm">{c.catching?.address?.substring(0, 50)}...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Report Tab */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Report - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
              <CardDescription>Cases this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-blue-50 rounded">
                <p className="text-lg font-semibold">Total Cases This Month: {getThisMonthCases().length}</p>
              </div>
              {getThisMonthCases().length === 0 ? (
                <p className="text-gray-500 text-center py-8">No cases this month</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-green-50 rounded">
                      <p className="text-xs text-gray-600">Surgeries</p>
                      <p className="text-2xl font-bold text-green-700">
                        {getThisMonthCases().filter(c => c.surgery).length}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-xs text-gray-600">Released</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {getThisMonthCases().filter(c => c.status === 'Released').length}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <p className="text-xs text-gray-600">Active</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {getThisMonthCases().filter(c => !['Released', 'Deceased', 'Surgery Cancelled'].includes(c.status)).length}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded">
                      <p className="text-xs text-gray-600">Deceased</p>
                      <p className="text-2xl font-bold text-red-700">
                        {getThisMonthCases().filter(c => c.status === 'Deceased').length}
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => exportToCSV()} className="bg-green-600 hover:bg-green-700">
                    📥 Export Monthly Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Case Search Tab */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Case Search & Filter</CardTitle>
              <CardDescription>Search and filter cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded">
                  <div>
                    <Label>Case Number</Label>
                    <Input
                      placeholder="JS/JAPP/JAN-0001"
                      value={filters.caseNumber}
                      onChange={(e) => setFilters({...filters, caseNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                      <option value="">All Statuses</option>
                      <option value="Caught">Caught</option>
                      <option value="In Kennel">In Kennel</option>
                      <option value="Surgery Completed">Surgery Completed</option>
                      <option value="Under Treatment">Under Treatment</option>
                      <option value="Released">Released</option>
                      <option value="Deceased">Deceased</option>
                      <option value="Surgery Cancelled">Surgery Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={resetFilters} variant="outline">
                    Clear Filters
                  </Button>
                  <Button onClick={() => exportToCSV()} className="bg-green-600 hover:bg-green-700">
                    📥 Export Filtered Results
                  </Button>
                </div>

                {/* Results */}
                <div className="border rounded p-2">
                  <p className="font-semibold mb-2">Results: {filteredCases.length} cases</p>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white">
                        <tr className="border-b">
                          <th className="text-left p-2">Case No</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Kennel</th>
                          <th className="text-left p-2">Gender</th>
                          <th className="text-left p-2">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCases.map(c => (
                          <tr key={c.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{c.case_number}</td>
                            <td className="p-2 text-sm">{new Date(c.created_at).toLocaleDateString()}</td>
                            <td className="p-2">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                {c.status}
                              </span>
                            </td>
                            <td className="p-2">{c.initial_observation?.kennel_number || 'N/A'}</td>
                            <td className="p-2">{c.initial_observation?.gender || 'N/A'}</td>
                            <td className="p-2 text-xs">{c.catching?.address?.substring(0, 40)}...</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
