import { Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import { HazardReport, ReportStatus, SeverityLabel } from '../models/HazardReport';
import { analyzeImageWithAI } from '../services/ai';
import { calculateSeverity } from '../utils/severity';
import { isUsingCloudinary } from '../services/upload';
import { v4 as uuidv4 } from 'uuid';
import { demoStore } from '../services/demoStore';

/**
 * Reverse geocodes [latitude, longitude] using OpenStreetMap Nominatim.
 * Falls back cleanly to formatted coordinates if service is unreachable or times out.
 */
export const reverseGeocodeCoordinates = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat,
        lon: lng,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'CIVORA-Hazard-Platform/1.0 (civora-platform-report)'
      },
      timeout: 3000
    });

    if (response.data) {
      const addr = response.data.address;
      if (addr) {
        const road = addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb || '';
        const city = addr.city || addr.town || addr.village || addr.city_district || addr.county || '';
        if (road && city) {
          return `${road}, ${city}`;
        }
      }
      if (response.data.display_name) {
        const parts = response.data.display_name.split(',').map((p: string) => p.trim());
        return parts.slice(0, 3).join(', ');
      }
    }
  } catch (err: any) {
    // Network, timeout, or rate-limit: fallback cleanly to coordinate representation
  }
  return `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

export const parseCoordinates = (body: any): { lat: number; lng: number } | null => {
  if (!body || typeof body !== 'object') return null;

  const toValidNumber = (val: any): number | undefined => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'string' && val.trim() === '') return undefined;
    const num = Number(val);
    return !isNaN(num) && isFinite(num) ? num : undefined;
  };

  let lat: number | undefined;
  let lng: number | undefined;

  // 1. Check separate latitude / longitude fields
  if (body.latitude !== undefined && body.longitude !== undefined) {
    lat = toValidNumber(body.latitude);
    lng = toValidNumber(body.longitude);
  } else if (body.lat !== undefined && body.lng !== undefined) {
    lat = toValidNumber(body.lat);
    lng = toValidNumber(body.lng);
  }

  // 2. Check coordinates field (GeoJSON convention: [longitude, latitude])
  if ((lat === undefined || lng === undefined) && body.coordinates !== undefined) {
    try {
      const raw = typeof body.coordinates === 'string'
        ? JSON.parse(body.coordinates)
        : body.coordinates;
      if (Array.isArray(raw) && raw.length === 2) {
        lng = toValidNumber(raw[0]);
        lat = toValidNumber(raw[1]);
      }
    } catch {
      // JSON parse error
    }
  }

  // 3. Check location field
  if ((lat === undefined || lng === undefined) && body.location !== undefined) {
    try {
      const rawLoc = typeof body.location === 'string'
        ? JSON.parse(body.location)
        : body.location;
      if (rawLoc?.coordinates && Array.isArray(rawLoc.coordinates) && rawLoc.coordinates.length === 2) {
        lng = toValidNumber(rawLoc.coordinates[0]);
        lat = toValidNumber(rawLoc.coordinates[1]);
      } else if (rawLoc?.latitude !== undefined && rawLoc?.longitude !== undefined) {
        lat = toValidNumber(rawLoc.latitude);
        lng = toValidNumber(rawLoc.longitude);
      } else if (rawLoc?.lat !== undefined && rawLoc?.lng !== undefined) {
        lat = toValidNumber(rawLoc.lat);
        lng = toValidNumber(rawLoc.lng);
      }
    } catch {
      // JSON parse error
    }
  }

  if (
    lat === undefined ||
    lng === undefined ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
};

export const createReport = async (req: Request, res: Response) => {
  try {
    const { hazardCategory, description, address, accuracy } = req.body;
    
    // Resolve image URL based on storage provider
    let imageUrl: string | undefined;
    if (req.file) {
      if (isUsingCloudinary) {
        imageUrl = req.file.path;
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
      }
    } else if (req.body.imageUrl && typeof req.body.imageUrl === 'string') {
      imageUrl = req.body.imageUrl.trim();
    }

    if (!imageUrl) {
      return res.status(400).json({ message: 'Hazard image is required. Please upload a photo.' });
    }

    if (!hazardCategory || typeof hazardCategory !== 'string' || !hazardCategory.trim()) {
      return res.status(400).json({ message: 'Hazard category is required.' });
    }

    // Safely parse and validate coordinates from any incoming format
    const parsedCoords = parseCoordinates(req.body);
    if (!parsedCoords) {
      return res.status(400).json({
        message: 'Valid GPS coordinates are required (latitude between -90 and 90, longitude between -180 and 180).'
      });
    }

    // GeoJSON [longitude, latitude]
    const coords: [number, number] = [parsedCoords.lng, parsedCoords.lat];

    // Reverse geocode street address if not manually entered or pending
    let resolvedAddress = address ? String(address).trim() : '';
    if (!resolvedAddress || resolvedAddress.toLowerCase() === 'street address pending') {
      resolvedAddress = await reverseGeocodeCoordinates(parsedCoords.lat, parsedCoords.lng);
    }

    // Run AI analysis
    const aiResult = await analyzeImageWithAI(imageUrl);
    const { score, label } = calculateSeverity(hazardCategory, aiResult.detections);
    const user = (req as any).user;
    const reportId = `REP-${uuidv4().split('-')[0].toUpperCase()}`;

    // Live MongoDB Atlas
    if (mongoose.connection.readyState === 1) {
      const report = await HazardReport.create({
        reportId,
        citizen: user._id,
        imageUrl,
        hazardCategory: hazardCategory.trim(),
        description: description ? String(description).trim() : undefined,
        aiDetections: aiResult.detections,
        modelMetadata: aiResult.metadata,
        finalSeverityScore: score,
        severityLabel: label,
        location: {
          coordinates: coords,
          address: resolvedAddress || undefined,
          accuracy: accuracy && !isNaN(Number(accuracy)) ? Number(accuracy) : undefined
        },
        status: ReportStatus.Submitted,
        statusHistory: [{
          status: ReportStatus.Submitted,
          changedBy: user._id,
          timestamp: new Date(),
          note: 'Hazard report submitted by citizen.'
        }]
      });

      const populatedReport = await HazardReport.findById(report._id)
        .populate('citizen', 'name email')
        .populate('assignedCrew', 'name email');

      return res.status(201).json(populatedReport || report);
    } else {
      // In-memory demoStore fallback
      const report = demoStore.createReport({
        reportId,
        citizen: user,
        imageUrl,
        hazardCategory: hazardCategory.trim(),
        description: description ? String(description).trim() : undefined,
        aiDetections: aiResult.detections,
        modelMetadata: aiResult.metadata,
        finalSeverityScore: score,
        severityLabel: label,
        location: {
          coordinates: coords,
          address: resolvedAddress || undefined,
          accuracy: accuracy && !isNaN(Number(accuracy)) ? Number(accuracy) : undefined
        },
        status: ReportStatus.Submitted,
        statusHistory: [{
          status: ReportStatus.Submitted,
          changedBy: user._id || user.id,
          timestamp: new Date(),
          note: 'Hazard report submitted by citizen.'
        }]
      });

      return res.status(201).json(report);
    }
  } catch (error: any) {
    console.error('Create report error:', error);
    res.status(500).json({ message: 'Failed to create report. Please check input parameters.' });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const role = (req as any).user.role;
    const user = (req as any).user;
    const { status, severity, category, unresolved, sort } = req.query;

    if (mongoose.connection.readyState !== 1) {
      // In-memory demoStore fallback
      const reports = demoStore.getReports({
        role,
        userId: String(user._id || user.id),
        status: typeof status === 'string' ? status : undefined,
        severity: typeof severity === 'string' ? severity : undefined,
        category: typeof category === 'string' ? category : undefined,
        unresolved: unresolved === 'true',
        sort: typeof sort === 'string' ? sort : undefined,
      });
      return res.json(reports);
    }

    const query: any = {};

    if (role === 'Citizen') {
      query.citizen = user._id;
    } else if (role === 'Crew') {
      query.assignedCrew = user._id;
    }

    // Server-side filter parameters
    if (status && typeof status === 'string' && status !== 'ALL') {
      query.status = status;
    } else if (unresolved === 'true') {
      query.status = { $nin: [ReportStatus.Resolved, ReportStatus.Rejected, ReportStatus.Duplicate] };
    }

    if (severity && typeof severity === 'string' && severity !== 'ALL') {
      query.severityLabel = severity;
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      query.hazardCategory = category;
    }

    // Priority-First Sorting Engine:
    // Default: Highest severity score first (100 -> 0).
    // Secondary deterministic tie-breaker: oldest unresolved report first (createdAt: 1).
    let sortOptions: any = { finalSeverityScore: -1, createdAt: 1 };
    if (sort === 'severity_asc') {
      sortOptions = { finalSeverityScore: 1, createdAt: 1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    }

    const reports = await HazardReport.find(query)
      .sort(sortOptions)
      .populate('citizen', 'name email')
      .populate('assignedCrew', 'name email')
      .populate('resolvedBy', 'name email');

    res.json(reports);
  } catch (error: any) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Failed to retrieve reports.' });
  }
};

export const getReportById = async (req: Request, res: Response) => {
  try {
    const idParam = String(req.params.id || '').trim();
    if (!idParam) {
      return res.status(400).json({ message: 'Report identifier is required.' });
    }

    const user = (req as any).user;
    const userId = String(user._id || user.id);

    if (mongoose.connection.readyState !== 1) {
      // In-memory demoStore fallback
      const report = demoStore.getReportById(idParam);
      if (!report) {
        return res.status(404).json({ message: 'Hazard report not found.' });
      }

      if (user.role === 'Citizen') {
        const citizenId = report.citizen?._id ? String(report.citizen._id) : String(report.citizen);
        if (citizenId !== userId) {
          return res.status(403).json({ message: 'Not authorized to view this report.' });
        }
      } else if (user.role === 'Crew') {
        const crewId = report.assignedCrew?._id ? String(report.assignedCrew._id) : report.assignedCrew ? String(report.assignedCrew) : null;
        if (!crewId || crewId !== userId) {
          return res.status(403).json({ message: 'Not authorized to view this report (not assigned to your crew).' });
        }
      }
      return res.json(report);
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(idParam) && /^[0-9a-fA-F]{24}$/.test(idParam);
    const query = isObjectId
      ? { $or: [{ _id: idParam }, { reportId: idParam }] }
      : { reportId: idParam };

    const report = await HazardReport.findOne(query)
      .populate('citizen', 'name email')
      .populate('assignedCrew', 'name email')
      .populate('resolvedBy', 'name email');

    if (!report) {
      return res.status(404).json({ message: 'Hazard report not found.' });
    }

    // Authorization checks
    if (user.role === 'Citizen') {
      const citizenId = (report.citizen as any)?._id
        ? (report.citizen as any)._id.toString()
        : report.citizen ? report.citizen.toString() : null;

      if (!citizenId || citizenId !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this report.' });
      }
    } else if (user.role === 'Crew') {
      const crewId = (report.assignedCrew as any)?._id
        ? (report.assignedCrew as any)._id.toString()
        : report.assignedCrew ? report.assignedCrew.toString() : null;

      if (!crewId || crewId !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this report (not assigned to your crew).' });
      }
    }

    res.json(report);
  } catch (error: any) {
    console.error('Get report by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch report details.' });
  }
};

export const updateReportStatus = async (req: Request, res: Response) => {
  try {
    const { status, note, assignedCrew, finalSeverityScore, severityLabel } = req.body;
    const idParam = String(req.params.id || '').trim();
    if (!idParam) {
      return res.status(400).json({ message: 'Report identifier is required.' });
    }

    const user = (req as any).user;
    const userId = String(user._id || user.id);

    // Resolve after-repair photograph if provided in request
    let resolutionImageUrl: string | undefined;
    if (req.file) {
      if (isUsingCloudinary) {
        resolutionImageUrl = req.file.path;
      } else {
        resolutionImageUrl = `/uploads/${req.file.filename}`;
      }
    } else if (req.body.resolutionImageUrl && typeof req.body.resolutionImageUrl === 'string') {
      resolutionImageUrl = req.body.resolutionImageUrl.trim();
    }

    if (mongoose.connection.readyState !== 1) {
      // In-memory demoStore fallback
      const report = demoStore.getReportById(idParam);
      if (!report) {
        return res.status(404).json({ message: 'Hazard report not found.' });
      }

      if (user.role === 'Crew') {
        const crewId = report.assignedCrew?._id ? String(report.assignedCrew._id) : report.assignedCrew ? String(report.assignedCrew) : null;
        if (!crewId || crewId !== userId) {
          return res.status(403).json({ message: 'Not authorized to update reports not assigned to your crew.' });
        }

        if (status === ReportStatus.Resolved) {
          const effectiveResolutionImg = resolutionImageUrl || report.resolutionImageUrl;
          if (!effectiveResolutionImg) {
            return res.status(400).json({
              message: 'Resolution proof required: An after-repair photograph must be uploaded to mark this report as Resolved.'
            });
          }

          const effectiveNote = note ? String(note).trim() : report.resolutionNotes;
          if (!effectiveNote) {
            return res.status(400).json({
              message: 'Resolution notes required: Please describe the repair work performed.'
            });
          }

          report.status = ReportStatus.Resolved;
          report.resolutionImageUrl = effectiveResolutionImg;
          report.resolutionNotes = effectiveNote;
          report.resolvedAt = new Date();
          report.resolvedBy = { _id: userId, name: user.name, email: user.email };
        } else if (status) {
          report.status = status;
          if (resolutionImageUrl) report.resolutionImageUrl = resolutionImageUrl;
          if (note) report.resolutionNotes = String(note).trim();
        }
      } else if (user.role === 'Admin') {
        if (status) report.status = status;
        if (assignedCrew) {
          const assignedUser = demoStore.getUserById(String(assignedCrew));
          report.assignedCrew = assignedUser ? { _id: assignedUser._id, name: assignedUser.name, email: assignedUser.email } : assignedCrew;
          if (!status || status === ReportStatus.Submitted || status === ReportStatus.UnderReview) {
            report.status = ReportStatus.Assigned;
          }
        }
        if (typeof finalSeverityScore === 'number' || (typeof finalSeverityScore === 'string' && !isNaN(Number(finalSeverityScore)))) {
          report.finalSeverityScore = Math.min(100, Math.max(0, Number(finalSeverityScore)));
        }
        if (severityLabel && Object.values(SeverityLabel).includes(severityLabel)) {
          report.severityLabel = severityLabel;
        }
        if (resolutionImageUrl) report.resolutionImageUrl = resolutionImageUrl;
        if (status === ReportStatus.Resolved) {
          report.resolvedAt = new Date();
          report.resolvedBy = { _id: userId, name: user.name, email: user.email };
          if (note) report.resolutionNotes = String(note).trim();
        } else if (note) {
          report.adminNotes = String(note).trim();
        }
      }

      report.statusHistory.push({
        status: report.status,
        changedBy: userId,
        note: note ? String(note).trim() : `Status updated to ${report.status}`,
        timestamp: new Date()
      });

      return res.json(report);
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(idParam) && /^[0-9a-fA-F]{24}$/.test(idParam);
    const query = isObjectId
      ? { $or: [{ _id: idParam }, { reportId: idParam }] }
      : { reportId: idParam };

    const report = await HazardReport.findOne(query);

    if (!report) {
      return res.status(404).json({ message: 'Hazard report not found.' });
    }

    // Role-specific enforcement & authorization
    if (user.role === 'Crew') {
      // Crew can ONLY update reports explicitly assigned to them
      if (!report.assignedCrew || report.assignedCrew.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to update reports not assigned to your crew.' });
      }

      // If marking as Resolved, require BOTH resolution photograph AND resolution notes
      if (status === ReportStatus.Resolved) {
        const effectiveResolutionImg = resolutionImageUrl || report.resolutionImageUrl;
        if (!effectiveResolutionImg) {
          return res.status(400).json({
            message: 'Resolution proof required: An after-repair photograph must be uploaded to mark this report as Resolved.'
          });
        }

        const effectiveNote = note ? String(note).trim() : report.resolutionNotes;
        if (!effectiveNote) {
          return res.status(400).json({
            message: 'Resolution notes required: Please describe the repair work performed.'
          });
        }

        report.status = ReportStatus.Resolved;
        report.resolutionImageUrl = effectiveResolutionImg;
        report.resolutionNotes = effectiveNote;
        report.resolvedAt = new Date();
        report.resolvedBy = user._id;
      } else if (status) {
        report.status = status;
        if (resolutionImageUrl) {
          report.resolutionImageUrl = resolutionImageUrl;
        }
        if (note) {
          report.resolutionNotes = String(note).trim();
        }
      }
    } else if (user.role === 'Admin') {
      if (status) {
        report.status = status;
      }
      if (assignedCrew) {
        report.assignedCrew = assignedCrew;
        if (!status || status === ReportStatus.Submitted || status === ReportStatus.UnderReview) {
          report.status = ReportStatus.Assigned;
        }
      }
      if (typeof finalSeverityScore === 'number' || (typeof finalSeverityScore === 'string' && !isNaN(Number(finalSeverityScore)))) {
        report.finalSeverityScore = Math.min(100, Math.max(0, Number(finalSeverityScore)));
      }
      if (severityLabel && Object.values(SeverityLabel).includes(severityLabel)) {
        report.severityLabel = severityLabel;
      }
      if (resolutionImageUrl) {
        report.resolutionImageUrl = resolutionImageUrl;
      }
      if (status === ReportStatus.Resolved) {
        report.resolvedAt = new Date();
        report.resolvedBy = user._id;
        if (note) {
          report.resolutionNotes = String(note).trim();
        }
      } else if (note) {
        report.adminNotes = String(note).trim();
      }
    }

    // Append to audit history
    report.statusHistory.push({
      status: report.status,
      changedBy: user._id,
      note: note ? String(note).trim() : `Status updated to ${report.status}`,
      timestamp: new Date()
    });

    await report.save();

    const updated = await HazardReport.findById(report._id)
      .populate('citizen', 'name email')
      .populate('assignedCrew', 'name email')
      .populate('resolvedBy', 'name email');

    res.json(updated || report);
  } catch (error: any) {
    console.error('Update report error:', error);
    res.status(500).json({ message: error.message || 'Failed to update report.' });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json(demoStore.getDashboardStats());
    }

    const total = await HazardReport.countDocuments();
    const pending = await HazardReport.countDocuments({
      status: { $in: [ReportStatus.Submitted, ReportStatus.UnderReview] }
    });
    const critical = await HazardReport.countDocuments({ severityLabel: SeverityLabel.Critical });
    const resolved = await HazardReport.countDocuments({ status: ReportStatus.Resolved });

    res.json({ total, pending, critical, resolved });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to calculate dashboard statistics.' });
  }
};

