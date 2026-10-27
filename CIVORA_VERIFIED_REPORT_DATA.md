# CIVORA AI MINI PROJECT — Complete Verified Project Report Data
**Technical Audit & Codebase Verification Report**  
**Generated Date:** October 27, 2026  
**System:** CIVORA — Civic Intelligence & Municipal Hazard Prioritization Platform  
**Authors:** Senior Full-Stack Engineering & Technical Audit Team  

---

## 1. Exact Source Code Directory Structure

### 1.1 Backend Source Tree (`backend/src/`)
| File Path | 1-Line Description |
| :--- | :--- |
| `backend/src/config/db.ts` | Connects to MongoDB Atlas using Mongoose with connection pooling, status logging, and automatic background retry. |
| `backend/src/controllers/auth.ts` | Handles citizen registration, password hashing/bcrypt comparison, JWT token issuance, profile queries, and crew listing. |
| `backend/src/controllers/reports.ts` | Core controller handling multipart report creation, multi-format coordinate parsing, Nominatim reverse geocoding, AI vision analysis, severity triage, status transitions, and metrics. |
| `backend/src/index.ts` | Express server entry point configuring CORS, JSON/URL-encoded parsers, static `/uploads` serving, route mounting, health check, and port binding. |
| `backend/src/middlewares/auth.ts` | Enforces JWT token validation (`protect`), administrator access verification (`adminCheck`), and crew/admin dispatch authorization (`crewOrAdminCheck`). |
| `backend/src/models/HazardReport.ts` | Mongoose schema and model defining hazard incident records, GeoJSON 2dsphere coordinates, AI detections, model metadata, severity score/label, and audit history. |
| `backend/src/models/User.ts` | Mongoose schema and model defining user accounts with role-based access control (`Citizen`, `Admin`, `Crew`). |
| `backend/src/routes/auth.ts` | Express route definitions exposing endpoints for registration, login, profile check (`/me`), and crew directory (`/crew`). |
| `backend/src/routes/reports.ts` | Express route definitions mapping report creation, retrieval, filtering, priority sorting, admin stats, and crew status updates. |
| `backend/src/seed.ts` | Non-destructive database seeding script upserting demo users (`citizen`, `admin`, `crew`) and sample municipal hazard reports into MongoDB Atlas. |
| `backend/src/services/ai.ts` | Computer vision service integrating with the Roboflow object detection API with graceful, zero-mock fallback when unconfigured. |
| `backend/src/services/demoStore.ts` | In-memory reactive state store providing complete CRUD fallback and statistics when running without a live MongoDB connection. |
| `backend/src/services/upload.ts` | Multer storage engine routing uploads to Cloudinary or local disk with 5MB file limits and MIME type filtering. |
| `backend/src/test_suite.ts` | Comprehensive automated test suite containing 47 unit and integration tests across severity scoring, clamping, RBAC, query logic, coordinate parsing, and reverse geocoding. |
| `backend/src/utils/severity.ts` | Deterministic municipal hazard severity calculation engine implementing category regex baselines, AI confidence multipliers, detection count factors, and clamping (0–100). |

