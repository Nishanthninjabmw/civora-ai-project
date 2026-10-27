import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  ShieldAlert,
  Users,
  Wrench,
  ArrowLeft,
  Loader2,
  Lock,
  Mail,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

type UserPortalRole = 'Citizen' | 'Admin' | 'Crew';

interface PortalConfig {
  role: UserPortalRole;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: React.ElementType;
  demoEmail: string;
}

const PORTALS: Record<UserPortalRole, PortalConfig> = {
  Citizen: {
    role: 'Citizen',
    title: 'Citizen Portal',
    badge: 'Public Reporting',
    badgeColor: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    description: 'Report municipal road hazards, submit geo-tagged photo evidence, and track neighborhood repair progress.',
    icon: Users,
    demoEmail: 'citizen@civora.com',
  },
  Admin: {
    role: 'Admin',
    title: 'Administrator Portal',
    badge: 'Municipal Operations',
    badgeColor: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    description: 'Triage hazards via priority queue, review live geospatial map pins, and assign maintenance personnel.',
    icon: ShieldAlert,
    demoEmail: 'admin@civora.com',
  },
  Crew: {
    role: 'Crew',
    title: 'Repair Crew Portal',
    badge: 'Field Maintenance',
    badgeColor: 'bg-blue-950/60 text-blue-300 border-blue-500/40',
    description: 'Review active work orders, record on-site repair progress, and submit after-repair proof photographs.',
    icon: Wrench,
    demoEmail: 'crew@civora.com',
  },
};

export const Login = () => {
  const [selectedRole, setSelectedRole] = useState<UserPortalRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mismatchRole, setMismatchRole] = useState<UserPortalRole | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSelectPortal = (role: UserPortalRole) => {
    setSelectedRole(role);
    setError(null);
    setMismatchRole(null);
    setEmail('');
    setPassword('');
  };

  const handleBackToPortals = () => {
    setSelectedRole(null);
    setError(null);
    setMismatchRole(null);
    setEmail('');
    setPassword('');
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
    setMismatchRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setError(null);
    setMismatchRole(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const actualRole = response.data?.role as UserPortalRole;

      // Authoritative Role Verification:
      // The selected portal is only a UI entry point. We strictly verify the actual role returned by the backend.
      if (actualRole !== selectedRole) {
        setMismatchRole(actualRole);
        setError(
          `Access Denied: This account is registered with the role "${actualRole}", but you are signing in through the "${PORTALS[selectedRole].title}".`
        );
        return;
      }

      // Role matches verified backend credentials
      login(response.data);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Unable to reach CIVORA server on port 5001. Please verify the backend is running.');
      } else {
        setError('Invalid credentials. Please verify your email and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const activePortal = selectedRole ? PORTALS[selectedRole] : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* VIEW 1: Role Selection Portal Cards */}
        {!selectedRole || !activePortal ? (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-brand-charcoal border border-brand-border/80 shadow-lg mb-2">
                <ShieldAlert className="w-10 h-10 text-brand-copper" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-white tracking-tight">
                Select Your Access Portal
              </h1>
              <p className="text-sm sm:text-base text-brand-gray max-w-xl mx-auto">
                CIVORA provides role-segregated workspaces for municipal civic response. Select your authorized portal to authenticate.
              </p>
            </div>

            {/* Three Selectable Portal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(Object.keys(PORTALS) as UserPortalRole[]).map((roleKey) => {
                const portal = PORTALS[roleKey];
                const IconComponent = portal.icon;

                return (
                  <div
                    key={roleKey}
                    onClick={() => handleSelectPortal(roleKey)}
                    className="glass-panel p-6 flex flex-col justify-between border-brand-border/80 hover:border-brand-copper/80 hover:bg-brand-charcoal/70 transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-brand-copper/5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl bg-brand-dark border border-brand-border flex items-center justify-center text-brand-copper group-hover:scale-105 group-hover:border-brand-copper transition-all">
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${portal.badgeColor}`}>
                          {portal.badge}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-xl font-bold text-brand-white group-hover:text-brand-copper transition-colors">
                          {portal.title}
                        </h2>
                        <p className="text-xs text-brand-gray mt-2 leading-relaxed">
                          {portal.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-brand-border/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-brand-gray/80 font-mono text-[11px]">
                          {portal.demoEmail}
                        </span>
                        <span className="text-brand-copper font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Sign In <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Demonstration Helper Note */}
            <div className="text-center p-4 rounded-lg bg-brand-charcoal/40 border border-brand-border/60 text-xs text-brand-gray max-w-2xl mx-auto space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-brand-copper font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Model Exam Demonstration Note
              </div>
              <p>
                All demo accounts share the password <code className="text-brand-white font-mono bg-brand-dark px-1.5 py-0.5 rounded border border-brand-border">password123</code>.
                Browser tabs in the same window share <code className="font-mono text-brand-white">localStorage</code>; to demo multiple roles simultaneously, use an Incognito window or second browser profile.
              </p>
            </div>
          </div>
        ) : (
          /* VIEW 2: Dedicated Role Login Form */
          <div className="max-w-md mx-auto glass-panel p-8 sm:p-10 space-y-6 shadow-2xl border-brand-copper/40">
            {/* Top Navigation */}
            <button
              type="button"
              onClick={handleBackToPortals}
              className="inline-flex items-center gap-1.5 text-xs text-brand-gray hover:text-brand-copper transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Switch Portal
            </button>

            {/* Portal Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-brand-dark border border-brand-copper/60 flex items-center justify-center text-brand-copper mx-auto shadow-md">
                {React.createElement(activePortal.icon, { className: 'w-6 h-6' })}
              </div>
              <h1 className="text-2xl font-bold text-brand-white">{activePortal.title}</h1>
              <div className="inline-block">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${activePortal.badgeColor}`}>
                  {activePortal.badge}
                </span>
              </div>
              <p className="text-xs text-brand-gray pt-1">
                Authenticating into the {activePortal.title.toLowerCase()}. Authorized credentials required.
              </p>
            </div>

            {/* Quick Demo Pre-Fill Helper */}
            <div className="p-3 bg-brand-dark/80 rounded-lg border border-brand-border flex items-center justify-between text-xs">
              <div className="text-brand-gray truncate mr-2">
                <span className="text-[10px] uppercase font-mono block text-brand-copper">Demo Account</span>
                <span className="font-mono text-brand-white text-[11px]">{activePortal.demoEmail}</span>
              </div>
              <button
                type="button"
                onClick={() => handleFillDemo(activePortal.demoEmail)}
                className="btn-secondary py-1 px-2.5 text-[11px] shrink-0 font-medium"
              >
                Auto-Fill
              </button>
            </div>

            {/* Error & Mismatch Alerts */}
            {error && (
              <div className="p-4 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-xs space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>

                {/* If there is a role mismatch, offer a 1-click switch */}
                {mismatchRole && (
                  <div className="pt-2 border-t border-red-500/30">
                    <button
                      type="button"
                      onClick={() => handleSelectPortal(mismatchRole)}
                      className="w-full py-1.5 px-3 bg-brand-copper/20 hover:bg-brand-copper/30 border border-brand-copper/60 text-brand-copper rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Switch to {PORTALS[mismatchRole].title}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="label-text flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-copper" /> Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input-field text-sm"
                  placeholder={activePortal.demoEmail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="label-text flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-brand-copper" /> Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="input-field text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying {activePortal.title}...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authenticate into {activePortal.title}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
