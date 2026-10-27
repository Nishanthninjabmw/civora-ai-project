# CIVORA Mobile — Civic Intelligence & Hazard Response

CIVORA Mobile is the production-quality Flutter mobile application converted from the CIVORA web application. It operates against the same Node.js/Express backend (`port 5001`) and MongoDB Atlas database, preserving the exact visual identity, business rules, role-based access control, severity prioritization engine, and repair audit proofs.

---

## Architecture Overview

```
mobile/
  ├── lib/
  │    ├── core/
  │    │    ├── constants/
  │    │    │    ├── app_colors.dart        # Near-black (#0F1115), charcoal (#1C1F26), and muted copper (#C58361)
  │    │    │    └── api_constants.dart     # Dynamic host resolution (10.0.2.2 for emulator, configurable IP for phone)
  │    │    ├── network/
  │    │    │    ├── api_client.dart        # Dio client with JWT interceptor, multipart upload boundary handling
  │    │    │    └── api_exceptions.dart    # Structured exception mapping (400, 401, 403, 404, 500, 503, network)
  │    │    ├── storage/
  │    │    │    └── secure_storage_service.dart # Secure JWT token persistence and session restoration
  │    │    ├── theme/
  │    │    │    └── app_theme.dart         # Material 3 theme with Google Fonts (Inter) and CIVORA design tokens
  │    │    └── utils/
  │    │         ├── severity_helper.dart   # Municipal risk bands: Critical (≥80), High (60-79), Medium (35-59), Low (<35)
  │    │         └── date_formatter.dart    # Localized date and time formatting
  │    ├── features/
  │    │    ├── auth/
  │    │    │    ├── models/user_model.dart # UserModel with UserRole enum ('Citizen', 'Admin', 'Crew')
  │    │    │    ├── providers/auth_provider.dart # Riverpod Notifier with authoritative role verification
  │    │    │    └── presentation/
  │    │    │         ├── portal_selection_screen.dart # 3-portal entry (Citizen, Admin, Crew) with demo credentials
  │    │    │         └── login_screen.dart # Login form with password toggle, demo autofill, and role mismatch rejection
  │    │    ├── citizen/
  │    │    │    └── presentation/
  │    │    │         ├── citizen_dashboard_screen.dart # "My Reports" feed, pull-to-refresh, status badges, summary counts
  │    │    │         └── report_hazard_screen.dart    # Camera/gallery, GPS / interactive map pin, multipart upload
  │    │    ├── admin/
  │    │    │    └── presentation/
  │    │    │         └── admin_dashboard_screen.dart # Live metrics, city hazard map, Priority Queue (severity-first), dispatch
  │    │    ├── crew/
  │    │    │    └── presentation/
  │    │    │         └── crew_dashboard_screen.dart # Active vs Completed jobs, "Start Work", mandatory proof upload
  │    │    └── reports/
  │    │         ├── models/hazard_report_model.dart # Comprehensive model with AI detections, coordinates, and resolution proof
  │    │         ├── providers/reports_provider.dart # Priority-First sorting (finalSeverityScore DESC, createdAt ASC), filters
  │    │         └── presentation/
  │    │              ├── report_details_screen.dart # Before/after evidence, AI inspection banner, map, audit trail
  │    │              └── widgets/
  │    │                   ├── status_badge.dart
  │    │                   ├── severity_badge.dart
  │    │                   ├── before_after_evidence.dart
  │    │                   ├── audit_trail_timeline.dart
  │    │                   └── ai_detection_overlay.dart
  │    ├── shared/widgets/
  │    │    ├── civora_app_bar.dart         # Shield logo, role badge, dynamic backend host switcher dialog, logout
  │    │    ├── safe_network_image.dart     # Cached network image with relative path resolution and graceful fallback
  │    │    └── error_state_widget.dart     # In-app error alerts with retry action
  │    └── main.dart                        # ProviderScope, AppTheme, and AuthGate role-segregated navigation
  └── test/
       ├── civora_unit_test.dart            # Automated unit tests for severity rules, models, and priority sorting
       └── widget_test.dart                 # Widget smoke test verifying CIVORA portal entry rendering
```

---

## Feature Parity & Conversion Matrix

