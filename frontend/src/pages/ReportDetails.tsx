import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { SafeImage, normalizeImageUrl } from '../components/SafeImage';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Bot,
  MapPin,
  Edit,
  UserCheck,
  Shield,
  CheckCircle,
  Info,
  Camera,
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically re-center the map when report coordinates are loaded
function RecenterMap({ position }: { position: { lat: number; lng: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 15, { animate: true });
      map.invalidateSize();
    }
  }, [position, map]);
  return null;
}

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

interface CrewMember {
  _id: string;
  name: string;
  email: string;
}

export const ReportDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const { user } = useAuth();

  // Status and resolution form states
  const [newStatus, setNewStatus] = useState('');
  const [selectedCrew, setSelectedCrew] = useState('');
  const [note, setNote] = useState('');
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [updateError, setUpdateError] = useState('');

  const imageRef = useRef<HTMLImageElement>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

  const [fetchError, setFetchError] = useState<{ status?: number; message: string } | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const { data } = await api.get(`/reports/${id}`);
      setReport(data);
      setNewStatus(data.status);
      if (data.assignedCrew) {
        setSelectedCrew(data.assignedCrew._id || data.assignedCrew);
      }
    } catch (error: any) {
      console.error('Failed to load report details:', error);
      setReport(null);
      setFetchError({
        status: error.response?.status,
        message: error.response?.data?.message || 'Failed to retrieve report details from server.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  useEffect(() => {
    if (user?.role === 'Admin') {
      api.get('/auth/crew')
        .then(res => setCrewList(res.data))
        .catch(err => console.error('Failed to load crew members:', err));
    }
  }, [user]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      setNaturalDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  };

  const handleResolutionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setUpdateError('Repair photograph is too large. Maximum allowed size is 5MB.');
        return;
      }
      setResolutionFile(file);
      setResolutionPreview(URL.createObjectURL(file));
      setUpdateError('');
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateSuccess('');
    setUpdateError('');

    try {
      // Validate crew resolution requirements
      if (user?.role === 'Crew' && newStatus === 'Resolved') {
        if (!resolutionFile && !report.resolutionImageUrl) {
          setUpdateError('Resolution photograph required: Please upload an after-repair image proving repair completion.');
          setUpdating(false);
          return;
        }
        if (!note.trim() && !report.resolutionNotes) {
          setUpdateError('Resolution notes required: Please describe the repair work performed.');
          setUpdating(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append('status', newStatus);
      if (note.trim()) {
        formData.append('note', note.trim());
      }
      if (user?.role === 'Admin' && selectedCrew) {
        formData.append('assignedCrew', selectedCrew);
      }
      if (resolutionFile) {
        formData.append('resolutionImage', resolutionFile);
      }

      const { data } = await api.put(`/reports/${id}/status`, formData);

      setReport(data);
      setResolutionFile(null);
      setResolutionPreview(null);
      setNote('');
      setUpdateSuccess('Status and evidence saved successfully.');
    } catch (error: any) {
      setUpdateError(error.response?.data?.message || 'Failed to update report status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-brand-gray">Loading report details...</div>;
  }

  if (!report) {
    const isForbidden = fetchError?.status === 403;
    const isNotFound = fetchError?.status === 404;
    const isUnauth = fetchError?.status === 401;

    return (
      <div className="max-w-xl mx-auto my-16 glass-panel p-8 text-center space-y-4">
        <AlertCircle className="w-14 h-14 mx-auto text-red-400" />
        <h2 className="text-2xl font-bold text-brand-white">
          {isForbidden
            ? 'Access Restricted'
            : isNotFound
            ? 'Hazard Report Not Found'
            : isUnauth
            ? 'Authentication Required'
            : 'Unable to Load Report'}
        </h2>
        <p className="text-sm text-brand-gray leading-relaxed">
          {fetchError?.message ||
            'The requested report does not exist or you lack permission to view it.'}
        </p>

        {isForbidden && user && (
          <div className="p-3 bg-brand-dark/80 rounded border border-brand-border text-xs text-brand-gray">
            Currently authenticated as: <span className="text-brand-white font-mono">{user.name}</span> ({user.role})
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          {isUnauth ? (
            <Link to="/login" className="btn-primary text-xs px-4 py-2">
              Sign In Again
            </Link>
          ) : isForbidden ? (
            <>
              <Link to="/dashboard" className="btn-secondary text-xs px-4 py-2">
                Return to Dashboard
              </Link>
              <Link to="/login" className="btn-primary text-xs px-4 py-2">
                Switch Portal / Account
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="btn-secondary text-xs px-4 py-2">
                Return to Dashboard
              </Link>
              <button
                onClick={fetchReport}
                className="btn-primary text-xs px-4 py-2"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const rawLng = report.location?.coordinates?.[0];
  const rawLat = report.location?.coordinates?.[1];
  const lat = rawLat !== undefined && !isNaN(Number(rawLat)) ? Number(rawLat) : 40.730610;
  const lng = rawLng !== undefined && !isNaN(Number(rawLng)) ? Number(rawLng) : -73.935242;

  // Render bounding box overlays on top of the image
  const renderBoundingBoxes = () => {
    if (!report.aiDetections || report.aiDetections.length === 0 || !naturalDimensions || !imageRef.current) {
      return null;
    }

    const renderedWidth = imageRef.current.clientWidth;
    const renderedHeight = imageRef.current.clientHeight;

    const scaleX = renderedWidth / naturalDimensions.width;
    const scaleY = renderedHeight / naturalDimensions.height;

    return report.aiDetections.map((det: any, idx: number) => {
      const bbox = det.bbox;
      if (!bbox) return null;

      const left = (bbox.x - bbox.width / 2) * scaleX;
      const top = (bbox.y - bbox.height / 2) * scaleY;
      const width = bbox.width * scaleX;
      const height = bbox.height * scaleY;

      return (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: `${Math.max(0, left)}px`,
            top: `${Math.max(0, top)}px`,
            width: `${width}px`,
            height: `${height}px`,
          }}
          className="border-2 border-brand-copper bg-brand-copper/20 pointer-events-none rounded-sm"
        >
          <span className="bg-brand-copper text-brand-dark font-mono text-[10px] font-bold px-1.5 py-0.5 absolute -top-5 left-0 rounded-t whitespace-nowrap shadow">
            {det.class} ({Math.round(det.confidence * 100)}%)
          </span>
        </div>
      );
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Back navigation */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-brand-gray hover:text-brand-copper transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-brand-white">{report.hazardCategory}</h1>
            <span
              className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                report.status === 'Resolved'
                  ? 'bg-green-900/60 text-green-300 border border-green-500/50'
                  : report.status === 'In Progress'
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-500/50'
                  : report.status === 'Assigned'
                  ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-500/50'
                  : 'bg-brand-charcoal text-brand-gray border border-brand-border'
              }`}
            >
              {report.status}
            </span>
          </div>
          <div className="text-brand-gray text-xs font-mono mt-1">Incident Record: {report.reportId}</div>
        </div>

        <div
          className={`px-4 py-2 rounded-lg font-bold text-base flex flex-col items-start sm:items-end ${
            report.severityLabel === 'Critical'
              ? 'bg-red-900/50 text-red-300 border border-red-500/50'
              : report.severityLabel === 'High'
              ? 'bg-orange-900/50 text-orange-300 border border-orange-500/50'
              : report.severityLabel === 'Medium'
              ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/50'
              : 'bg-green-900/50 text-green-300 border border-green-500/50'
          }`}
        >
          <span>{report.severityLabel} Priority ({report.finalSeverityScore}/100)</span>
          <span className="text-[10px] font-normal opacity-80">Municipal Triage Priority Score</span>
        </div>
      </div>

      {/* Before & After Repair Evidence Section (When Resolved) */}
      {report.resolutionImageUrl && (
        <div className="glass-panel p-6 border-green-500/40 border">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-brand-white">Verified Repair Completion Evidence</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Photo */}
            <div>
              <div className="text-xs font-semibold uppercase text-brand-gray mb-2 flex items-center justify-between">
                <span>Before: Citizen Reported Hazard</span>
                <span className="font-mono text-[10px]">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="h-64 rounded-lg overflow-hidden bg-brand-dark border border-brand-border">
                <SafeImage
                  src={report.imageUrl}
                  alt="Original hazard before repair"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* After Photo */}
            <div>
              <div className="text-xs font-semibold uppercase text-green-400 mb-2 flex items-center justify-between">
                <span>After: Field Crew Completed Repair</span>
                {report.resolvedAt && (
                  <span className="font-mono text-[10px] text-green-300">
                    {new Date(report.resolvedAt).toLocaleDateString()} {new Date(report.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="h-64 rounded-lg overflow-hidden bg-brand-dark border border-green-500/40">
                <SafeImage
                  src={report.resolutionImageUrl}
                  alt="After repair proof"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Resolution Details */}
          <div className="mt-4 pt-4 border-t border-brand-border/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
            <div>
              <span className="text-brand-gray">Resolution Summary: </span>
              <span className="text-brand-white font-medium">
                {report.resolutionNotes || 'Repair verified and signed off by maintenance personnel.'}
              </span>
            </div>
            {report.resolvedBy?.name && (
              <div className="text-brand-copper font-medium">
                Signed off by: {report.resolvedBy.name}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Details, Image, AI, and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column (2 cols): Citizen photo, AI analysis, and map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Photo (if not already displayed in Before/After section, or full preview) */}
          {!report.resolutionImageUrl && (
            <div className="glass-panel overflow-hidden">
              <div className="relative bg-black flex justify-center items-center max-h-[500px] overflow-hidden">
                <img
                  ref={imageRef}
                  src={normalizeImageUrl(report.imageUrl)}
                  alt={report.hazardCategory}
                  onLoad={handleImageLoad}
                  className="w-full h-auto object-contain max-h-[500px]"
                />
                {renderBoundingBoxes()}
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2 text-brand-white">Citizen Hazard Description</h3>
                <p className="text-brand-white leading-relaxed text-sm">
                  {report.description || 'No additional details provided by citizen.'}
                </p>
                {report.citizen?.name && (
                  <div className="mt-4 pt-3 border-t border-brand-border/60 text-xs text-brand-gray flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-brand-copper" />
                    <span>Reported by: <strong>{report.citizen.name}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Vision Inference & Severity Rationale */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-brand-white">
              <Bot className="text-brand-copper w-5 h-5" /> AI Severity & Vision Inference
            </h3>

            {report.aiDetections && report.aiDetections.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {report.aiDetections.map((det: any, idx: number) => (
                    <div key={idx} className="bg-brand-dark p-3 rounded-md border border-brand-border">
                      <div className="font-medium capitalize text-sm mb-1 text-brand-white">{det.class}</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-brand-gray">Detection Confidence</span>
                        <span className="text-brand-copper font-mono font-bold">{(det.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-brand-gray flex justify-between items-center pt-2 border-t border-brand-border">
                  <span>Model ID: <code className="font-mono text-brand-white">{report.modelMetadata?.modelId || 'road-damage'}</code></span>
                  <span>Inference Time: {report.modelMetadata?.inferenceTimeMs || 0}ms</span>
                </div>
              </div>
            ) : (
              <div className="bg-brand-dark/70 border border-brand-border p-4 rounded-md space-y-2">
                <div className="flex items-center gap-2 text-brand-copper text-sm font-medium">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    AI Status: {report.modelMetadata?.modelId === 'none' ? 'Not Configured (Rule-Based Triage Active)' : 'No Automated Objects Detected'}
                  </span>
                </div>
                <p className="text-xs text-brand-gray leading-relaxed">
                  {report.modelMetadata?.status ||
                    'AI vision inference is currently using deterministic municipal category rules. Scores are calculated deterministically to maintain public service reliability without hallucination.'}
                </p>
              </div>
            )}

            {/* Severity explanation banner */}
            <div className="mt-4 p-3 bg-brand-charcoal/80 border border-brand-border rounded-md text-xs text-brand-gray flex items-start gap-2">
              <Info className="w-4 h-4 text-brand-copper shrink-0 mt-0.5" />
              <span>
                <strong>Prioritization Estimate:</strong> The CIVORA severity score (0–100) is a municipal prioritization ranking computed from hazard danger baselines and verified detections. It assists crew dispatch triage and is not a definitive structural safety assessment.
              </span>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="glass-panel p-0 overflow-hidden h-[360px] z-0 relative">
            <div className="p-3 bg-brand-charcoal border-b border-brand-border text-xs flex justify-between items-center">
              <span className="flex items-center gap-1.5 font-semibold text-brand-white">
                <MapPin className="w-4 h-4 text-brand-copper" /> Incident Coordinates
              </span>
              <span className="font-mono text-brand-gray">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </div>
            <MapContainer center={[lat, lng]} zoom={15} style={{ height: 'calc(100% - 41px)', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapInit />
              <RecenterMap position={{ lat, lng }} />
              <Marker position={[lat, lng]}>
                <Popup>
                  <div className="text-xs font-sans space-y-1.5 p-1 max-w-[220px]">
                    <div className="font-bold text-sm text-gray-900">{report.hazardCategory}</div>
                    <div className="text-gray-700">
                      Severity: <strong>{report.severityLabel}</strong> ({report.finalSeverityScore}/100)
                    </div>
                    <div className="text-gray-700">
                      Status: <strong>{report.status}</strong>
                    </div>
                    <div className="text-gray-600 text-[11px] truncate" title={report.location?.address}>
                      {report.location?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {/* Right column (1 col): Status, Crew Assignment, and Resolution Form */}
        <div className="space-y-6">
          {/* Action Panel for Admin and Crew */}
          {(user?.role === 'Admin' || user?.role === 'Crew') && (
            <div className="glass-panel p-6 border-brand-copper/60 border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-brand-white">
                <Edit className="w-5 h-5 text-brand-copper" />
                {user?.role === 'Admin' ? 'Admin Dispatch & Status' : 'Crew Work Order & Resolution'}
              </h3>

              {updateSuccess && (
                <div className="mb-4 p-3 bg-green-900/30 border border-green-500/40 text-green-300 text-xs rounded flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{updateSuccess}</span>
                </div>
              )}

              {updateError && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/40 text-red-300 text-xs rounded">
                  {updateError}
                </div>
              )}

              <form onSubmit={handleStatusUpdate} className="space-y-4">
                {/* Admin Crew Assignment Dropdown */}
                {user?.role === 'Admin' && (
                  <div>
                    <label className="label-text flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-brand-copper" /> Assign Maintenance Crew
                    </label>
                    <select
                      value={selectedCrew}
                      onChange={(e) => setSelectedCrew(e.target.value)}
                      className="input-field text-xs"
                    >
                      <option value="">-- Unassigned --</option>
                      {crewList.map((crew) => (
                        <option key={crew._id} value={crew._id}>
                          {crew.name} ({crew.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Selection */}
                <div>
                  <label className="label-text">Update Report Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="input-field text-xs"
                  >
                    {user?.role === 'Admin' ? (
                      <>
                        <option value="Submitted">Submitted (Triage)</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Assigned">Assigned to Crew</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved (Completed)</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Duplicate">Duplicate</option>
                      </>
                    ) : (
                      <>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved (Requires Proof)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Repair Photograph Upload (Mandatory when Crew resolves) */}
                {newStatus === 'Resolved' && (
                  <div className="p-3 bg-brand-dark rounded-md border border-brand-border space-y-2">
                    <label className="label-text flex items-center gap-1.5 text-brand-copper font-bold">
                      <Camera className="w-4 h-4" /> After-Repair Photograph (Mandatory)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleResolutionFileChange}
                      className="text-xs text-brand-gray file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-brand-charcoal file:text-brand-white hover:file:bg-brand-border w-full"
                    />

                    {resolutionPreview && (
                      <div className="mt-2 h-28 rounded overflow-hidden border border-brand-border">
                        <img
                          src={resolutionPreview}
                          alt="After repair preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Progress / Resolution Note */}
                <div>
                  <label className="label-text">
                    {newStatus === 'Resolved' ? 'Resolution Work Notes (Mandatory)' : 'Work Progress / Audit Note'}
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="input-field text-xs"
                    rows={3}
                    placeholder={
                      newStatus === 'Resolved'
                        ? 'Describe repair completed: materials used, road surface compacted, clearance verified...'
                        : 'Enter status change notes or dispatch instructions...'
                    }
                  />
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary w-full py-2.5 text-xs font-semibold"
                >
                  {updating
                    ? 'Saving Updates...'
                    : newStatus === 'Resolved'
                    ? 'Upload Proof & Mark Resolved'
                    : 'Save & Update Status'}
                </button>
              </form>
            </div>
          )}

          {/* Assigned Crew Info */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold mb-3 border-b border-brand-border pb-2 text-brand-white">
              Assigned Maintenance Unit
            </h3>
            {report.assignedCrew ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-copper/20 border border-brand-copper/50 flex items-center justify-center text-brand-copper text-xs font-bold">
                  {report.assignedCrew.name ? report.assignedCrew.name[0] : 'C'}
                </div>
                <div>
                  <div className="text-sm font-medium text-brand-white">{report.assignedCrew.name || 'Crew Member'}</div>
                  <div className="text-xs text-brand-gray">{report.assignedCrew.email || 'Municipal Field Crew'}</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-brand-gray italic">No maintenance unit assigned yet.</div>
            )}
          </div>

          {/* Audit History Timeline */}
          <div className="glass-panel p-6">
            <h3 className="text-base font-semibold mb-4 border-b border-brand-border pb-2 text-brand-white">
              Audit Trail & Lifecycle History
            </h3>
            <div className="space-y-3">
              {report.statusHistory?.map((history: any, idx: number) => (
                <div key={idx} className="p-3 rounded bg-brand-dark border border-brand-border text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-brand-copper">{history.status}</span>
                    <span className="text-[10px] text-brand-gray flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(history.timestamp).toLocaleDateString()} {new Date(history.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {history.note && <div className="text-brand-white mt-1">{history.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
