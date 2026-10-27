import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldAlert, User as UserIcon } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-brand-charcoal border-b border-brand-border sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-brand-copper" />
              <span className="text-xl font-bold tracking-widest text-brand-white">CIVORA</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-2 text-brand-gray text-sm mr-4">
                  <UserIcon className="w-4 h-4" />
                  <span>{user.name} <span className="text-brand-copper/80">[{user.role}]</span></span>
                </div>
                <Link to="/dashboard" className="text-sm font-medium text-brand-white hover:text-brand-copper transition-colors">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-brand-gray hover:text-red-400 transition-colors ml-4"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary text-sm px-6">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
