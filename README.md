# CIVORA - Civic Intelligence & Hazard Response

## Overview
Civic Hazard Reporter & AI Severity Assessor platform.
Allows citizens to report public infrastructure hazards (like potholes), which are evaluated by AI to recommend a severity score, enabling municipal authorities to track, prioritize, and assign repair crews.

## Tech Stack
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Leaflet, Recharts, Lucide Icons
- Backend: Node.js, Express, TypeScript, MongoDB Atlas, JWT Auth
- AI Integration: Roboflow API (e.g. road-damage model)
- Image Storage: Cloudinary

## Setup Instructions

### 1. Backend Configuration
Create a `.env` file in the `backend/` directory (an `.env.example` is provided):
```
PORT=5001
MONGODB_URI=mongodb+srv://<your_username>:<your_password>@cluster.mongodb.net/civora?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key
ROBOFLOW_API_KEY=your_roboflow_key
ROBOFLOW_MODEL_ENDPOINT=road-damage-nqw00/1
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Frontend Configuration
Create a `.env` file in the `frontend/` directory (an `.env.example` is provided):
```
VITE_API_URL=http://localhost:5001/api
```

### 3. Installation
From the root directory of the project, run:
```bash
npm run install:all
```

### 4. Database Seeding (Demo Data)
```bash
cd backend
npm run seed
```
This generates the demo accounts and 2 mock reports for demonstration.

### 5. Running the Application
From the root directory, run:
```bash
npm start
```
This will start both the Express backend and the Vite frontend concurrently.

## Demo Accounts (Password: `password123`)
- Citizen: `citizen@civora.com` (Citizen Portal)
- Admin: `admin@civora.com` (Administrator Portal)
- Crew: `crew@civora.com` (Repair Crew Portal)

## Role-Selection Portals & Session Isolation
The `/login` page offers three selectable entry portals:
1. **Citizen Portal** (`citizen@civora.com`)
2. **Administrator Portal** (`admin@civora.com`)
3. **Repair Crew Portal** (`crew@civora.com`)

> **Important Note on Multi-Role Demonstrations:**  
> Standard browser tabs in the same window share `localStorage`. Selecting a portal does not grant authority by itself; roles are strictly verified on the backend. To demonstrate multiple roles simultaneously (e.g., Citizen creating a hazard while Administrator triages and assigns in real time):
> - Open **Window A** (Standard Chrome window) for the Citizen session.
> - Open **Window B** (Incognito window or a separate Chrome profile) for the Administrator or Crew session.
> Both windows connect to the same local application (`http://localhost:5173`) and live MongoDB database.

## Automated Testing
Run the 27-point test suite:
```bash
npm test
```

## Limitations
- AI Detections depend on a configured Roboflow API Key. Without a key, the app functions normally with transparent municipal category rules.
- Real GPS accuracy varies based on browser permissions and device capability. Interactive map click-to-pin is available as a manual alternative.
