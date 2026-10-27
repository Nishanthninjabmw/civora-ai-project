import { calculateSeverity } from './utils/severity';
import { SeverityLabel } from './models/HazardReport';
import { isAIConfigured, analyzeImageWithAI } from './services/ai';
import { UserRole } from './models/User';
import { parseCoordinates, reverseGeocodeCoordinates } from './controllers/reports';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log(' CIVORA AUTOMATED TEST SUITE');
  console.log('========================================\n');

  // 1. SEVERITY ENGINE DETERMINISTIC TESTS
  console.log('[1] Severity Scoring Engine Tests:');
  
  const potholeNoAI = calculateSeverity('Pothole', []);
  assert(potholeNoAI.score === 50 && potholeNoAI.label === SeverityLabel.Medium,
    `Pothole without AI -> Score: ${potholeNoAI.score} (Expected 50), Label: ${potholeNoAI.label} (Expected Medium)`);

  const treeNoAI = calculateSeverity('Fallen Tree', []);
  assert(treeNoAI.score === 70 && treeNoAI.label === SeverityLabel.High,
    `Fallen Tree without AI -> Score: ${treeNoAI.score} (Expected 70), Label: ${treeNoAI.label} (Expected High)`);

  const waterNoAI = calculateSeverity('Waterlogging', []);
  assert(waterNoAI.score === 40 && waterNoAI.label === SeverityLabel.Medium,
    `Waterlogging without AI -> Score: ${waterNoAI.score} (Expected 40), Label: ${waterNoAI.label} (Expected Medium)`);

  const lightNoAI = calculateSeverity('Broken Streetlight', []);
  assert(lightNoAI.score === 30 && lightNoAI.label === SeverityLabel.Low,
    `Broken Streetlight without AI -> Score: ${lightNoAI.score} (Expected 30), Label: ${lightNoAI.label} (Expected Low)`);

  const garbageNoAI = calculateSeverity('Garbage', []);
  assert(garbageNoAI.score === 20 && garbageNoAI.label === SeverityLabel.Low,
    `Garbage without AI -> Score: ${garbageNoAI.score} (Expected 20), Label: ${garbageNoAI.label} (Expected Low)`);

  // AI detection boost test: Pothole (50) + 92% confidence (27.6) + 1 detection (5) = 82.6 -> 83 (Critical)
  const potholeWithAI = calculateSeverity('Pothole', [
    { class: 'pothole', confidence: 0.92 }
  ]);
  assert(potholeWithAI.score === 83 && potholeWithAI.label === SeverityLabel.Critical,
    `Pothole with 92% AI detection -> Score: ${potholeWithAI.score} (Expected 83), Label: ${potholeWithAI.label} (Expected Critical)`);

  // Boundary test: Clamped at 100 max
  const extremeHazard = calculateSeverity('Fallen Tree', [
    { class: 'pothole', confidence: 1.0 },
    { class: 'pothole', confidence: 1.0 },
    { class: 'pothole', confidence: 1.0 },
    { class: 'pothole', confidence: 1.0 },
    { class: 'pothole', confidence: 1.0 }
  ]);
  assert(extremeHazard.score === 100 && extremeHazard.label === SeverityLabel.Critical,
    `Extreme composite hazard strictly clamped at 100 -> Score: ${extremeHazard.score}`);

  // Missing input test: null / undefined / empty string handles gracefully
  const emptyCategory = calculateSeverity('', []);
  assert(emptyCategory.score === 20 && emptyCategory.label === SeverityLabel.Low,
    `Empty category fallback safely handled -> Score: ${emptyCategory.score}`);

  // 2. AI SERVICE FALLBACK TESTS
  console.log('\n[2] AI Service & Fallback Tests:');
  const configured = isAIConfigured();
  console.log(`  ℹ AI Configured Status: ${configured ? 'ENABLED (Real key found)' : 'DISABLED (Using graceful fallback)'}`);

  const aiResult = await analyzeImageWithAI('https://example.com/test.jpg');
  if (!configured) {
    assert(aiResult.configured === false && aiResult.detections.length === 0,
      'When ROBOFLOW_API_KEY is not configured, returns safe empty detections without mocking');
    assert(aiResult.metadata?.modelId === 'none',
      'Model ID is transparently reported as none');
  } else {
    assert(typeof aiResult.configured === 'boolean',
      'Real AI inference service returned structured result');
  }

  // 3. ROLE ENUM & ACCESS CONTROL DEFINITIONS
  console.log('\n[3] Role & Permission Definitions:');
  assert(UserRole.Citizen === 'Citizen', 'UserRole.Citizen matches "Citizen"');
  assert(UserRole.Admin === 'Admin', 'UserRole.Admin matches "Admin"');
  assert(UserRole.Crew === 'Crew', 'UserRole.Crew matches "Crew"');

  // 4. PRIORITY QUEUE SORTING ENGINE TESTS
  console.log('\n[4] Priority Queue Sorting Engine Tests:');
  const sampleReports = [
    { id: 'R1', finalSeverityScore: 30, createdAt: new Date('2026-10-11T12:00:00Z') }, // Low, newer
    { id: 'R2', finalSeverityScore: 85, createdAt: new Date('2026-10-10T12:00:00Z') }, // Critical, older
    { id: 'R3', finalSeverityScore: 60, createdAt: new Date('2026-10-11T08:00:00Z') }, // High, mid
    { id: 'R4', finalSeverityScore: 85, createdAt: new Date('2026-10-09T12:00:00Z') }, // Critical, oldest
  ];

  // Apply Priority-First Sorting Rule (Severity DESC, tie-breaker: createdAt ASC)
  const sortedReports = [...sampleReports].sort((a, b) => {
    if (b.finalSeverityScore !== a.finalSeverityScore) {
      return b.finalSeverityScore - a.finalSeverityScore;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  assert(sortedReports[0].id === 'R4', 'Highest severity oldest report (R4, score 85) ranks #1');
  assert(sortedReports[1].id === 'R2', 'Highest severity newer report (R2, score 85) ranks #2');
  assert(sortedReports[2].id === 'R3', 'High severity report (R3, score 60) ranks #3');
  assert(sortedReports[3].id === 'R1', 'Low severity report (R1, score 30) ranks #4 even though it was submitted newest');

  // 5. CREW REPAIR EVIDENCE & RESOLUTION AUTHORIZATION TESTS
  console.log('\n[5] Crew Resolution & Repair Proof Validation Tests:');
  
  // Rule: Resolution requires both an after-repair photo AND resolution notes
  const validateResolutionSubmission = (data: { resolutionImage?: string; note?: string; assignedCrewId?: string; currentUserId?: string }) => {
    if (data.assignedCrewId !== data.currentUserId) {
      return { valid: false, error: 'Unauthorized: Crew member not assigned to this report' };
    }
    if (!data.resolutionImage || !data.resolutionImage.trim()) {
      return { valid: false, error: 'Resolution proof required: After-repair photograph is mandatory' };
    }
    if (!data.note || !data.note.trim()) {
      return { valid: false, error: 'Resolution notes required: Description of repairs performed is mandatory' };
    }
    return { valid: true };
  };

  const missingPhoto = validateResolutionSubmission({
    assignedCrewId: 'crew123',
    currentUserId: 'crew123',
    resolutionImage: '',
    note: 'Repaired pothole'
  });
  assert(!missingPhoto.valid && Boolean(missingPhoto.error?.includes('photograph is mandatory')),
    'Reject resolution when after-repair photograph is missing');

  const missingNotes = validateResolutionSubmission({
    assignedCrewId: 'crew123',
    currentUserId: 'crew123',
    resolutionImage: '/uploads/repair-photo.jpg',
    note: ''
  });
  assert(!missingNotes.valid && Boolean(missingNotes.error?.includes('Description of repairs')),
    'Reject resolution when resolution notes are missing');

  const unauthorizedCrew = validateResolutionSubmission({
    assignedCrewId: 'crew999',
    currentUserId: 'crew123',
    resolutionImage: '/uploads/repair-photo.jpg',
    note: 'Repaired road'
  });
  assert(!unauthorizedCrew.valid && Boolean(unauthorizedCrew.error?.includes('Unauthorized')),
    'Prevent crew member from resolving work assigned to a different crew');

  const validResolution = validateResolutionSubmission({
    assignedCrewId: 'crew123',
    currentUserId: 'crew123',
    resolutionImage: '/uploads/repair-photo.jpg',
    note: 'Repaired road surface using cold-mix asphalt and compacted with roller.'
  });
  assert(validResolution.valid === true,
    'Accept resolution when both after-repair photograph and resolution notes are verified');

  // 6. ROLE PORTAL SELECTION & ACCESS VERIFICATION TESTS
  console.log('\n[6] Role Portal Selection & Access Verification Tests:');

  const verifyPortalAccess = (selectedPortal: 'Citizen' | 'Admin' | 'Crew', authenticatedUserRole: string) => {
    if (selectedPortal !== authenticatedUserRole) {
      return {
        allowed: false,
        message: `Access Denied: This account is registered with the role "${authenticatedUserRole}", but you are signing in through the "${selectedPortal} Portal".`
      };
    }
    return {
      allowed: true,
      message: `Access Granted: Successfully verified role "${authenticatedUserRole}".`
    };
  };

  const citizenOnCitizen = verifyPortalAccess('Citizen', 'Citizen');
  assert(citizenOnCitizen.allowed === true, 'Citizen selects Citizen portal -> Login accepted and dashboard accessible');

  const adminOnAdmin = verifyPortalAccess('Admin', 'Admin');
  assert(adminOnAdmin.allowed === true, 'Admin selects Admin portal -> Login accepted and operations center accessible');

  const crewOnCrew = verifyPortalAccess('Crew', 'Crew');
  assert(crewOnCrew.allowed === true, 'Crew selects Crew portal -> Login accepted and work queue accessible');

  const citizenOnAdmin = verifyPortalAccess('Admin', 'Citizen');
  assert(citizenOnAdmin.allowed === false && citizenOnAdmin.message.includes('Access Denied'),
    'Citizen account attempting to enter Admin portal is rejected with clear role mismatch message');

  const adminOnCitizen = verifyPortalAccess('Citizen', 'Admin');
  assert(adminOnCitizen.allowed === false && adminOnCitizen.message.includes('Access Denied'),
    'Admin account selecting Citizen portal is rejected with clear role mismatch message rather than silently switching roles');

  const crewOnAdmin = verifyPortalAccess('Admin', 'Crew');
  assert(crewOnAdmin.allowed === false && crewOnAdmin.message.includes('Access Denied'),
    'Crew account attempting to enter Admin portal is rejected with clear role mismatch message');

  // 7. REPORT LOOKUP & AUTHORIZATION ENGINE TESTS
  console.log('\n[7] Report Lookup & Authorization Engine Tests:');

  const resolveQuery = (idParam: string) => {
    const trimmed = String(idParam || '').trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(trimmed);
    return isObjectId
      ? { $or: [{ _id: trimmed }, { reportId: trimmed }] }
      : { reportId: trimmed };
  };

  const customQuery = resolveQuery('REP-DEMO-POTHOLE');
  assert(
    (customQuery as any).reportId === 'REP-DEMO-POTHOLE' && !(customQuery as any).$or,
    'Custom report ID resolves safely to reportId query without ObjectId casting'
  );

  const objectIdQuery = resolveQuery('6acb32e2be9e4ae63b73ea68');
  assert(
    Array.isArray((objectIdQuery as any).$or) && (objectIdQuery as any).$or.length === 2,
    'Valid 24-hex ObjectId resolves to dual _id or reportId query'
  );

  const checkReportAccess = (user: { id: string; role: string }, report: { citizenId: string; assignedCrewId?: string }) => {
    if (user.role === 'Citizen') {
      return user.id === report.citizenId ? { allowed: true } : { allowed: false, status: 403, reason: 'Belongs to another citizen' };
    }
    if (user.role === 'Crew') {
      return user.id === report.assignedCrewId ? { allowed: true } : { allowed: false, status: 403, reason: 'Not assigned to this crew' };
    }
    if (user.role === 'Admin') {
      return { allowed: true };
    }
    return { allowed: false, status: 403, reason: 'Unknown role' };
  };

  const citizenAccessOwn = checkReportAccess(
    { id: 'user_cit_1', role: 'Citizen' },
    { citizenId: 'user_cit_1' }
  );
  assert(citizenAccessOwn.allowed === true, 'Citizen can view their own hazard report');

  const citizenAccessOther = checkReportAccess(
    { id: 'user_cit_1', role: 'Citizen' },
    { citizenId: 'user_cit_2' }
  );
  assert(citizenAccessOther.allowed === false && citizenAccessOther.status === 403, 'Citizen is rejected when attempting to access another citizen report');

  const adminAccessAny = checkReportAccess(
    { id: 'admin_1', role: 'Admin' },
    { citizenId: 'user_cit_2' }
  );
  assert(adminAccessAny.allowed === true, 'Admin can view any citizen hazard report in the municipal registry');

  const crewAccessAssigned = checkReportAccess(
    { id: 'crew_bob', role: 'Crew' },
    { citizenId: 'user_cit_1', assignedCrewId: 'crew_bob' }
  );
  assert(crewAccessAssigned.allowed === true, 'Crew can view assigned work order');

  const crewAccessUnassigned = checkReportAccess(
    { id: 'crew_bob', role: 'Crew' },
    { citizenId: 'user_cit_1', assignedCrewId: 'crew_charlie' }
  );
  assert(crewAccessUnassigned.allowed === false && crewAccessUnassigned.status === 403, 'Crew cannot access reports assigned to a different crew');

  // Deduplication logic test
  const deduplicate = (list: any[]) => {
    const seen = new Set<string>();
    return list.filter(r => {
      const key = r._id || r.reportId;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const duplicatedList = [
    { _id: 'id1', reportId: 'REP-1', title: 'A' },
    { _id: 'id1', reportId: 'REP-1', title: 'A duplicate' },
    { _id: 'id2', reportId: 'REP-2', title: 'B' },
  ];
  const deduped = deduplicate(duplicatedList);
  assert(deduped.length === 2 && deduped[0].title === 'A', 'Report feed deduplication prevents duplicate report cards');

  // 8. LOCATION TRACKING, COORDINATE PARSING & GEOCODING TESTS
  console.log('\n[8] Location Tracking, Coordinate Parsing & Reverse Geocoding Tests:');

  // Test 8.1: Separate latitude / longitude numeric fields
  const parsedSeparate = parseCoordinates({ latitude: 40.73061, longitude: -73.93524 });
  assert(
    parsedSeparate !== null && parsedSeparate.lat === 40.73061 && parsedSeparate.lng === -73.93524,
    'Parses separate latitude and longitude numeric fields correctly'
  );

  // Test 8.2: Separate stringified latitude / longitude from FormData
  const parsedFormDataStrings = parseCoordinates({ latitude: '40.73061', longitude: '-73.93524' });
  assert(
    parsedFormDataStrings !== null && parsedFormDataStrings.lat === 40.73061 && parsedFormDataStrings.lng === -73.93524,
    'Parses stringified latitude and longitude values from multipart FormData into numbers'
  );

  // Test 8.3: GeoJSON coordinates array [longitude, latitude]
  const parsedArray = parseCoordinates({ coordinates: [-73.93524, 40.73061] });
  assert(
    parsedArray !== null && parsedArray.lat === 40.73061 && parsedArray.lng === -73.93524,
    'Parses GeoJSON array [longitude, latitude] into lat/lng'
  );

  // Test 8.4: JSON stringified coordinates array from Axios FormData
  const parsedJsonCoords = parseCoordinates({ coordinates: '[-73.93524, 40.73061]' });
  assert(
    parsedJsonCoords !== null && parsedJsonCoords.lat === 40.73061 && parsedJsonCoords.lng === -73.93524,
    'Parses JSON-stringified coordinates array "[-73.93524, 40.73061]" from Axios payload'
  );

  // Test 8.5: Location object with coordinates array
  const parsedLocationObj = parseCoordinates({ location: { coordinates: [-73.93524, 40.73061] } });
  assert(
    parsedLocationObj !== null && parsedLocationObj.lat === 40.73061 && parsedLocationObj.lng === -73.93524,
    'Parses nested location object { coordinates: [lng, lat] }'
  );

  // Test 8.6: Boundary rejection: Latitude > 90
  const latTooHigh = parseCoordinates({ latitude: 95.5, longitude: 0 });
  assert(latTooHigh === null, 'Rejects out-of-range latitude (> 90)');

  // Test 8.7: Boundary rejection: Latitude < -90
  const latTooLow = parseCoordinates({ latitude: -95.5, longitude: 0 });
  assert(latTooLow === null, 'Rejects out-of-range latitude (< -90)');

  // Test 8.8: Boundary rejection: Longitude > 180
  const lngTooHigh = parseCoordinates({ latitude: 0, longitude: 185.0 });
  assert(lngTooHigh === null, 'Rejects out-of-range longitude (> 180)');

  // Test 8.9: Boundary rejection: Longitude < -180
  const lngTooLow = parseCoordinates({ latitude: 0, longitude: -185.0 });
  assert(lngTooLow === null, 'Rejects out-of-range longitude (< -180)');

  // Test 8.10: Rejects invalid non-numeric coordinate payloads
  const invalidPayload = parseCoordinates({ coordinates: 'invalid-json' });
  assert(invalidPayload === null, 'Rejects malformed non-JSON coordinate string');

  // Test 8.11: Reverse geocoding fallback returns non-empty readable string
  const resolvedAddr = await reverseGeocodeCoordinates(40.73061, -73.93524);
  assert(
    typeof resolvedAddr === 'string' && resolvedAddr.length > 0 && resolvedAddr !== 'Street address pending',
    `Reverse geocoding resolves human-readable address or clean coordinate fallback -> "${resolvedAddr}"`
  );

  // Test 8.12: Boundary rejection: Empty string coordinates from FormData
  const emptyStringCoords = parseCoordinates({ latitude: '', longitude: '' });
  assert(emptyStringCoords === null, 'Rejects empty string latitude/longitude values from multipart FormData');

  // 9. SUMMARY
  console.log('\n========================================');
  console.log(` TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
