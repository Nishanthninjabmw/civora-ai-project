# CIVORA — Mentor Demo Script & Presentation Guide
**College Model Exam Submission**

---

## 1. Project Overview & Elevator Pitch
> *"CIVORA is a full-stack Civic Intelligence & Hazard Response platform designed to bridge the gap between citizens reporting public road infrastructure hazards (potholes, waterlogging, fallen trees, broken streetlights) and municipal response teams. It features deterministic municipal severity prioritization, GPS & interactive map geolocation, dual-mode image storage, and role-based workflows for Citizens, Administrators, and Field Crews."*

---

## 2. Architecture Quick Summary
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Leaflet maps, Lucide icons, Dark Charcoal & Muted Copper aesthetic. Running at `http://localhost:5173`.
- **Backend**: Node.js, Express, TypeScript, JWT auth, Multer dual-mode upload (local disk / Cloudinary), Roboflow inference service. Running on port `5001`.
- **Database**: MongoDB Atlas with Mongoose schema validation.
- **Port Note**: Backend runs on `5001` (avoiding macOS AirPlay Receiver port 5000 collision) and is routed seamlessly via Vite proxy `/api` -> `http://localhost:5001`.

---

## 3. Demo Credentials
| Role | Email | Password | Primary Workflow |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civora.com` | `password123` | Submit hazard reports, upload photos, pin location, view history |
| **Admin** | `admin@civora.com` | `password123` | City overview dashboard, live map, review reports, assign crew |
| **Crew** | `crew@civora.com` | `password123` | View assigned work orders, update repair status, resolve issues |

---

## 4. Live Demonstration Walkthrough (5-Minute Script)

### Step 1: System Health & Starting the Platform
```bash
# Verify both frontend & backend are running:
npm start

# In a separate terminal, run unit & deterministic tests to show the mentor:
npm test
```
*Show mentor: 27/27 automated tests pass (deterministic severity engine, boundary tests, AI graceful fallback, priority queue sorting, repair evidence validation, and role portal verification).*

---

### Step 2: Role Selection Portal & Role Security Demonstration
1. Open browser at `http://localhost:5173`.
2. Click **"Sign In"** -> Observe the 3-portal role selection interface:
   - **Citizen Portal** (Public Reporting)
   - **Administrator Portal** (Municipal Operations)
   - **Repair Crew Portal** (Field Maintenance)
3. **Demonstrate Role Security & Verification to Mentor**:
   - Click the **Administrator Portal** card.
   - Enter `citizen@civora.com` / `password123` (or click "Switch Portal" / back).
   - Click "Authenticate into Administrator Portal".
   - Notice the system immediately displays a clear role mismatch message:
     *"Access Denied: This account is registered with the role 'Citizen', but you are signing in through the 'Administrator Portal'."*
   - Explain to the mentor: *"The portal selection is purely UI routing; backend-verified credentials strictly prevent cross-role unauthorized access."*
4. Click **"Switch Portal"** (or click the 1-click switch button) -> Select **Citizen Portal**.
5. Click **"Auto-Fill"** (`citizen@civora.com` / `password123`) and click **Sign In**.
6. Land on Citizen Dashboard (`/dashboard`).
7. Navigate to **"Report Hazard"** (`/report-hazard`).
8. **Photo Upload**: Select or drag a photo (Pothole / Road hazard). The image preview renders immediately.
9. **Geolocation**:
   - Click **"Use My GPS"**. If permitted, coordinates auto-populate and the map dynamically re-centers.
   - Alternatively, demonstrate the **Interactive Map Selector**: click anywhere on the city map to drop a pin.
10. **Hazard Details**:
   - Select Category: `Pothole / Road Damage`.
   - Description: *"Severe asphalt depression causing two-wheeler skids near intersection."*
11. Click **"Submit Report"**.
12. The report is saved to MongoDB Atlas, and a tracking ID (e.g. `REP-DEMO-...` or UUID) is generated.
13. Observe the calculated municipal priority score (e.g. `50 - Medium`).

