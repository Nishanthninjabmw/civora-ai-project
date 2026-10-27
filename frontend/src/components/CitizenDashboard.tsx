import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { SafeImage } from './SafeImage';
import { PlusCircle, MapPin, Clock, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export const CitizenDashboard = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deduplicateReports = (list: any[]) => {
    const seen = new Set<string>();
    return list.filter((r) => {
      const key = r._id || r.reportId;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchReports = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const { data } = await api.get('/reports');
      setReports(deduplicateReports(Array.isArray(data) ? data : []));
    } catch (err: any) {
      console.error('Failed to load citizen reports:', err);
      if (!silent) {
        setError(err.response?.data?.message || 'Unable to load hazard reports. Please check your network connection.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    // Live background polling (5 seconds) to ensure new reports appear immediately
    const interval = setInterval(() => {
      fetchReports(true);
    }, 5000);

    // Refresh immediately when window gains focus or tab becomes visible
    const handleFocus = () => fetchReports(true);
    const handleVisibility = () => {
      if (!document.hidden) fetchReports(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchReports]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-white">My Reports</h1>
          <p className="text-xs text-brand-gray mt-1">
            Track and monitor the status of civic hazard reports submitted from your account.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchReports(false)}
            disabled={loading || isRefreshing}
            className="btn-secondary text-xs py-2.5 px-3.5 flex items-center gap-1.5"
            title="Refresh reports feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-copper ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <Link to="/report-hazard" className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
            <PlusCircle className="w-4 h-4" />
            <span>Report Hazard</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchReports(false)}
            className="px-3 py-1 bg-red-800/80 hover:bg-red-700 text-white rounded text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-brand-gray py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-copper" />
          <span>Loading municipal reports...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel text-center py-16">
          <AlertCircle className="w-16 h-16 text-brand-gray mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2 text-brand-white">No reports yet</h3>
          <p className="text-brand-gray mb-6">Help keep your community safe by reporting hazards.</p>
          <Link to="/report-hazard" className="btn-primary">Create First Report</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Link
              key={report._id || report.reportId}
              to={`/report/${report._id || report.reportId}`}
              className="glass-panel overflow-hidden hover:border-brand-copper transition-colors group"
            >
              <div className="h-48 relative overflow-hidden bg-brand-dark">
                <SafeImage
                  src={report.imageUrl}
                  alt={report.hazardCategory}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 bg-brand-charcoal/90 backdrop-blur px-2 py-1 rounded text-xs font-medium border border-brand-border">
                  {report.status}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-1">{report.hazardCategory}</h3>
                <div className="flex items-center gap-1 text-brand-gray text-sm mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{report.location.address || 'Location provided'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className={`px-2 py-1 rounded font-medium ${
                    report.severityLabel === 'Critical' ? 'bg-red-900/50 text-red-400' :
                    report.severityLabel === 'High' ? 'bg-orange-900/50 text-orange-400' :
                    report.severityLabel === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-green-900/50 text-green-400'
                  }`}>
                    {report.severityLabel}
                  </div>
                  <div className="flex items-center gap-1 text-brand-gray">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