| Feature | Web Application Implementation | Flutter Mobile Implementation | Parity Status |
| :--- | :--- | :--- | :--- |
| **Visual Identity** | Dark charcoal `#0F1115`, `#1C1F26`, muted copper `#C58361`, Inter font | `AppTheme.darkTheme`, `AppColors`, Google Fonts `interTextTheme` | **100% Exact** |
| **3-Portal Selection** | 3 selectable cards for Citizen, Admin, Crew with demo email badges | `PortalSelectionScreen` with card selection and demo autofill | **100% Exact** |
| **Role Verification** | Authoritative backend role verification; rejects portal mismatch | `AuthNotifier.login` validates `loggedInUser.role == selectedRole`; rejects mismatch with 1-click switch | **100% Exact** |
| **Token Storage** | `localStorage` JWT token storage | `SecureStorageService` using `FlutterSecureStorage` + `SharedPreferences` fallback | **100% Exact** |
| **Citizen Hazard Report** | Camera/file upload, GPS, interactive Leaflet map pin, multipart upload | `image_picker` camera/gallery, `geolocator` GPS, `flutter_map` OpenStreetMap pin placement | **100% Exact** |
| **Report Details Lookup** | Accepts MongoDB `_id` or custom `reportId`, resolves full details | `ReportDetailsScreen` queries `GET /api/reports/:id` with dual-ID resolution | **100% Exact** |
| **Before & After Evidence** | Side-by-side display of original citizen photo and crew repair photo | `BeforeAfterEvidence` widget preserving both photos without overwriting | **100% Exact** |
| **AI Inference & Rationale** | Displays detections or transparent category rule-based triage notice | `AiDetectionOverlay` with real confidence values or transparent fallback banner | **100% Exact** |
| **Admin Metrics** | Critical (≥80), Pending, Total, Resolved cards from `GET /api/reports/stats` | `_buildMetricsGrid` displaying live statistics cards | **100% Exact** |
| **Admin Priority Queue** | Sorted by `finalSeverityScore DESC, createdAt ASC` with filters & search | `filteredAndSortedReports` in `ReportsState` preserving strict severity-first ordering | **100% Exact** |
| **Admin City Map** | Interactive Leaflet map with colored score markers | `_buildGeospatialMap` with custom colored score circles on OpenStreetMap | **100% Exact** |
| **Admin Crew Dispatch** | Crew dropdown assignment calling `PUT /api/reports/:id/status` | Dropdown in `ReportDetailsScreen` with crew list populated from `GET /api/auth/crew` | **100% Exact** |
| **Crew Field Workspace** | Active work orders vs Completed repairs tabs | `CrewDashboardScreen` with TabController separating active vs resolved jobs | **100% Exact** |
| **Crew Status Transition** | One-tap "Start Work" button (`status: 'In Progress'`) | `startWorkOrder` in `reports_provider` with instant UI update | **100% Exact** |
| **Mandatory Repair Proof** | Requires after-repair photo AND notes before marking `Resolved` | Enforced client-side and backend-side; rejects resolution if proof is missing | **100% Exact** |
| **Audit Trail Timeline** | Chronological status history with timestamps and actor notes | `AuditTrailTimeline` widget displaying all status transitions | **100% Exact** |

---

## Configuration & Environment Setup

### 1. Backend Host Configuration
The Flutter app automatically selects the proper network address:
- **Android Emulator**: `http://10.0.2.2:5001/api` (Android maps `10.0.2.2` to the host computer's `localhost`).
- **iOS Simulator / macOS Desktop / Web**: `http://localhost:5001/api`.
- **Physical Android / iOS Device**: Tap the **Wi-Fi tethering icon** in the top AppBar to enter your computer's local Wi-Fi IP address (e.g., `http://192.168.1.100:5001/api`).

### 2. Device Permissions
The Android configuration in `mobile/android/app/src/main/AndroidManifest.xml` includes:
- `android.permission.INTERNET`
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`
- `android.permission.CAMERA`
- `android.permission.READ_EXTERNAL_STORAGE`
- `android.permission.READ_MEDIA_IMAGES`
- `android:usesCleartextTraffic="true"` (Allows local HTTP requests to development port `5001`)

---

## How to Run & Test the Application

### Prerequisites
1. Start the CIVORA Backend server on port `5001`:
   ```bash
   cd backend
   npm run dev
   ```
2. Confirm MongoDB Atlas connection is active.

### Running the Mobile App
From the `mobile/` directory:

1. **Get dependencies**:
   ```bash
   flutter pub get
   ```

2. **Run static code analysis**:
   ```bash
   flutter analyze
   ```
   *(Expected: `No issues found!`)*

3. **Run automated test suite**:
   ```bash
   flutter test
   ```
   *(Expected: All unit & widget tests pass)*

4. **Launch on an emulator or connected device**:
   ```bash
   # List available devices:
   flutter devices

   # Run on connected device or emulator:
   flutter run
   ```

### Building an Android APK
To build an Android debug APK:
```bash
flutter build apk --debug
```
To build a release APK:
```bash
flutter build apk --release
```
The output file will be generated at `mobile/build/app/outputs/flutter-apk/app-release.apk`.

---

## Demo Accounts

All demo accounts share the password `password123`:
- **Citizen Portal**: `citizen@civora.com`
- **Administrator Portal**: `admin@civora.com`
- **Repair Crew Portal**: `crew@civora.com`
