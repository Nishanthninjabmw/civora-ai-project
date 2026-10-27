# CIVORA — Local Wi-Fi Mobile Browser Demonstration Guide

This guide describes how to run and demonstrate the complete **CIVORA** civic hazard platform on a mobile browser (**Safari on iPhone** or **Chrome on Android**) while the application runs on your Mac.

---

## 1. Quick Start: Exact Mac Startup Command

Run this command from the root project folder:

```bash
cd "/Users/jeyakumar/CIVORA AI MINI PROJECT"
npm start
```

This starts both services concurrently:
- **Express Backend**: Listening on port `5001` (all interfaces `0.0.0.0`)
- **Vite Frontend**: Listening on port `5173` bound to `0.0.0.0` with proxy to `http://localhost:5001`

---

## 2. Find Your Mac's Local IP Address

In Terminal on your Mac, run:

```bash
ipconfig getifaddr en0
```

*(If using an external adapter or non-standard interface, run `ifconfig | grep "inet " | grep -v 127.0.0.1`)*

**Example output:**
```
172.20.10.3
```

Alternatively, open **System Settings > Wi-Fi > Details...** to view your IP address.

---

## 3. Open on Your Mobile Phone (iPhone or Android)

Ensure your phone is connected to the **same Wi-Fi network** or **Personal Hotspot** as your Mac.

Open **Safari** (iOS) or **Chrome** (Android) and navigate to:

```
http://<YOUR_MAC_IP>:5173
```

*(For example: `http://172.20.10.3:5173`)*

---

## 4. Mobile Demonstration Walkthrough

### Step A: Portal Selection & Authentication
1. On the mobile phone, open `http://<YOUR_MAC_IP>:5173/login`.
2. Tap any of the three role cards:
   - **Citizen Portal**: `citizen@civora.com`
   - **Administrator Portal**: `admin@civora.com`
   - **Repair Crew Portal**: `crew@civora.com`
3. Tap **Auto-Fill** to populate the demo credentials (`password123`).
4. Tap **Authenticate** to enter the respective dashboard.

### Step B: Mobile Citizen Hazard Reporting
1. Sign in as Citizen and tap **Report Hazard**.
2. Tap the photo upload area:
   - **iPhone (Safari)**: Choose **Take Photo** (camera) or **Photo Library**.
   - **Android (Chrome)**: Choose **Camera** or **Files**.
3. Tap **Use My GPS** to automatically pin device location via the browser Geolocation API, or tap anywhere on the interactive Leaflet map.
4. Select category (e.g. *Pothole*, *Fallen Tree*, *Waterlogging*) and enter a description.
5. Tap **Submit Hazard Report**.

### Step C: Administrator Triage on Phone
1. Switch to Administrator (`admin@civora.com`).
2. Review the **Priority Queue** table (supports horizontal swipe for complete audit details).
3. Tap **Review** on any report to open its details page, verify priority score, and assign maintenance personnel.

### Step D: Repair Crew Field Resolution
1. Switch to Repair Crew (`crew@civora.com`).
2. Tap the assigned work order.
3. Tap **Start Repair** (`In Progress`).
4. Once completed, select **Resolved**, upload an **After-Repair Photograph**, enter work notes, and tap **Save Updates**.
5. The report details page now displays the verified **Before & After Repair Evidence**.

---

## 5. Technical Architecture for Mobile Demo

- **Vite Proxy (`vite.config.ts`)**:
  - Bound to `0.0.0.0:5173`.
  - Proxies `/api` -> `http://localhost:5001`.
  - Proxies `/uploads` -> `http://localhost:5001`.
- **Frontend Axios Client (`frontend/src/api/axios.ts`)**:
  - Configured with `baseURL: '/api'` (relative path).
  - Phone browser sends API calls to `http://<MAC_IP>:5173/api/...`, which Vite forwards to backend port `5001`. Requests never target the phone's internal localhost.
- **Image URL Normalizer (`SafeImage.tsx`)**:
  - Automatically cleans any hardcoded localhost backend prefixes to `/uploads/...`, ensuring citizen and repair proof images load seamlessly on external devices.
- **Backend CORS & Binding (`backend/src/index.ts`)**:
  - Node.js Express server listens on port `5001` across all interfaces (`0.0.0.0`).
  - CORS enabled for cross-origin requests.

---

## 6. Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Phone says "Server Not Responding" or "Site can't be reached"** | Devices are not on the same local network, or AP Client Isolation is active on public Wi-Fi. | 1. Ensure phone Wi-Fi is connected to the same network as the Mac.<br>2. If on college/hotel Wi-Fi with client isolation, turn on Mac's Personal Hotspot or phone's Hotspot and connect both devices.<br>3. Verify Mac firewall: System Settings > Network > Firewall (ensure Node is permitted). |
| **Login button says "Unable to reach CIVORA server"** | Backend on port 5001 is not running. | Verify `npm start` is active on your Mac and check backend terminal output for `Server running on port 5001`. |
| **Health Check verification from Phone** | Verify connectivity from phone. | In phone browser, visit: `http://<YOUR_MAC_IP>:5173/api/health`. Should return `{"status":"CIVORA API is running","port":"5001"}`. |
| **Role session conflict when demonstrating multiple roles** | `localStorage` retains the current user. | Open an **Incognito / Private Browsing tab** on your phone to demonstrate Citizen, Admin, and Crew simultaneously. |
| **GPS button gives "permission denied"** | Browser location permission blocked. | Allow location access when prompted by Safari/Chrome, or click directly on the interactive map to place the hazard pin manually. |