### 1.2 Frontend Source Tree (`frontend/src/`)
| File Path | 1-Line Description |
| :--- | :--- |
| `frontend/src/api/axios.ts` | Shared Axios HTTP client configured with baseURL proxying and automatic JWT Bearer token request interceptors. |
| `frontend/src/assets/hero.png` | High-resolution municipal command center hero banner image rendered on the public landing page. |
| `frontend/src/assets/react.svg` | React framework logo asset. |
| `frontend/src/assets/vite.svg` | Vite build tool logo asset. |
| `frontend/src/components/AdminDashboard.tsx` | Municipal command center featuring priority hazard queue, interactive Leaflet geospatial map with severity markers, and crew dispatch controls. |
| `frontend/src/components/CitizenDashboard.tsx` | Citizen tracking portal displaying personal hazard reports, lifecycle status badges, live polling, and report submission CTA. |
| `frontend/src/components/CrewDashboard.tsx` | Field crew work order management dashboard displaying assigned repairs and repair evidence upload forms. |
| `frontend/src/components/Navbar.tsx` | Top navigation bar displaying brand identity, role-based navigation links, and authenticated user controls. |
| `frontend/src/components/SafeImage.tsx` | Resilient image display component replacing broken image URLs with a branded placeholder card. |
| `frontend/src/context/AuthContext.tsx` | React Context provider managing global authentication state, user credentials, and localStorage token synchronization. |
| `frontend/src/pages/Dashboard.tsx` | Dynamic dashboard router rendering role-specific views (`AdminDashboard`, `CrewDashboard`, or `CitizenDashboard`). |
| `frontend/src/pages/Landing.tsx` | Public landing page presenting CIVORA municipal value propositions, architecture highlights, and sign-in CTA. |
| `frontend/src/pages/Login.tsx` | Role-partitioned login portal with tab selectors enforcing strict role-based access control. |
| `frontend/src/pages/ReportDetails.tsx` | Detailed incident inspection screen displaying citizen photo, AI detections, before/after repair proof, and interactive Leaflet map. |
| `frontend/src/pages/ReportHazard.tsx` | Citizen reporting workflow featuring photo upload, browser GPS capture, draggable map-pin drop, and reverse geocoding. |
| `frontend/src/App.css` | Supplementary application component styling rules. |
| `frontend/src/App.tsx` | Main application routing component configuring public and protected routes across all roles. |
| `frontend/src/index.css` | Core design system stylesheet defining design tokens, dark theme, glassmorphism panels, and Tailwind directives. |
| `frontend/src/main.tsx` | Frontend application entry point mounting React root with BrowserRouter and AuthProvider wrappers. |

---

## 2. Exact Database Schemas Verbatim

### 2.1 User Model (`backend/src/models/User.ts`)
```typescript
import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
  Citizen = 'Citizen',
  Admin = 'Admin',
  Crew = 'Crew'
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.Citizen }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', UserSchema);
```

### 2.2 Hazard Report Model (`backend/src/models/HazardReport.ts`)
```typescript
import mongoose, { Document, Schema } from 'mongoose';

export enum ReportStatus {
  Submitted = 'Submitted',
  UnderReview = 'Under Review',
  Approved = 'Approved',
  Assigned = 'Assigned',
  InProgress = 'In Progress',
  Resolved = 'Resolved',
  Rejected = 'Rejected',
  Duplicate = 'Duplicate'
}

export enum SeverityLabel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export interface IHazardReport extends Document {
  reportId: string;
  citizen: mongoose.Types.ObjectId;
  imageUrl: string;
  hazardCategory: string;
  description?: string;
  aiDetections: Array<{
    class: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
  modelMetadata?: {
    modelId: string;
    inferenceTimeMs: number;
  };
  aiSeverityRecommendation?: number;
  finalSeverityScore: number;
  severityLabel: SeverityLabel;
  location: {
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
    accuracy?: number;
  };
  status: ReportStatus;
  assignedCrew?: mongoose.Types.ObjectId;
  adminNotes?: string;
  resolutionNotes?: string;
  resolutionImageUrl?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  statusHistory: Array<{
    status: ReportStatus;
    changedBy: mongoose.Types.ObjectId;
    timestamp: Date;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const HazardReportSchema: Schema = new Schema({
  reportId: { type: String, required: true, unique: true },
  citizen: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  hazardCategory: { type: String, required: true },
  description: { type: String },
  aiDetections: [{
    class: { type: String },
    confidence: { type: Number },
    bbox: {
      x: { type: Number },
      y: { type: Number },
      width: { type: Number },
      height: { type: Number }
    }
  }],
  modelMetadata: {
    modelId: { type: String },
    inferenceTimeMs: { type: Number }
  },
  aiSeverityRecommendation: { type: Number },
  finalSeverityScore: { type: Number, required: true },
  severityLabel: { type: String, enum: Object.values(SeverityLabel), required: true },
  location: {
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: { type: String },
    accuracy: { type: Number }
  },
  status: { type: String, enum: Object.values(ReportStatus), default: ReportStatus.Submitted },
  assignedCrew: { type: Schema.Types.ObjectId, ref: 'User' },
  adminNotes: { type: String },
  resolutionNotes: { type: String },
  resolutionImageUrl: { type: String },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  statusHistory: [{
    status: { type: String, enum: Object.values(ReportStatus) },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    note: { type: String }
  }]
}, {
  timestamps: true
});

HazardReportSchema.index({ 'location.coordinates': '2dsphere' });

export const HazardReport = mongoose.model<IHazardReport>('HazardReport', HazardReportSchema);
```

