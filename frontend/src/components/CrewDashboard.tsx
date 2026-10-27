import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { SafeImage } from './SafeImage';
import { Wrench, MapPin, CheckCircle, Clock, AlertTriangle, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';

export const CrewDashboard = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = async (silent = false) => {
    const deduplicateReports = (list: any[]) => {
      const seen = new Set<string>();
      return list.filter((r) => {
        const key = r._id || r.reportId;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      const { data } = await api.get('/reports');
      setReports(deduplicateReports(Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Failed to load crew assignments:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Auto-refresh interval (5 seconds) to keep work orders updated
    const interval = setInterval(() => {
      fetchReports(true);
    }, 5000);

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
  }, []);

  const activeReports = reports.filter((r: any) => r.status !== 'Resolved' && r.status !== 'Rejected');
  const resolvedReports = reports.filter((r: any) => r.status === 'Resolved');
  const displayedReports = activeTab === 'ACTIVE' ? activeReports : resolvedReports;

  const handleStartWork = async (reportId: string) => {
    try {
      await api.put(`/reports/${reportId}/status`, {
        status: 'In Progress',
        note: 'Field crew arrived on site; maintenance underway.'
      });
      fetchReports(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update work status.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-brand-white">
            <Wrench className="w-8 h-8 text-brand-copper" /> Field Operations & Crew Queue
          </h1>
          <p className="text-brand-gray mt-1">
            Assigned municipal work orders, repair execution, and completion proof uploads.
          </p>
        </div>

        <button
          onClick={() => fetchReports(false)}
          disabled={loading || isRefreshing}
          className="btn-secondary flex items-center gap-2 text-xs py-2 px-3 self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-copper' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Refresh Orders'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border gap-4">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'ACTIVE'
              ? 'border-brand-copper text-brand-copper'
              : 'border-transparent text-brand-gray hover:text-brand-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Active Work Orders ({activeReports.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('RESOLVED')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'RESOLVED'
              ? 'border-brand-copper text-brand-copper'
              : 'border-transparent text-brand-gray hover:text-brand-white'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Completed Repairs ({resolvedReports.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-brand-gray">Loading assigned work orders...</div>
      ) : displayedReports.length === 0 ? (
        <div className="glass-panel text-center py-16">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2 text-brand-white">
            {activeTab === 'ACTIVE' ? "You're all caught up!" : 'No completed work records yet'}
          </h3>
          <p className="text-brand-gray">
            {activeTab === 'ACTIVE'
              ? 'No active maintenance assignments pending in your queue.'
              : 'Repairs you resolve will appear here with before/after photos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedReports.map((report) => {
            const isCritical = report.severityLabel === 'Critical';
            const isHigh = report.severityLabel === 'High';
            const isMedium = report.severityLabel === 'Medium';
            const isInProgress = report.status === 'In Progress';
            const isResolved = report.status === 'Resolved';

            return (
              <div
                key={report._id}
                className="glass-panel p-6 flex flex-col justify-between border-brand-border/60 hover:border-brand-copper/60 transition-colors"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <span className="font-mono text-xs text-brand-gray block mb-1">
                        ID: {report.reportId}
                      </span>
                      <h3 className="text-xl font-bold text-brand-white">{report.hazardCategory}</h3>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        isCritical
                          ? 'bg-red-900/50 text-red-300 border border-red-500/40'
                          : isHigh
                          ? 'bg-orange-900/50 text-orange-300 border border-orange-500/40'
                          : isMedium
                          ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/40'
                          : 'bg-green-900/50 text-green-300 border border-green-500/40'
                      }`}
                    >
                      {report.severityLabel} ({report.finalSeverityScore})
                    </span>
                  </div>

                  {/* Photo & Details row */}
                  <div className="flex gap-4 mb-4">
                    <div className="w-28 h-24 rounded-lg overflow-hidden bg-brand-dark shrink-0 border border-brand-border">
                      <SafeImage
                        src={report.imageUrl}
                        alt="Citizen hazard photograph"
                        className="w-full h-full object-cover"
                        fallbackText="No citizen photo"
                      />
                    </div>
                    <div className="text-xs space-y-1.5 flex-grow">
                      <p className="text-brand-gray flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-brand-copper shrink-0 mt-0.5" />
                        <span className="text-brand-white">
                          {report.location?.address || `${report.location.coordinates[1]?.toFixed(4)}, ${report.location.coordinates[0]?.toFixed(4)}`}
                        </span>
                      </p>
                      {report.description && (
                        <p className="text-brand-gray line-clamp-2">
                          "{report.description}"
                        </p>
                      )}
                      {report.resolutionNotes && isResolved && (
                        <p className="text-green-300/90 bg-green-950/40 p-1.5 rounded border border-green-500/30">
                          <strong>Repair Note:</strong> {report.resolutionNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-brand-border/60 flex items-center justify-between gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      isResolved
                        ? 'bg-green-900/40 text-green-300 border border-green-500/40'
                        : isInProgress
                        ? 'bg-blue-900/40 text-blue-300 border border-blue-500/40'
                        : 'bg-yellow-900/40 text-yellow-300 border border-yellow-500/40'
                    }`}
                  >
                    Status: {report.status}
                  </span>

                  <div className="flex items-center gap-2">
                    {!isResolved && !isInProgress && (
                      <button
                        onClick={() => handleStartWork(report._id)}
                        className="btn-secondary py-1 px-3 text-xs"
                      >
                        Start Work
                      </button>
                    )}

                    <Link
                      to={`/report/${report._id}`}
                      className="btn-primary py-1 px-3 text-xs flex items-center gap-1"
                    >
                      <span>{isResolved ? 'View Record' : 'Upload Proof & Resolve'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
