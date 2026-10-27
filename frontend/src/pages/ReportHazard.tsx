import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Camera, MapPin, Upload, Loader2, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically re-center the map when a valid position is selected or GPS acquired
function RecenterMap({ position }: { position: { lat: number; lng: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 16, { animate: true });
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

// Component to handle map clicks and place/drag interactive marker
function MapClickSelector({
  position,
  onSelectPosition
}: {
  position: { lat: number; lng: number } | null;
  onSelectPosition: (pos: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onSelectPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position ? (
    <Marker
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          if (marker) {
            const latLng = marker.getLatLng();
            onSelectPosition({ lat: latLng.lat, lng: latLng.lng });
          }
        }
      }}
      position={[position.lat, position.lng]}
    />
  ) : null;
}

export const ReportHazard = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState('Pothole');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isManualAddress, setIsManualAddress] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);

  // Explicit latitude & longitude states for reliable tracking
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number; source?: string } | null>(null);

  const [locationError, setLocationError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSubmitError('Invalid file format. Please upload a JPEG, PNG, or WebP image.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('Image file is too large. Maximum size allowed is 5MB.');
        return;
      }
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setSubmitError(null);
    }
  };

  // Reverse geocode street address using OpenStreetMap Nominatim with clean coordinate fallback
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      setResolvingAddress(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address;
        let resolved = '';
        if (addr) {
          const road = addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb || '';
          const city = addr.city || addr.town || addr.village || addr.city_district || addr.county || '';
          if (road && city) resolved = `${road}, ${city}`;
        }
        if (!resolved && data.display_name) {
          resolved = data.display_name.split(',').slice(0, 3).join(', ');
        }
        if (resolved) {
          setAddress(resolved);
          return;
        }
      }
    } catch {
      // Graceful fallback if network or rate limit prevents Nominatim lookup
    } finally {
      setResolvingAddress(false);
    }
    // Clean human-readable fallback so address never stays pending
    setAddress(`Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  };

  // Centralized helper to synchronize latitude, longitude, and map pin state
  const applyCoordinates = (lat: number, lng: number, acc?: number, source: string = 'Manual Map Pin') => {
    setLatitude(lat);
    setLongitude(lng);
    setAccuracy(acc ?? null);
    setLocationSource(source);
    setLocation({
      lat,
      lng,
      accuracy: acc,
      source
    });
    setLocationError('');
    if (!isManualAddress) {
      reverseGeocode(lat, lng);
    }
  };

  const getGPSLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please click directly on the map to set location.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;
        applyCoordinates(lat, lng, acc, 'GPS Sensor');
      },
      (err) => {
        setGpsLoading(false);
        let errorMsg = 'GPS access not available.';
        if (err.code === 1) {
          errorMsg = 'Location permission denied by user. Please allow location access in your browser settings or click on the map.';
        } else if (err.code === 2) {
          errorMsg = 'Location information unavailable from your device. Please click on the map.';
        } else if (err.code === 3) {
          errorMsg = 'GPS location request timed out. Please retry or click directly on the map.';
        }
        setLocationError(`${errorMsg} (${err.message || 'code ' + err.code}). Please click directly on the map below to place the hazard pin.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleMapSelect = (coords: { lat: number; lng: number }) => {
    applyCoordinates(coords.lat, coords.lng, undefined, 'Manual Map Pin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsAuthError(false);

    if (!user || !user.token) {
      setSubmitError('Your session has expired or you are not signed in. Please sign in again.');
      setIsAuthError(true);
      return;
    }

    if (!image) {
      setSubmitError('Please provide a hazard photo before submitting.');
      return;
    }

    const activeLat = latitude ?? location?.lat;
    const activeLng = longitude ?? location?.lng;

    if (activeLat === null || activeLat === undefined || activeLng === null || activeLng === undefined) {
      setSubmitError('Please provide location coordinates via GPS or by clicking on the map.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('image', image);
    formData.append('hazardCategory', category);
    formData.append('description', description);
    // Send both JSON stringified coordinates array [lng, lat] and separate latitude/longitude
    formData.append('coordinates', JSON.stringify([activeLng, activeLat]));
    formData.append('latitude', activeLat.toString());
    formData.append('longitude', activeLng.toString());
    if (address.trim()) {
      formData.append('address', address.trim());
    }
    const activeAcc = accuracy ?? location?.accuracy;
    if (activeAcc) {
      formData.append('accuracy', activeAcc.toString());
    }

    try {
      // Shared Axios client attaches Authorization: Bearer <JWT> via interceptor.
      // Browser and Axios automatically set the proper multipart/form-data boundary.
      const res = await api.post('/reports', formData);
      setSubmitSuccess('Hazard report submitted successfully! Redirecting to report details...');
      setTimeout(() => {
        navigate(`/report/${res.data._id}`);
      }, 500);
    } catch (error: any) {
      setSubmitting(false);
      if (error.response?.status === 401) {
        setIsAuthError(true);
        setSubmitError('Session expired or unauthorized. Please sign in again.');
      } else if (error.response?.status === 503) {
        setSubmitError(error.response?.data?.message || 'Database service is connecting or unavailable. Please retry in a few moments.');
      } else if (error.response?.data?.message) {
        setSubmitError(error.response.data.message);
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        setSubmitError('Unable to reach CIVORA backend server on port 5001. Please verify the backend is running.');
      } else {
        setSubmitError('Failed to submit report. Please review your information and try again.');
      }
    }
  };

  // Center map around selected location, or default city coordinates (New York City center)
  const defaultCenter: [number, number] = location ? [location.lat, location.lng] : [40.730610, -73.935242];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Report a Civic Hazard</h1>
      <p className="text-brand-gray mb-8">Submit infrastructure defects for municipal evaluation and crew dispatch.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Card */}
        <div className="glass-panel p-6">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-copper" /> 1. Hazard Photo
          </h2>
          <div className="space-y-4">
            {preview ? (
              <div className="relative h-64 rounded-lg overflow-hidden border border-brand-border bg-black">
                <img src={preview} alt="Hazard Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => { setImage(null); setPreview(null); }}
                  className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white px-3 py-1 text-xs font-semibold rounded-full backdrop-blur transition-colors"
                >
                  Change Photo
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-brand-border rounded-lg h-56 flex flex-col items-center justify-center text-brand-gray hover:border-brand-copper transition-colors cursor-pointer bg-brand-dark/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-12 h-12 mb-2 text-brand-copper" />
                <p className="text-sm font-medium text-brand-white">Click to upload or take a hazard photo</p>
                <p className="text-xs mt-1 text-brand-gray">Supported: JPEG, PNG, WebP (Max: 5MB)</p>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />
          </div>
        </div>

        {/* Location Card with GPS + Interactive Map */}
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-copper" /> 2. Location Tagging
            </h2>
            <button
              type="button"
              onClick={getGPSLocation}
              disabled={gpsLoading}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5 text-brand-copper" />}
              <span>{gpsLoading ? 'Detecting GPS...' : 'Use My GPS'}</span>
            </button>
          </div>

          <p className="text-xs text-brand-gray mb-3">
            Use your browser GPS or click directly anywhere on the map to pin the hazard location:
          </p>

          <div className="h-64 rounded-lg overflow-hidden border border-brand-border relative z-0 mb-4">
            <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapInit />
              <RecenterMap position={location} />
              <MapClickSelector position={location} onSelectPosition={handleMapSelect} />
            </MapContainer>
          </div>

          {location && (
            <div className="p-3 bg-green-900/20 border border-green-500/40 rounded-md text-sm text-green-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <span>
                  <strong>Location Selected ({location.source}):</strong> {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  {location.accuracy ? ` (Accuracy: ${Math.round(location.accuracy)}m)` : ''}
                </span>
              </div>
            </div>
          )}

          {locationError && (
            <div className="p-3 bg-yellow-900/20 border border-yellow-500/40 rounded-md text-sm text-yellow-300 flex items-start gap-2 mt-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <span>{locationError}</span>
            </div>
          )}

          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <label className="label-text mb-0">Street Address / Landmark (Auto-Resolved from Map Pin)</label>
              {resolvingAddress && (
                <span className="text-[11px] text-brand-copper flex items-center gap-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" /> Resolving street address...
                </span>
              )}
            </div>
            <input
              type="text"
              className="input-field"
              placeholder="E.g., Corner of 5th Ave and Main St (automatically resolved or type custom)"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setIsManualAddress(true);
              }}
            />
          </div>
        </div>

        {/* Details Card */}
        <div className="glass-panel p-6">
          <h2 className="text-xl font-semibold mb-4">3. Hazard Details</h2>
          <div className="space-y-4">
            <div>
              <label className="label-text">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
              >
                <option value="Pothole">Pothole / Road Damage</option>
                <option value="Garbage">Illegal Dumping / Garbage</option>
                <option value="Broken Streetlight">Broken Streetlight</option>
                <option value="Fallen Tree">Fallen Tree / Obstruction</option>
                <option value="Waterlogging">Waterlogging / Flooding</option>
                <option value="Other">Other Civic Hazard</option>
              </select>
            </div>
            <div>
              <label className="label-text">Description (Optional)</label>
              <textarea
                rows={3}
                className="input-field"
                placeholder="Describe danger level, traffic impediment, or surrounding conditions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {submitError && (
          <div className="p-4 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-sm space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{submitError}</div>
            </div>
            {isAuthError && (
              <div className="pt-2 border-t border-red-500/30 flex justify-end">
                <Link
                  to="/login"
                  className="px-4 py-1.5 bg-brand-copper hover:bg-brand-copper/90 text-brand-dark font-semibold text-xs rounded transition-colors inline-flex items-center gap-1"
                >
                  Sign In Again
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Success Confirmation */}
        {submitSuccess && (
          <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="leading-relaxed font-medium">{submitSuccess}</div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !image || !location}
          className="w-full btn-primary py-4 text-lg flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Processing Hazard & AI Severity...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span>Submit Report</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
