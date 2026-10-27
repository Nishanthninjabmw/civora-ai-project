import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { SafeImage } from './SafeImage';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Filter,
  Search,
  ArrowUpDown,
  RefreshCw,
  Cpu,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Component to ensure Leaflet properly sizes the map tiles on initial render
function MapInit() {
  const map = useMap();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Custom Leaflet DivIcon generator reflecting severity score and color band
const createSeverityMarkerIcon = (label: string, score: number) => {
  let bgColor = '#10b981'; // green for Low
  let borderColor = '#059669';
  let textColor = '#ffffff';

  if (label === 'Critical') {
    bgColor = '#dc2626'; // red
    borderColor = '#991b1b';
  } else if (label === 'High') {
    bgColor = '#ea580c'; // orange
    borderColor = '#c2410c';
  } else if (label === 'Medium') {
    bgColor = '#ca8a04'; // yellow/amber
    borderColor = '#a16207';
    textColor = '#000000';
  }

  return L.divIcon({
    className: 'civora-custom-marker',
    html: `
      <div style="
        background: ${bgColor};
        border: 2px solid ${borderColor};
        color: ${textColor};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      ">
        ${score}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

interface CrewMember {
  _id: string;
  name: string;
  email: string;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ total: 0, pending: 0, critical: 0, resolved: 0 });
  const [reports, setReports] = useState<any[]>([]);
  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters and Sorting controls
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('UNRESOLVED');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [crewFilter, setCrewFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'SEVERITY_DESC' | 'SEVERITY_ASC' | 'NEWEST' | 'OLDEST'>('SEVERITY_DESC');

  const deduplicateReports = (list: any[]) => {
    const seen = new Set<string>();
    return list.filter((r) => {
      const key = r._id || r.reportId;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      const [statsRes, reportsRes, crewRes] = await Promise.all([
        api.get('/reports/stats').catch(() => null),
        api.get('/reports').catch(() => null),
        api.get('/auth/crew').catch(() => null)
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      if (reportsRes?.data && Array.isArray(reportsRes.data)) {
        setReports(deduplicateReports(reportsRes.data));
      }
      if (crewRes?.data && Array.isArray(crewRes.data)) {
        setCrewList(crewRes.data);
      }
    } catch (error) {
      console.error('Error fetching admin operations data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh interval (5 seconds) to keep admin priority queue live in real time
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);

    // Refresh immediately when window gains focus or tab becomes visible
    const handleFocus = () => fetchData(true);
    const handleVisibility = () => {
      if (!document.hidden) fetchData(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Filter and Sort Engine (Priority-First)
  const filteredAndSortedReports = useMemo(() => {
    let result = [...reports];

    // Status filter
    if (statusFilter === 'UNRESOLVED') {
      result = result.filter(r => r.status !== 'Resolved' && r.status !== 'Rejected' && r.status !== 'Duplicate');
    } else if (statusFilter !== 'ALL') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Severity filter
    if (severityFilter === 'CRITICAL_HIGH') {
      result = result.filter(r => r.severityLabel === 'Critical' || r.severityLabel === 'High');
    } else if (severityFilter !== 'ALL') {
      result = result.filter(r => r.severityLabel === severityFilter);
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      result = result.filter(r => r.hazardCategory === categoryFilter);
    }

    // Crew filter
    if (crewFilter === 'UNASSIGNED') {
      result = result.filter(r => !r.assignedCrew);
    } else if (crewFilter === 'ASSIGNED') {
      result = result.filter(r => Boolean(r.assignedCrew));
    } else if (crewFilter !== 'ALL') {
      result = result.filter(r => {
        const crewId = r.assignedCrew?._id || r.assignedCrew;
        return crewId === crewFilter;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.hazardCategory && r.hazardCategory.toLowerCase().includes(q)) ||
        (r.reportId && r.reportId.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.location?.address && r.location.address.toLowerCase().includes(q))
      );
    }

    // Priority-First Sorting
    result.sort((a, b) => {
      if (sortBy === 'SEVERITY_DESC') {
        // Primary: highest severity score first
        if (b.finalSeverityScore !== a.finalSeverityScore) {
          return b.finalSeverityScore - a.finalSeverityScore;
        }
        // Secondary deterministic: oldest report first among ties
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'SEVERITY_ASC') {
        if (a.finalSeverityScore !== b.finalSeverityScore) {
          return a.finalSeverityScore - b.finalSeverityScore;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'NEWEST') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'OLDEST') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [reports, statusFilter, severityFilter, categoryFilter, crewFilter, searchQuery, sortBy]);

  // Valid geolocated reports for the city hazard map
  const validMapReports = useMemo(() => {
    return reports.filter(r => {
      const coords = r.location?.coordinates;
      if (!coords || !Array.isArray(coords) || coords.length !== 2) return false;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      return (
        !isNaN(lat) &&
        !isNaN(lng) &&
        isFinite(lat) &&
        isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });
  }, [reports]);

  // Intelligent map center
  const defaultCenter: [number, number] = useMemo(() => {
    if (validMapReports.length > 0) {
      const coords = validMapReports[0].location.coordinates;
      return [Number(coords[1]), Number(coords[0])];
    }
    return [40.730610, -73.935242];
  }, [validMapReports]);

  // Unique categories for filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => {
      if (r.hazardCategory) set.add(r.hazardCategory);
    });
    return Array.from(set);
  }, [reports]);

  return (
    <div className="space-y-8">
      {/* Operations Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-white flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-brand-copper" /> Municipal Operations Center
          </h1>
          <p className="text-brand-gray mt-1">
            Real-time civic hazard prioritization, AI validation, geospatial triage, and crew dispatch.
          </p>
        </div>

        <button
          onClick={() => fetchData(false)}
          disabled={loading || isRefreshing}
          className="btn-secondary flex items-center gap-2 text-xs py-2 px-3 self-end sm:self-auto"
          title="Refresh dashboard data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-copper' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Refresh Feed'}</span>
        </button>
      </div>

      {/* Live Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 flex items-center gap-4 border-l-4 border-l-red-500">
          <div className="w-12 h-12 rounded-lg bg-red-900/30 border border-red-500/40 flex items-center justify-center text-red-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-white">{stats.critical}</div>
            <div className="text-xs text-brand-gray font-medium">Critical Priority (Score ≥ 80)</div>
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center gap-4 border-l-4 border-l-yellow-500">
          <div className="w-12 h-12 rounded-lg bg-yellow-900/30 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-white">{stats.pending}</div>
            <div className="text-xs text-brand-gray font-medium">Pending Review & Dispatch</div>
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="w-12 h-12 rounded-lg bg-blue-900/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-white">{stats.total}</div>
            <div className="text-xs text-brand-gray font-medium">Total Citizen Reports</div>
          </div>
        </div>

        <div className="glass-panel p-5 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="w-12 h-12 rounded-lg bg-green-900/30 border border-green-500/40 flex items-center justify-center text-green-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-white">{stats.resolved}</div>
            <div className="text-xs text-brand-gray font-medium">Verified Repaired / Resolved</div>
          </div>
        </div>
      </div>

      {/* City Hazard Geospatial Map */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-charcoal">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-copper" />
            <h2 className="text-lg font-semibold text-brand-white">City Hazard Geospatial Map</h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-red-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Critical
            </span>
            <span className="flex items-center gap-1.5 text-orange-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> High
            </span>
            <span className="flex items-center gap-1.5 text-yellow-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span> Medium
            </span>
            <span className="flex items-center gap-1.5 text-green-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Low
            </span>
            <span className="text-brand-gray border-l border-brand-border pl-3">
              {validMapReports.length} geolocated incidents
            </span>
          </div>
        </div>
        <div className="h-[400px] w-full z-0 relative">
          <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapInit />
            {validMapReports.map(report => {
              const lat = Number(report.location.coordinates[1]);
              const lng = Number(report.location.coordinates[0]);
              return (
                <Marker
                  key={report._id || report.reportId}
                  position={[lat, lng]}
                  icon={createSeverityMarkerIcon(report.severityLabel, report.finalSeverityScore)}
                >
                  <Popup>
                    <div className="text-xs font-sans space-y-1.5 p-1 max-w-[200px]">
                      <div className="font-bold text-sm text-gray-900">{report.hazardCategory}</div>
                      <div className="text-gray-700">
                        Severity: <strong>{report.severityLabel}</strong> ({report.finalSeverityScore}/100)
                      </div>
                      <div className="text-gray-700">
                        Status: <strong>{report.status}</strong>
                      </div>
                      <div className="text-gray-600 text-[11px] truncate">
                        {report.location.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                      </div>
                      <div className="pt-1.5 border-t border-gray-200">
                        <Link
                          to={`/report/${report._id || report.reportId}`}
                          className="text-amber-700 font-bold hover:underline inline-block"
                        >
                          Inspect & Dispatch &rarr;
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Priority-First Report Queue & Incident Log */}
      <div className="glass-panel overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-brand-border bg-brand-charcoal space-y-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-brand-white">Priority-Ranked Hazard Queue</h2>
              <p className="text-xs text-brand-gray">
                Ranked by severity score (100 down to 0) with deterministic tie-breaking. Higher risk hazards appear first.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-brand-gray absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                className="input-field pl-9 py-1.5 text-xs w-full"
                placeholder="Search category, ID, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filter and Sort Selectors */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-brand-border/40">
            {/* Sort Selector */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-brand-copper" />
              <select
                className="input-field py-1 px-2 text-xs"
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
              >
                <option value="SEVERITY_DESC">Severity: High to Low (Priority)</option>
                <option value="SEVERITY_ASC">Severity: Low to High</option>
                <option value="NEWEST">Newest Submitted</option>
                <option value="OLDEST">Oldest Submitted</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-brand-gray" />
              <select
                className="input-field py-1 px-2 text-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="UNRESOLVED">Unresolved Incidents (Active Queue)</option>
                <option value="ALL">All Statuses</option>
                <option value="Submitted">Submitted (Triage)</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned to Crew</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved (Completed)</option>
              </select>
            </div>

            {/* Severity Band Filter */}
            <select
              className="input-field py-1 px-2 text-xs"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">All Severity Bands</option>
              <option value="CRITICAL_HIGH">Critical & High Priority</option>
              <option value="Critical">Critical Priority (Score ≥ 80)</option>
              <option value="High">High Priority (60–79)</option>
              <option value="Medium">Medium Priority (35–59)</option>
              <option value="Low">Low Priority (&lt; 35)</option>
            </select>

            {/* Hazard Category Filter */}
            {categories.length > 0 && (
              <select
                className="input-field py-1 px-2 text-xs"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            {/* Assigned Crew Filter */}
            <select
              className="input-field py-1 px-2 text-xs"
              value={crewFilter}
              onChange={(e) => setCrewFilter(e.target.value)}
            >
              <option value="ALL">All Crew Assignments</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              <option value="ASSIGNED">Assigned Only</option>
              {crewList.map(crew => (
                <option key={crew._id} value={crew._id}>Assigned: {crew.name}</option>
              ))}
            </select>

            <span className="text-xs text-brand-gray ml-auto font-mono">
              Showing {filteredAndSortedReports.length} of {reports.length}
            </span>
          </div>
        </div>

        {/* Priority Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-dark/70 text-brand-gray text-xs border-b border-brand-border">
                <th className="p-3 font-medium">Photo & ID</th>
                <th className="p-3 font-medium">Category & Details</th>
                <th className="p-3 font-medium">Priority Score</th>
                <th className="p-3 font-medium">AI Status</th>
                <th className="p-3 font-medium">Location</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Assigned Crew</th>
                <th className="p-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedReports.map((report) => {
                const isCritical = report.severityLabel === 'Critical';
                const isHigh = report.severityLabel === 'High';
                const isMedium = report.severityLabel === 'Medium';
                const isResolved = report.status === 'Resolved';

                return (
                  <tr
                    key={report._id}
                    className={`border-b border-brand-border/40 hover:bg-brand-charcoal/50 transition-colors text-sm ${
                      isCritical && !isResolved ? 'bg-red-950/20' : ''
                    }`}
                  >
                    {/* Photo & Report ID */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded overflow-hidden bg-brand-dark shrink-0 border border-brand-border">
                          <SafeImage
                            src={report.imageUrl}
                            alt={report.hazardCategory}
                            className="w-full h-full object-cover"
                            fallbackText="No photo"
                          />
                        </div>
                        <div>
                          <div className="font-mono text-xs text-brand-white font-semibold">
                            {report.reportId}
                          </div>
                          <div className="text-[10px] text-brand-gray">
                            {new Date(report.createdAt).toLocaleDateString()} {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Description */}
                    <td className="p-3 max-w-[200px]">
                      <div className="font-medium text-brand-white">{report.hazardCategory}</div>
                      {report.description ? (
                        <div className="text-xs text-brand-gray truncate" title={report.description}>
                          {report.description}
                        </div>
                      ) : (
                        <div className="text-xs text-brand-gray/50 italic">No description provided</div>
                      )}
                    </td>

                    {/* Priority Score & Band */}
                    <td className="p-3">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1 ${
                            isCritical
                              ? 'bg-red-900/60 text-red-300 border border-red-500/50'
                              : isHigh
                              ? 'bg-orange-900/60 text-orange-300 border border-orange-500/50'
                              : isMedium
                              ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-500/50'
                              : 'bg-green-900/60 text-green-300 border border-green-500/50'
                          }`}
                        >
                          {report.severityLabel} ({report.finalSeverityScore}/100)
                        </span>
                        <div className="w-20 bg-brand-dark h-1.5 rounded-full overflow-hidden border border-brand-border/60">
                          <div
                            className={`h-full ${
                              isCritical ? 'bg-red-500' : isHigh ? 'bg-orange-500' : isMedium ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, report.finalSeverityScore))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* AI Inference Status */}
                    <td className="p-3">
                      {report.aiDetections && report.aiDetections.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-950/40 text-purple-300 border border-purple-500/40">
                          <Cpu className="w-3 h-3 text-purple-400" /> AI-Assisted ({report.aiDetections.length})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-brand-charcoal text-brand-gray border border-brand-border">
                          Municipal Rule
                        </span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="p-3 text-xs">
                      <div className="text-brand-white truncate max-w-[160px]" title={report.location?.address}>
                        {report.location?.address || 'Street address pending'}
                      </div>
                      {report.location?.coordinates && (
                        <div className="font-mono text-[10px] text-brand-gray">
                          {report.location.coordinates[1]?.toFixed(4)}, {report.location.coordinates[0]?.toFixed(4)}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block ${
                          report.status === 'Resolved'
                            ? 'bg-green-900/40 text-green-300 border border-green-500/40'
                            : report.status === 'In Progress'
                            ? 'bg-blue-900/40 text-blue-300 border border-blue-500/40'
                            : report.status === 'Assigned'
                            ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-500/40'
                            : 'bg-brand-charcoal text-brand-gray border border-brand-border'
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>

                    {/* Assigned Crew */}
                    <td className="p-3 text-xs">
                      {report.assignedCrew?.name ? (
                        <span className="text-brand-copper font-medium">
                          {report.assignedCrew.name}
                        </span>
                      ) : (
                        <span className="italic text-brand-gray/60">Unassigned</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-3 text-right">
                      <Link
                        to={`/report/${report._id}`}
                        className="btn-secondary py-1 px-3 text-xs inline-flex items-center gap-1"
                      >
                        Dispatch &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedReports.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-brand-gray text-sm">
                    No hazard reports matching criteria found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
