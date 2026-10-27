
class AiBoundingBox {
  final double x;
  final double y;
  final double width;
  final double height;

  AiBoundingBox({
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });

  factory AiBoundingBox.fromJson(Map<String, dynamic> json) {
    return AiBoundingBox(
      x: (json['x'] as num?)?.toDouble() ?? 0.0,
      y: (json['y'] as num?)?.toDouble() ?? 0.0,
      width: (json['width'] as num?)?.toDouble() ?? 0.0,
      height: (json['height'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'x': x,
        'y': y,
        'width': width,
        'height': height,
      };
}

class AiDetection {
  final String detectionClass;
  final double confidence;
  final AiBoundingBox? bbox;

  AiDetection({
    required this.detectionClass,
    required this.confidence,
    this.bbox,
  });

  factory AiDetection.fromJson(Map<String, dynamic> json) {
    return AiDetection(
      detectionClass: (json['class'] ?? 'hazard').toString(),
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      bbox: json['bbox'] is Map ? AiBoundingBox.fromJson(json['bbox']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'class': detectionClass,
        'confidence': confidence,
        if (bbox != null) 'bbox': bbox!.toJson(),
      };
}

class ModelMetadata {
  final String? modelId;
  final int? inferenceTimeMs;
  final String? status;

  ModelMetadata({
    this.modelId,
    this.inferenceTimeMs,
    this.status,
  });

  factory ModelMetadata.fromJson(Map<String, dynamic> json) {
    return ModelMetadata(
      modelId: json['modelId']?.toString(),
      inferenceTimeMs: (json['inferenceTimeMs'] as num?)?.toInt(),
      status: json['status']?.toString(),
    );
  }
}

class StatusHistoryItem {
  final String status;
  final DateTime timestamp;
  final String? note;
  final String? changedBy;

  StatusHistoryItem({
    required this.status,
    required this.timestamp,
    this.note,
    this.changedBy,
  });

  factory StatusHistoryItem.fromJson(Map<String, dynamic> json) {
    DateTime parsedDate;
    try {
      parsedDate = json['timestamp'] != null
          ? DateTime.parse(json['timestamp'].toString())
          : DateTime.now();
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return StatusHistoryItem(
      status: (json['status'] ?? 'Updated').toString(),
      timestamp: parsedDate,
      note: json['note']?.toString(),
      changedBy: json['changedBy'] is Map
          ? json['changedBy']['name']?.toString()
          : json['changedBy']?.toString(),
    );
  }
}

class HazardReportModel {
  final String id;
  final String reportId;
  final String imageUrl;
  final String hazardCategory;
  final String? description;
  final List<AiDetection> aiDetections;
  final ModelMetadata? modelMetadata;
  final int finalSeverityScore;
  final String severityLabel;
  final double latitude;
  final double longitude;
  final String? address;
  final double? accuracy;
  final String status;
  final String? citizenName;
  final String? citizenId;
  final String? assignedCrewId;
  final String? assignedCrewName;
  final String? assignedCrewEmail;
  final String? adminNotes;
  final String? resolutionNotes;
  final String? resolutionImageUrl;
  final DateTime? resolvedAt;
  final String? resolvedByName;
  final List<StatusHistoryItem> statusHistory;
  final DateTime createdAt;
  final DateTime? updatedAt;

  HazardReportModel({
    required this.id,
    required this.reportId,
    required this.imageUrl,
    required this.hazardCategory,
    this.description,
    this.aiDetections = const [],
    this.modelMetadata,
    required this.finalSeverityScore,
    required this.severityLabel,
    required this.latitude,
    required this.longitude,
    this.address,
    this.accuracy,
    required this.status,
    this.citizenName,
    this.citizenId,
    this.assignedCrewId,
    this.assignedCrewName,
    this.assignedCrewEmail,
    this.adminNotes,
    this.resolutionNotes,
    this.resolutionImageUrl,
    this.resolvedAt,
    this.resolvedByName,
    this.statusHistory = const [],
    required this.createdAt,
    this.updatedAt,
  });

  factory HazardReportModel.fromJson(Map<String, dynamic> json) {
    // Parse coordinates [longitude, latitude]
    double lat = 0.0;
    double lng = 0.0;
    String? addr;
    double? acc;

    if (json['location'] is Map) {
      final loc = json['location'] as Map<String, dynamic>;
      addr = loc['address']?.toString();
      acc = (loc['accuracy'] as num?)?.toDouble();

      if (loc['coordinates'] is List && (loc['coordinates'] as List).length >= 2) {
        final coords = loc['coordinates'] as List;
        lng = (coords[0] as num?)?.toDouble() ?? 0.0;
        lat = (coords[1] as num?)?.toDouble() ?? 0.0;
      }
    }

    // Citizen parsing
    String? cName;
    String? cId;
    if (json['citizen'] is Map) {
      cName = json['citizen']['name']?.toString();
      cId = json['citizen']['_id']?.toString() ?? json['citizen']['id']?.toString();
    } else if (json['citizen'] != null) {
      cId = json['citizen'].toString();
    }

    // Assigned Crew parsing
    String? crewId;
    String? crewName;
    String? crewEmail;
    if (json['assignedCrew'] is Map) {
      crewId = json['assignedCrew']['_id']?.toString() ?? json['assignedCrew']['id']?.toString();
      crewName = json['assignedCrew']['name']?.toString();
      crewEmail = json['assignedCrew']['email']?.toString();
    } else if (json['assignedCrew'] != null) {
      crewId = json['assignedCrew'].toString();
    }

    // ResolvedBy parsing
    String? resByName;
    if (json['resolvedBy'] is Map) {
      resByName = json['resolvedBy']['name']?.toString();
    }

    // AI detections parsing
    final List<AiDetection> detections = [];
    if (json['aiDetections'] is List) {
      for (final d in json['aiDetections'] as List) {
        if (d is Map<String, dynamic>) {
          detections.add(AiDetection.fromJson(d));
        }
      }
    }

    // Status history parsing
    final List<StatusHistoryItem> history = [];
    if (json['statusHistory'] is List) {
      for (final h in json['statusHistory'] as List) {
        if (h is Map<String, dynamic>) {
          history.add(StatusHistoryItem.fromJson(h));
        }
      }
    }

    DateTime created;
    try {
      created = json['createdAt'] != null
          ? DateTime.parse(json['createdAt'].toString())
          : DateTime.now();
    } catch (_) {
      created = DateTime.now();
    }

    DateTime? resolved;
    if (json['resolvedAt'] != null) {
      try {
        resolved = DateTime.parse(json['resolvedAt'].toString());
      } catch (_) {}
    }

    return HazardReportModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      reportId: (json['reportId'] ?? json['_id'] ?? '').toString(),
      imageUrl: (json['imageUrl'] ?? '').toString(),
      hazardCategory: (json['hazardCategory'] ?? 'Pothole').toString(),
      description: json['description']?.toString(),
      aiDetections: detections,
      modelMetadata: json['modelMetadata'] is Map
          ? ModelMetadata.fromJson(json['modelMetadata'])
          : null,
      finalSeverityScore: (json['finalSeverityScore'] as num?)?.toInt() ?? 20,
      severityLabel: (json['severityLabel'] ?? 'Low').toString(),
      latitude: lat,
      longitude: lng,
      address: addr,
      accuracy: acc,
      status: (json['status'] ?? 'Submitted').toString(),
      citizenName: cName,
      citizenId: cId,
      assignedCrewId: crewId,
      assignedCrewName: crewName,
      assignedCrewEmail: crewEmail,
      adminNotes: json['adminNotes']?.toString(),
      resolutionNotes: json['resolutionNotes']?.toString(),
      resolutionImageUrl: json['resolutionImageUrl']?.toString(),
      resolvedAt: resolved,
      resolvedByName: resByName,
      statusHistory: history,
      createdAt: created,
    );
  }
}