---

## 3. Exact REST API Reference Table

| Endpoint Path | HTTP Method | Auth Middleware & Required Role | Expected Request Body / FormData | Response Format & HTTP Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Public (None) | None | **200 OK**: `{ status: string, port: number, database: string }` |
| `/api/auth/register` | `POST` | Public (None) | JSON: `{ name: string, email: string, password: string }` | **201 Created**: `{ _id, name, email, role: "Citizen", token }`<br>**400 Bad Request**: `{ message: "Name, email, and password are required" }` or `{ message: "User already exists" }`<br>**500 Server Error**: `{ message: "Internal server error" }` |
| `/api/auth/login` | `POST` | Public (None) | JSON: `{ email: string, password: string }` | **200 OK**: `{ _id, name, email, role, token }`<br>**400 Bad Request**: `{ message: "Email and password are required" }`<br>**401 Unauthorized**: `{ message: "Invalid email or password" }`<br>**500 Server Error**: `{ message: "Internal server error" }` |
| `/api/auth/me` | `GET` | `protect` (Citizen, Admin, Crew) | Header: `Authorization: Bearer <JWT>` | **200 OK**: User object (excluding `passwordHash`)<br>**401 Unauthorized**: `{ message: "Not authorized, no token" }` or `{ message: "Not authorized, token failed" }`<br>**404 Not Found**: `{ message: "User not found" }` |
| `/api/auth/crew` | `GET` | `protect`, `adminCheck` (Admin only) | Header: `Authorization: Bearer <JWT>` | **200 OK**: Array of `{ _id, name, email, role }`<br>**401 Unauthorized**: `{ message: "..." }`<br>**403 Forbidden**: `{ message: "Not authorized as an admin" }` |
| `/api/reports` | `POST` | `protect` (Citizen, Admin, Crew) | `multipart/form-data`:<br>- `image`: File (JPEG, PNG, WebP ≤ 5MB) or `imageUrl`<br>- `hazardCategory`: string<br>- `description`: string (optional)<br>- `coordinates`: `"[lng, lat]"` OR `latitude` & `longitude`<br>- `address`: string (optional; auto-resolved via Nominatim)<br>- `accuracy`: string/number (optional) | **201 Created**: Populated HazardReport document<br>**400 Bad Request**: Invalid coordinates, missing image, category missing, or file too large<br>**401 Unauthorized**: Session invalid<br>**500 Server Error**: Creation failed |
| `/api/reports` | `GET` | `protect` (Citizen sees own; Crew sees assigned; Admin sees all) | Query parameters:<br>- `status`: ReportStatus or `ALL`<br>- `unresolved`: boolean string (`"true"`)<br>- `severity`: SeverityLabel or `ALL`<br>- `category`: category name or `ALL`<br>- `sort`: `"severity_asc"`, `"newest"`, `"oldest"`, or default (severity DESC) | **200 OK**: Array of HazardReport objects with populated references<br>**401 Unauthorized**: Unauthenticated<br>**500 Server Error**: Retrieval failed |
| `/api/reports/stats` | `GET` | `protect`, `adminCheck` (Admin only) | Header: `Authorization: Bearer <JWT>` | **200 OK**: `{ total: number, pending: number, critical: number, resolved: number }`<br>**401 Unauthorized**: Unauthenticated<br>**403 Forbidden**: Non-admin |
| `/api/reports/:id` | `GET` | `protect` (Citizen: own only; Crew: assigned only; Admin: all) | URL param: `:id` (24-char ObjectId or `reportId` e.g. `REP-DEMO-POTHOLE`) | **200 OK**: Populated HazardReport object<br>**400 Bad Request**: Missing ID parameter<br>**401 Unauthorized**: Token missing/invalid<br>**403 Forbidden**: Access to another user's report without permission<br>**404 Not Found**: Hazard report not found |
| `/api/reports/:id/status` | `PUT` | `protect`, `crewOrAdminCheck` (Admin or Crew) | `multipart/form-data` or JSON:<br>- `status`: ReportStatus string<br>- `note`: string (mandatory if status is `Resolved`)<br>- `assignedCrew`: string ObjectId (Admin only)<br>- `resolutionImage`: File (mandatory if Crew sets `Resolved`)<br>- `finalSeverityScore`: number (Admin override 0–100)<br>- `severityLabel`: SeverityLabel string (Admin override) | **200 OK**: Updated HazardReport document<br>**400 Bad Request**: Missing resolution photograph or repair notes on resolution<br>**401 Unauthorized**: Token invalid<br>**403 Forbidden**: Crew modifying unassigned report, or non-admin/crew role<br>**404 Not Found**: Report not found |

