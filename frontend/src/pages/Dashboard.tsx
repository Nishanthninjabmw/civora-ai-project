import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CitizenDashboard } from '../components/CitizenDashboard';
import { AdminDashboard } from '../components/AdminDashboard';
import { CrewDashboard } from '../components/CrewDashboard';

export const Dashboard = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {user.role === 'Citizen' && <CitizenDashboard />}
      {user.role === 'Admin' && <AdminDashboard />}
      {user.role === 'Crew' && <CrewDashboard />}
    </div>
  );
};
