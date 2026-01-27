import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Navigation from './components/Navigation';
import DashboardHome from './components/DashboardHome';
import UserManagement from './components/UserManagement';
import MedicineManagement from './components/MedicineManagement';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" /> : children;
};

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-purple-50 to-green-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

const ComingSoon = ({ title, description }) => (
  <div className="text-center p-12 bg-white rounded-lg shadow-lg border-2 border-dashed border-green-200">
    <div className="text-6xl mb-4">\ud83d\udea7</div>
    <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
    <p className="text-gray-600">{description}</p>
  </div>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      <Route path="/dashboard" element={
        <PrivateRoute>
          <DashboardLayout>
            <DashboardHome />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/catching" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Catching Form" description="Capture animal location with GPS and photos" />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/observations" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Initial Observations" description="Record animal details and assign kennels" />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/surgery" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Surgery Form" description="Record surgery details and outcomes" />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/treatment" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Daily Treatment" description="Track daily animal treatment and medicine usage" />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/feeding" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Daily Feeding" description="Record feeding activities and food consumption" />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/release" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Release/Dispatch" description="Document animal release with GPS location" />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/medicines" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Medicine Management" description="Manage medicine inventory and stock" />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/food-stock" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Food Stock Management" description="Track food inventory and consumption" />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/users" element={
        <PrivateRoute>
          <DashboardLayout>
            <UserManagement />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/medicines" element={
        <PrivateRoute>
          <DashboardLayout>
            <MedicineManagement />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/reports" element={
        <PrivateRoute>
          <DashboardLayout>
            <ComingSoon title="Reports & Analytics" description="View comprehensive reports and statistics" />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;