---

## 4. Exact Severity Algorithm (`backend/src/utils/severity.ts`)

### 4.1 Mathematical Formula
$$\text{Score} = \text{Clamp}_{0}^{100}\Big(\text{BaseCategoryScore} + \text{AIConfidenceBoost} + \text{AIMultiDetectionFactor}\Big)$$

Where:
1. **Base Category Score ($\text{BaseCategoryScore}$):**
   - **70 points:** Fallen Tree / Obstruction (`/\b(tree|trees|fallen|obstruction)\b/i`)
   - **50 points:** Pothole / Road Damage (`/\b(pothole|potholes|damage|road)\b/i`)
   - **40 points:** Waterlogging / Flooding (`/\b(water|flood|flooding|waterlogging)\b/i`)
   - **30 points:** Broken Streetlight (`/\b(light|lights|streetlight|streetlights|street)\b/i`)
   - **20 points:** Illegal Dumping / Garbage / Other fallback
2. **AI Confidence Boost ($\text{AIConfidenceBoost}$):**
   $$\text{AIConfidenceBoost} = \max(\text{confidences}) \times 30$$
   *(0 if no AI detections exist; never fabricates values)*
3. **AI Multi-detection Impact Factor ($\text{AIMultiDetectionFactor}$):**
   $$\text{AIMultiDetectionFactor} = \min(20,\, N_{\text{detections}} \times 5)$$
4. **Deterministic Clamping:**
   $$\text{FinalScore} = \min(100,\, \max(0,\, \text{round}(\text{Score})))$$
5. **Priority Classification Thresholds:**
   - **Critical Priority:** $\text{FinalScore} \ge 80$
   - **High Priority:** $60 \le \text{FinalScore} < 80$
   - **Medium Priority:** $35 \le \text{FinalScore} < 60$
   - **Low Priority:** $\text{FinalScore} < 35$

