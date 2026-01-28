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
      { path: '/catching', label: 'Catching Form', icon: '🚗', roles: ['Super User', 'Driver'] },
      { path: '/observations', label: 'Observations', icon: '📋', roles: ['Super User', 'Catcher'] },
      { path: '/surgery', label: 'Surgery', icon: '⚕️', roles: ['Super User', 'Veterinary Doctor'] },
      { path: '/treatment', label: 'Treatment', icon: '💊', roles: ['Super User', 'Admin'] },
      { path: '/feeding', label: 'Feeding', icon: '🍲', roles: ['Super User', 'Caretaker'] },
      { path: '/release', label: 'Release', icon: '✅', roles: ['Super User', 'Catcher', 'Caretaker'] },
      { path: '/medicines', label: 'Medicines', icon: '💊', roles: ['Super User', 'Admin'] },
      { path: '/food-stock', label: 'Food Stock', icon: '🍞', roles: ['Super User', 'Admin'] },
      { path: '/users', label: 'Users', icon: '👥', roles: ['Super User', 'Admin'] },
      { path: '/reports', label: 'Reports', icon: '📄', roles: ['Super User', 'Admin'] },
      { path: '/settings', label: 'Settings', icon: '⚙️', roles: ['Super User', 'Admin'] },
    ];
    
    return allItems.filter(item => item.roles.includes(role));
  };

  const navItems = getNavigationItems(user?.role);

  return (
    <header className="bg-white shadow-sm border-b border-green-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex justify-between items-center py-3">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <img 
              src="/janice-trust-logo.jpg" 
              alt="Janice's Trust" 
              className="h-12 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-green-800">J-APP Management</h1>
              <p className="text-xs text-purple-600">ABC Program</p>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
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
        
        {/* Navigation */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${isActive 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
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
      </div>
    </header>
  );
};

export default Navigation;