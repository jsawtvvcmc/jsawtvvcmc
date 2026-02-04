import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Menu, X, Building2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

const Navigation = () => {
  const { user, logout, selectedProject, clearProjectSelection } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);

  // Main navigation items (non-operations)
  const mainItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠', roles: ['Super Admin', 'Admin', 'Driver', 'Catcher', 'Veterinary Doctor', 'Caretaker'] },
    { path: '/projects', label: 'Projects', icon: '🏢', roles: ['Super Admin'] },
  ];

  // Operations sub-menu items
  const operationsItems = [
    { path: '/catching', label: 'Catching', icon: '🚗', roles: ['Super Admin', 'Admin', 'Driver'] },
    { path: '/observations', label: 'Observations', icon: '📋', roles: ['Super Admin', 'Admin', 'Catcher'] },
    { path: '/surgery', label: 'Surgery', icon: '⚕️', roles: ['Super Admin', 'Admin', 'Veterinary Doctor'] },
    { path: '/treatment', label: 'Treatment', icon: '💊', roles: ['Super Admin', 'Admin'] },
    { path: '/feeding', label: 'Feeding', icon: '🍲', roles: ['Super Admin', 'Admin', 'Caretaker'] },
    { path: '/release', label: 'Release', icon: '✅', roles: ['Super Admin', 'Admin', 'Catcher', 'Caretaker'] },
    { path: '/records', label: 'Records', icon: '📑', roles: ['Super Admin', 'Admin'] },
    { path: '/medicines', label: 'Medicines', icon: '💊', roles: ['Super Admin', 'Admin'] },
    { path: '/food-stock', label: 'Food Stock', icon: '🍞', roles: ['Super Admin', 'Admin'] },
  ];

  // Admin/Settings items
  const adminItems = [
    { path: '/users', label: 'Users', icon: '👥', roles: ['Super Admin', 'Admin'] },
    { path: '/reports', label: 'Reports', icon: '📄', roles: ['Super Admin', 'Admin'] },
    { path: '/bulk-upload', label: 'Bulk Upload', icon: '📊', roles: ['Super Admin', 'Admin'] },
    { path: '/settings', label: 'Settings', icon: '⚙️', roles: ['Super Admin', 'Admin'] },
  ];

  const filterByRole = (items) => items.filter(item => item.roles.includes(user?.role));
  const filteredMainItems = filterByRole(mainItems);
  const filteredOperationsItems = filterByRole(operationsItems);
  const filteredAdminItems = filterByRole(adminItems);

  // Check if any operations item is active
  const isOperationsActive = filteredOperationsItems.some(item => location.pathname === item.path);

  const renderNavItem = (item, isSubItem = false) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors
          ${isSubItem ? 'pl-6 text-xs' : ''}
          ${isActive 
            ? 'bg-green-600 text-white' 
            : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
          }
        `}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span>{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-green-100 sticky top-0 z-50 px-4 py-2 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="font-bold text-green-800">J-APP</span>
        <Button 
          onClick={logout} 
          variant="outline" 
          size="sm"
          className="border-green-600 text-green-700 h-7 text-xs"
        >
          Logout
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full bg-white shadow-lg border-r border-green-100 z-40
        transition-transform duration-200 ease-in-out
        w-48 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-3 border-b border-green-100">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <img 
              src="/janice-trust-logo.jpg" 
              alt="Janice's Trust" 
              className="h-8 w-auto object-contain"
            />
            <div>
              <h1 className="text-sm font-bold text-green-800">J-APP</h1>
              <p className="text-[10px] text-purple-600">ABC Program</p>
            </div>
          </Link>
        </div>

        {/* Selected Project (for Super Admin) */}
        {user?.role === 'Super Admin' && selectedProject && (
          <div className="p-2 border-b border-green-100 bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 flex-1 min-w-0">
                <Building2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span className="text-[10px] font-medium text-green-800 truncate">
                  {selectedProject.project_code}
                </span>
              </div>
              <button
                onClick={clearProjectSelection}
                className="p-1 hover:bg-green-100 rounded text-green-600"
                title="Switch Project"
                data-testid="switch-project-button"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[9px] text-green-700 truncate mt-0.5">
              {selectedProject.project_name}
            </p>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-2 flex-1 overflow-y-auto">
          {/* Main Items */}
          {filteredMainItems.map((item) => renderNavItem(item))}

          {/* Operations Collapsible Menu */}
          {filteredOperationsItems.length > 0 && (
            <div className="mb-1">
              <button
                onClick={() => setOperationsOpen(!operationsOpen)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isOperationsActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                  }
                `}
                data-testid="nav-operations-toggle"
              >
                <div className="flex items-center space-x-2">
                  <span>🔧</span>
                  <span>Operations</span>
                </div>
                {operationsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {/* Operations Sub-items */}
              {operationsOpen && (
                <div className="mt-1 ml-2 border-l-2 border-green-200">
                  {filteredOperationsItems.map((item) => renderNavItem(item, true))}
                </div>
              )}
            </div>
          )}

          {/* Admin Items */}
          {filteredAdminItems.map((item) => renderNavItem(item))}
        </nav>

        {/* User info at bottom */}
        <div className="p-3 border-t border-green-100">
          <div className="mb-2">
            <p className="text-xs font-medium text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-[10px] text-gray-500">{user?.role}</p>
          </div>
          <Button 
            onClick={logout} 
            variant="outline" 
            size="sm"
            className="w-full border-green-600 text-green-700 hover:bg-green-50 h-7 text-xs"
            data-testid="logout-button"
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation;