### 4.2 Verbatim Implementation Code
```typescript
import { SeverityLabel } from '../models/HazardReport';

/**
 * Deterministic Municipal Hazard Severity Calculation Engine
 * 
 * Rules:
 * 1. Base category score (0-70):
 *    - Fallen Tree / Obstruction: 70 (high immediate danger to road users)
 *    - Pothole / Road Damage: 50 (moderate-to-high vehicle and cyclist risk)
 *    - Waterlogging / Flooding: 40 (navigational hazard and structural risk)
 *    - Broken Streetlight: 30 (visibility / security issue)
 *    - Illegal Dumping / Garbage / Other: 20 (sanitary and aesthetic issue)
 * 
 * 2. AI Confidence Boost (0-30):
 *    - If real AI detections exist: adds (maxConfidence * 30).
 *    - If no detections: 0 boost. Never fabricates values.
 * 
 * 3. AI Multi-detection Impact Factor (0-20):
 *    - Adds 5 points per detected hazard up to a maximum of 20 points.
 * 
 * 4. Deterministic Clamping & Thresholds:
 *    - Clamped strictly between 0 and 100.
 *    - Critical: score >= 80
 *    - High:     60 <= score < 80
 *    - Medium:   35 <= score < 60
 *    - Low:      score < 35
 */
export const calculateSeverity = (category?: string, aiDetections?: any[]): { score: number, label: SeverityLabel } => {
  let score = 0;
  
  const lowerCat = String(category || '').toLowerCase().trim();
  if (/\b(tree|trees|fallen|obstruction)\b/i.test(lowerCat)) {
    score += 70;
  } else if (/\b(pothole|potholes|damage|road)\b/i.test(lowerCat)) {
    score += 50;
  } else if (/\b(water|flood|flooding|waterlogging)\b/i.test(lowerCat)) {
    score += 40;
  } else if (/\b(light|lights|streetlight|streetlights|street)\b/i.test(lowerCat)) {
    score += 30;
  } else {
    score += 20;
  }
  
  if (Array.isArray(aiDetections) && aiDetections.length > 0) {
    const validConfidences = aiDetections
      .map(d => typeof d?.confidence === 'number' && !isNaN(d.confidence) ? d.confidence : 0)
      .filter(c => c > 0);
      
    if (validConfidences.length > 0) {
      const maxConfidence = Math.max(...validConfidences);
      score += maxConfidence * 30;
    }
    
    const countBoost = Math.min(20, aiDetections.length * 5);
    score += countBoost;
  }
  
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  
  let label = SeverityLabel.Low;
  if (clampedScore >= 80) label = SeverityLabel.Critical;
  else if (clampedScore >= 60) label = SeverityLabel.High;
  else if (clampedScore >= 35) label = SeverityLabel.Medium;
  
  return { score: clampedScore, label };
};
```

---

## 5. Exact AI Service & Upload Service Logic

### 5.1 AI Service (`backend/src/services/ai.ts`)
- **Configuration Check:** Validates `process.env.ROBOFLOW_API_KEY`. Returns `false` if missing, empty, or set to placeholder string (`'your_roboflow_api_key'`).
- **Unconfigured Graceful Degradation:**
  When unconfigured, immediately returns:
  ```json
  {
    "configured": false,
    "detections": [],
    "metadata": {
      "modelId": "none",
      "inferenceTimeMs": 0,
      "status": "AI detection is not configured. Add a valid ROBOFLOW_API_KEY in backend/.env to enable inference."
    }
  }
  ```
  Zero mocked, fabricated, or hallucinated bounding boxes/confidences are produced. The severity engine falls back deterministically to municipal category baselines.
- **Configured Inference:**
  - Endpoint: `https://detect.roboflow.com/${process.env.ROBOFLOW_MODEL_ENDPOINT || 'road-damage-nqw00/1'}`
  - Method: `POST` with `api_key` and `image` parameters, with a 10,000ms timeout.
  - Formats predictions into `{ class, confidence, bbox: { x, y, width, height } }`.
- **Runtime Error Shielding:** Catches network timeouts, unreachable domains, or invalid API keys, returning `{ configured: false, detections: [], metadata: { modelId, status: "Inference unavailable: <reason>" } }`.

### 5.2 Upload Service (`backend/src/services/upload.ts`)
- **Environment Variables Used:**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- **Provider Detection:** Validates all three Cloudinary variables exist and are not placeholder values (`'your_cloudinary_name'`, `'mock_cloud'`, `'your_cloudinary_api_key'`, `'your_cloudinary_api_secret'`).
- **Storage Dual-Engine:**
  1. **Cloudinary Engine (`isCloudinaryConfigured === true`):** Uses `multer-storage-cloudinary` targeting folder `'civora_reports'` with JPEG format conversion.
  2. **Local Disk Engine (`isCloudinaryConfigured === false`):** Uses `multer.diskStorage` persisting to `./uploads/` with sanitized timestamp-prefixed filenames `${Date.now()}-${random}${ext}`.
