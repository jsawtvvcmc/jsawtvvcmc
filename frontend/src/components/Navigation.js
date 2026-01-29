import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

const Navigation = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

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
      { path: '/food-stock', label: 'Food', icon: '🍞', roles: ['Super User', 'Admin'] },
      { path: '/users', label: 'Users', icon: '👥', roles: ['Super User', 'Admin'] },
      { path: '/reports', label: 'Reports', icon: '📄', roles: ['Super User', 'Admin'] },
      { path: '/bulk-upload', label: 'Upload', icon: '📊', roles: ['Super User', 'Admin'] },
      { path: '/settings', label: 'Settings', icon: '⚙️', roles: ['Super User', 'Admin'] },
    ];
    
    return allItems.filter(item => item.roles.includes(role));
  };

  const navItems = getNavigationItems(user?.role);

  return (
    <header className="bg-white shadow-sm border-b border-green-100 sticky top-0 z-50">
      <div className="px-4">
        {/* Top bar with logo and nav combined */}
        <div className="flex items-center py-2">
          {/* Logo - compact */}
          <Link to="/dashboard" className="flex items-center space-x-2 mr-6 flex-shrink-0">
            <img 
              src="/janice-trust-logo.jpg" 
              alt="Janice's Trust" 
              className="h-8 w-auto object-contain"
            />
            <div className="hidden md:block">
              <h1 className="text-sm font-bold text-green-800 leading-tight">J-APP</h1>
              <p className="text-[10px] text-purple-600">ABC Program</p>
            </div>
          </Link>
          
          {/* Navigation - left aligned, compact */}
          <nav className="flex space-x-0.5 overflow-x-auto scrollbar-hide flex-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-1 px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors
                    ${isActive 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* User info - right side, compact */}
          <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] text-gray-500">{user?.role}</p>
            </div>
            <Button 
              onClick={logout} 
              variant="outline" 
              size="sm"
              className="border-green-600 text-green-700 hover:bg-green-50 h-7 text-xs px-2"
              data-testid="logout-button"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;