---

### Step 3: Admin Workflow (Triage & Assignment)
1. Click **Log Out** (top right) and sign in as `admin@civora.com` / `password123`.
2. Land on `/dashboard` (Admin view):
   - **Metrics Overview**: Real-time counts of Total Reports, Critical Hazards, Pending, and Resolved.
   - **City Hazard Map**: Interactive Leaflet map displaying pins colored by severity level across the city.
   - **Search & Filters**: Search by keyword or filter by severity/status.
3. Locate the citizen's newly submitted report in the table and click **"View Details"**.
4. Show the **Report Details Page**:
   - Uploaded hazard photo rendered cleanly.
   - Severity Score Breakdown: explains municipal risk factors (Base category score + AI multiplier).
   - AI Detection Notice: honestly displays "AI detection is not configured" when using default keys, preserving municipal integrity.
5. **Assign Crew**:
   - In the **"Assign Crew Member"** dropdown, select `Crew Bob (crew@civora.com)`.
   - Change Status to `In Progress`.
   - Click **"Update Status & Assignment"**.
6. Show immediate confirmation and audit status transition to `In Progress`.

---

### Step 4: Field Crew Workflow (Resolution & Repair Photograph Evidence)
1. In Window B (or separate browser window/session), sign in as `crew@civora.com` / `password123`.
2. Land on `/dashboard` (Crew view):
   - Notice the assigned report under **Active Work Orders**.
   - Click **"Upload Proof & Resolve"**.
3. Demonstrate Authorization & Evidence Enforcement:
   - Crew members cannot resolve jobs without completion evidence.
   - Select Status: **"Resolved (Requires Proof)"**.
   - Upload an **After-Repair Photograph** showing the completed repair work.
   - Enter Resolution Notes: *"Cold-mix asphalt patching completed and surface compacted with roller."*
4. Click **"Upload Proof & Mark Resolved"**.
5. The backend validates the image, saves it to `resolutionImageUrl`, and records the audit timestamp.
6. The page immediately updates to display the **Verified Repair Completion Evidence** section with the **Before: Citizen Hazard** and **After: Field Crew Repair** photographs side-by-side!

---

### Step 5: Verification in Citizen & Admin Views
1. Switch back to Window A (Citizen session) or view the Admin dashboard:
2. The report status now reflects **Resolved**.
3. Inspecting the report displays the Before/After repair evidence, crew resolution notes, and the full audit trail.

---

## 5. Frequently Asked Mentor Questions & Answers

**Q: How does the AI severity scoring work?**
> *Answer*: "CIVORA uses a hybrid scoring engine. It deterministically scores base categories based on municipal road danger (Fallen Tree: 70, Pothole: 50, Waterlogging: 40, Streetlight: 30, Garbage: 20). When a trained Roboflow vision model is configured with an active API key, it computes an AI confidence multiplier (up to 30 points) and multi-detection density factor (up to 20 points), strictly clamped to a 0–100 scale. If the external AI service is unconfigured or unavailable, it transparently falls back to deterministic municipal rules without fabricating predictions."

**Q: What happens if browser GPS is denied?**
> *Answer*: "Rather than failing or fabricating fake GPS coordinates, CIVORA provides an interactive Leaflet map pin-selector. The user can click directly on their location on the map, which derives exact coordinates with full user awareness."

**Q: Where are uploaded images stored?**
> *Answer*: "CIVORA features dual-mode image storage. If Cloudinary credentials are provided, images stream to Cloudinary CDN. If not configured, it automatically falls back to secure local disk storage in `backend/uploads/` served via authenticated backend endpoints."

**Q: How is role-based access control (RBAC) enforced?**
> *Answer*: "JWT tokens contain the authenticated user's ID and role (`Citizen`, `Admin`, `Crew`). The backend validates incoming tokens with `authMiddleware`. Specific endpoints use `adminCheck` (e.g. fetching crew lists, assigning work orders) and ownership checks (crew can only update tasks explicitly assigned to them)."
