import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Map, Camera, Activity } from 'lucide-react';

export const Landing = () => {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <ShieldAlert className="w-20 h-20 text-brand-copper" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Report smarter.<br />
            <span className="text-brand-copper">Build safer streets.</span>
          </h1>
          <p className="text-xl text-brand-gray mb-10 max-w-2xl mx-auto leading-relaxed">
            Civic Intelligence & Hazard Response platform powered by AI. 
            Identify public infrastructure hazards, estimate severity automatically, and track resolution.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto">
              Get Started
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
            <div className="glass-panel p-6">
              <Camera className="w-10 h-10 text-brand-copper mb-4" />
              <h3 className="text-xl font-semibold mb-2">Snap & Report</h3>
              <p className="text-brand-gray">Capture photos of potholes or road damage. Our system handles the location tagging automatically.</p>
            </div>
            <div className="glass-panel p-6">
              <Activity className="w-10 h-10 text-brand-copper mb-4" />
              <h3 className="text-xl font-semibold mb-2">AI Severity Assessor</h3>
              <p className="text-brand-gray">Advanced vision models identify the hazard and assign an initial severity score for prioritization.</p>
            </div>
            <div className="glass-panel p-6">
              <Map className="w-10 h-10 text-brand-copper mb-4" />
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-brand-gray">Watch as municipal crews review, assign, and resolve the hazards in your neighborhood.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
