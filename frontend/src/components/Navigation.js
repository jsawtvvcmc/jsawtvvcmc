import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';

const Navigation = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getNavigationItems = (role) => {
    const allItems = [
      { path: '/dashboard', label: 'Dashboard', icon: '🏠', roles: ['Super User', 'Admin', 'Driver', 'Catcher', 'Veterinary Doctor', 'Caretaker'] },
      { path: '/catching', label: 'Catching', icon: '🚗', roles: ['Super User', 'Driver'] },
      { path: '/observations', label: 'Observations', icon: '📋', roles: ['Super User', 'Catcher'] },
      { path: '/surgery', label: 'Surgery', icon: '⚕️', roles: ['Super User', 'Veterinary Doctor'] },
      { path: '/treatment', label: 'Treatment', icon: '💊', roles: ['Super User', 'Admin'] },
      { path: '/feeding', label: 'Feeding', icon: '🍲', roles: ['Super User', 'Caretaker'] },
      { path: '/release', label: 'Release', icon: '✅', roles: ['Super User', 'Catcher', 'Caretaker'] },
      { path: '/medicines', label: 'Medicines', icon: '💊', roles: ['Super User', 'Admin'] },
      { path: '/food-stock', label: 'Food Stock', icon: '🍞', roles: ['Super User', 'Admin'] },
      { path: '/users', label: 'Users', icon: '👥', roles: ['Super User', 'Admin'] },
      { path: '/reports', label: 'Reports', icon: '📄', roles: ['Super User', 'Admin'] },
      { path: '/bulk-upload', label: 'Bulk Upload', icon: '📊', roles: ['Super User', 'Admin'] },
      { path: '/settings', label: 'Settings', icon: '⚙️', roles: ['Super User', 'Admin'] },
    ];
    
    return allItems.filter(item => item.roles.includes(role));
  };

  const navItems = getNavigationItems(user?.role);

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
        w-48 
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

        {/* Navigation Items */}
        <nav className="p-2 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors
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
          })}
        </nav>

        {/* User info at bottom */}
        <div className="p-3 border-t border-green-100 mt-auto">
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
