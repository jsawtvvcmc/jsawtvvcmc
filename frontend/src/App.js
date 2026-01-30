import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Navigation from './components/Navigation';
import DashboardHome from './components/DashboardHome';
import UserManagement from './components/UserManagement';
import MedicineManagement from './components/MedicineManagement';
import FoodManagement from './components/FoodManagement';
import CatchingForm from './components/CatchingForm';
import InitialObservations from './components/InitialObservations';
import SurgeryForm from './components/SurgeryForm';
import DailyTreatment from './components/DailyTreatment';
import DailyFeeding from './components/DailyFeeding';
import ReleaseForm from './components/ReleaseForm';
import Reports from './components/Reports';
import Records from './components/Records';
import Settings from './components/Settings';
import BulkUpload from './components/BulkUpload';
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
      <main className="lg:ml-48 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
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
            <CatchingForm />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/observations" element={
        <PrivateRoute>
          <DashboardLayout>
            <InitialObservations />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/food-stock" element={
        <PrivateRoute>
          <DashboardLayout>
            <FoodManagement />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/surgery" element={
        <PrivateRoute>
          <DashboardLayout>
            <SurgeryForm />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/treatment" element={
        <PrivateRoute>
          <DashboardLayout>
            <DailyTreatment />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/feeding" element={
        <PrivateRoute>
          <DashboardLayout>
            <DailyFeeding />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/release" element={
        <PrivateRoute>
          <DashboardLayout>
            <ReleaseForm />
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
            <Reports />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/settings" element={
        <PrivateRoute>
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        </PrivateRoute>
      } />
      
      <Route path="/bulk-upload" element={
        <PrivateRoute>
          <DashboardLayout>
            <BulkUpload />
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