- **Static Asset Serving:** `backend/src/index.ts` mounts `app.use('/uploads', express.static(uploadsDir))` so locally uploaded photos are immediately browsable via HTTP.
- **Security & Constraints:**
  - Supported MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/jpg`.
  - Max file size: 5MB (`5 * 1024 * 1024`). Files exceeding this trigger an immediate Multer error `LIMIT_FILE_SIZE` returning HTTP 400.

---

## 6. End-to-End Location Tracking & Reverse Geocoding Fix

### 6.1 Location Feature Implementation Summary
1. **High-Accuracy Geolocation ("Use My GPS"):**
   - In `ReportHazard.tsx`, calls `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true`, `timeout: 10000`, and `maximumAge: 0`.
   - Granular error handling maps `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, and `TIMEOUT` to actionable user notices with direct fallback to clicking on the map.
   - Updates `latitude` and `longitude` state immediately upon GPS lock.
2. **Dynamic Map Pan & Recenter (`RecenterMap` & `MapInit`):**
   - React-Leaflet `RecenterMap` component triggers `map.setView([position.lat, position.lng], 16, { animate: true })` and calls `map.invalidateSize()`.
   - `MapInit` component forces Leaflet to re-measure its container 200ms after mounting, completely eliminating grey/un-rendered tile artifacts.
3. **Draggable Pin-Drop Selection:**
   - React-Leaflet `<Marker>` configured with `draggable={true}` and `dragend` listener. Dragging or clicking on the map accurately synchronizes `latitude` and `longitude` state.
4. **End-to-End Reverse Geocoding & Address Resolution:**
   - **Frontend:** Automatically queries OpenStreetMap Nominatim API (`zoom=18`) upon GPS lock or map pin selection. If Nominatim fails or times out, safely falls back to formatted coordinates (`Coordinates: lat, lng`), so the address field is never empty.
   - **Backend Controller:** In `backend/src/controllers/reports.ts`, `reverseGeocodeCoordinates(lat, lng)` automatically resolves coordinates into human-readable street/locality names before saving to MongoDB, with a clean coordinate fallback (`Coordinates: lat, lng`). Reports never remain permanently stuck saying "Street address pending".
5. **Flexible Multi-Format Coordinate Parser (`parseCoordinates`):**
   - Uses strict `toValidNumber` conversion to safely reject empty string values (`""` will not coerce to `0`).
   - Accepts coordinates as:
     - Separate `latitude` and `longitude` numbers or non-empty strings
     - Array `[longitude, latitude]` or JSON string `"[-73.935, 40.730]"`
     - Location object `{ coordinates: [lng, lat] }` or JSON string
   - Rejects out-of-bounds coordinates (`lat < -90 || lat > 90 || lng < -180 || lng > 180`).
6. **Admin & Report Details Interactive Map Popups:**
   - Popups on both Admin Operations Center and Report Details screens show hazard category, severity priority label & score (`High (78/100)`), status, and resolved address/coordinates.

---

## 7. Fresh Test & Build Verification Output

