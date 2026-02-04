import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(() => {
    const saved = localStorage.getItem('selectedProject');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      
      // Clear selected project on new login
      setSelectedProject(null);
      localStorage.removeItem('selectedProject');
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSelectedProject(null);
    localStorage.removeItem('token');
    localStorage.removeItem('selectedProject');
  };

  const selectProject = (project) => {
    setSelectedProject(project);
    localStorage.setItem('selectedProject', JSON.stringify(project));
  };

  const clearProjectSelection = () => {
    setSelectedProject(null);
    localStorage.removeItem('selectedProject');
  };

  // Check if user needs to select a project
  const needsProjectSelection = user?.role === 'Super Admin' && !selectedProject;

  // Get effective project_id (for Super Admin it's selected project, for others it's their own)
  const effectiveProjectId = user?.role === 'Super Admin' 
    ? selectedProject?.id 
    : user?.project_id;

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    selectedProject,
    selectProject,
    clearProjectSelection,
    needsProjectSelection,
    effectiveProjectId
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};