### 7.1 Backend Test Suite (`test_suite.ts`)
```
========================================
 CIVORA AUTOMATED TEST SUITE
========================================

[1] Severity Scoring Engine Tests:
  ✓ PASS: Pothole without AI -> Score: 50 (Expected 50), Label: Medium (Expected Medium)
  ✓ PASS: Fallen Tree without AI -> Score: 70 (Expected 70), Label: High (Expected High)
  ✓ PASS: Waterlogging without AI -> Score: 40 (Expected 40), Label: Medium (Expected Medium)
  ✓ PASS: Broken Streetlight without AI -> Score: 30 (Expected 30), Label: Low (Expected Low)
  ✓ PASS: Garbage without AI -> Score: 20 (Expected 20), Label: Low (Expected Low)
  ✓ PASS: Pothole with 92% AI detection -> Score: 83 (Expected 83), Label: Critical (Expected Critical)
  ✓ PASS: Extreme composite hazard strictly clamped at 100 -> Score: 100
  ✓ PASS: Empty category fallback safely handled -> Score: 20

[2] AI Service & Fallback Tests:
  ℹ AI Configured Status: DISABLED (Using graceful fallback)
  ✓ PASS: When ROBOFLOW_API_KEY is not configured, returns safe empty detections without mocking
  ✓ PASS: Model ID is transparently reported as none

[3] Role & Permission Definitions:
  ✓ PASS: UserRole.Citizen matches "Citizen"
  ✓ PASS: UserRole.Admin matches "Admin"
  ✓ PASS: UserRole.Crew matches "Crew"

[4] Priority Queue Sorting Engine Tests:
  ✓ PASS: Highest severity oldest report (R4, score 85) ranks #1
  ✓ PASS: Highest severity newer report (R2, score 85) ranks #2
  ✓ PASS: High severity report (R3, score 60) ranks #3
  ✓ PASS: Low severity report (R1, score 30) ranks #4 even though it was submitted newest

[5] Crew Resolution & Repair Proof Validation Tests:
  ✓ PASS: Reject resolution when after-repair photograph is missing
  ✓ PASS: Reject resolution when resolution notes are missing
  ✓ PASS: Prevent crew member from resolving work assigned to a different crew
  ✓ PASS: Accept resolution when both after-repair photograph and resolution notes are verified

[6] Role Portal Selection & Access Verification Tests:
  ✓ PASS: Citizen selects Citizen portal -> Login accepted and dashboard accessible
  ✓ PASS: Admin selects Admin portal -> Login accepted and operations center accessible
  ✓ PASS: Crew selects Crew portal -> Login accepted and work queue accessible
  ✓ PASS: Citizen account attempting to enter Admin portal is rejected with clear role mismatch message
  ✓ PASS: Admin account selecting Citizen portal is rejected with clear role mismatch message rather than silently switching roles
  ✓ PASS: Crew account attempting to enter Admin portal is rejected with clear role mismatch message

[7] Report Lookup & Authorization Engine Tests:
  ✓ PASS: Custom report ID resolves safely to reportId query without ObjectId casting
  ✓ PASS: Valid 24-hex ObjectId resolves to dual _id or reportId query
  ✓ PASS: Citizen can view their own hazard report
  ✓ PASS: Citizen is rejected when attempting to access another citizen report
  ✓ PASS: Admin can view any citizen hazard report in the municipal registry
  ✓ PASS: Crew can view assigned work order
  ✓ PASS: Crew cannot access reports assigned to a different crew
  ✓ PASS: Report feed deduplication prevents duplicate report cards

[8] Location Tracking, Coordinate Parsing & Reverse Geocoding Tests:
  ✓ PASS: Parses separate latitude and longitude numeric fields correctly
  ✓ PASS: Parses stringified latitude and longitude values from multipart FormData into numbers
  ✓ PASS: Parses GeoJSON array [longitude, latitude] into lat/lng
  ✓ PASS: Parses JSON-stringified coordinates array "[-73.93524, 40.73061]" from Axios payload
  ✓ PASS: Parses nested location object { coordinates: [lng, lat] }
  ✓ PASS: Rejects out-of-range latitude (> 90)
  ✓ PASS: Rejects out-of-range latitude (< -90)
  ✓ PASS: Rejects out-of-range longitude (> 180)
  ✓ PASS: Rejects out-of-range longitude (< -180)
  ✓ PASS: Rejects malformed non-JSON coordinate string
  ✓ PASS: Reverse geocoding resolves human-readable address or clean coordinate fallback -> "Review Avenue, New York"
  ✓ PASS: Rejects empty string latitude/longitude values from multipart FormData

========================================
 TOTAL TESTS: 47 | PASSED: 47 | FAILED: 0
========================================
```

### 7.2 Backend Build Output (`npm run build`)
```
> backend@1.0.0 build
> tsc

Exit code: 0 (TypeScript compilation succeeded with 0 errors)
```

### 7.3 Frontend Build Output (`npm run build`)
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.4 building client environment for production...
transforming (2) src/main.tsx
transforming (2016) src/index.css
✓ 2017 modules transformed.
rendering chunks (1)...
computing gzip size...
dist/index.html                   0.49 kB │ gzip:   0.33 kB
dist/assets/index-BKVih_ti.css   42.38 kB │ gzip:  12.24 kB
dist/assets/index-CXjrLc_C.js   551.14 kB │ gzip: 167.89 kB
✓ built in 427ms

Exit code: 0 (Vite build succeeded with 0 errors)
```
