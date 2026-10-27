import 'package:flutter_test/flutter_test.dart';
import 'package:civora_app/core/utils/severity_helper.dart';
import 'package:civora_app/features/auth/models/user_model.dart';
import 'package:civora_app/features/reports/models/hazard_report_model.dart';

void main() {
  group('CIVORA Severity Scoring & Band Tests', () {
    test('Severity bands adhere strictly to municipal rules', () {
      expect(SeverityHelper.getBand(85), equals(SeverityBand.critical));
      expect(SeverityHelper.getLabel(85), equals('Critical'));

      expect(SeverityHelper.getBand(80), equals(SeverityBand.critical));
      expect(SeverityHelper.getLabel(80), equals('Critical'));

      expect(SeverityHelper.getBand(70), equals(SeverityBand.high));
      expect(SeverityHelper.getLabel(70), equals('High'));

      expect(SeverityHelper.getBand(60), equals(SeverityBand.high));
      expect(SeverityHelper.getLabel(60), equals('High'));

      expect(SeverityHelper.getBand(50), equals(SeverityBand.medium));
      expect(SeverityHelper.getLabel(50), equals('Medium'));

      expect(SeverityHelper.getBand(35), equals(SeverityBand.medium));
      expect(SeverityHelper.getLabel(35), equals('Medium'));

      expect(SeverityHelper.getBand(30), equals(SeverityBand.low));
      expect(SeverityHelper.getLabel(30), equals('Low'));

      expect(SeverityHelper.getBand(10), equals(SeverityBand.low));
      expect(SeverityHelper.getLabel(10), equals('Low'));
    });
  });

  group('CIVORA User & Role Model Tests', () {
    test('UserRole parses roles accurately and case-insensitively', () {
      expect(UserRole.fromString('Citizen'), equals(UserRole.citizen));
      expect(UserRole.fromString('citizen'), equals(UserRole.citizen));
      expect(UserRole.fromString('Admin'), equals(UserRole.admin));
      expect(UserRole.fromString('admin'), equals(UserRole.admin));
      expect(UserRole.fromString('Crew'), equals(UserRole.crew));
      expect(UserRole.fromString('crew'), equals(UserRole.crew));
      expect(UserRole.fromString('unknown'), equals(UserRole.citizen));
    });

    test('UserModel serializes and deserializes JSON cleanly', () {
      final json = {
        '_id': 'user_123',
        'name': 'Bob Crew',
        'email': 'crew@civora.com',
        'role': 'Crew',
        'token': 'jwt_test_token',
      };

      final user = UserModel.fromJson(json);
      expect(user.id, equals('user_123'));
      expect(user.name, equals('Bob Crew'));
      expect(user.email, equals('crew@civora.com'));
      expect(user.role, equals(UserRole.crew));
      expect(user.token, equals('jwt_test_token'));

      final serialized = user.toJson();
      expect(serialized['_id'], equals('user_123'));
      expect(serialized['role'], equals('Crew'));
    });
  });

  group('CIVORA Hazard Report Model Tests', () {
    test('HazardReportModel extracts [lng, lat] coordinates and AI metadata', () {
      final json = {
        '_id': '6acbb825cc0aaa92a0b00673',
        'reportId': 'REP-E8A10AD2',
        'imageUrl': '/uploads/test_photo.jpg',
        'hazardCategory': 'Fallen Tree',
        'description': 'Large branch blocking south lane',
        'finalSeverityScore': 70,
        'severityLabel': 'High',
        'status': 'Assigned',
        'location': {
          'coordinates': [80.2707, 13.0827], // [longitude, latitude]
          'address': 'Anna Salai, Chennai',
          'accuracy': 12.5,
        },
        'citizen': {
          '_id': 'cit_1',
          'name': 'John Citizen',
          'email': 'citizen@civora.com',
        },
        'assignedCrew': {
          '_id': 'crew_1',
          'name': 'Bob Crew',
          'email': 'crew@civora.com',
        },
        'aiDetections': [
          {
            'class': 'fallen tree',
            'confidence': 0.88,
            'bbox': {'x': 100, 'y': 150, 'width': 200, 'height': 300}
          }
        ],
        'createdAt': '2026-10-11T14:00:00.000Z',
      };

      final report = HazardReportModel.fromJson(json);
      expect(report.id, equals('6acbb825cc0aaa92a0b00673'));
      expect(report.reportId, equals('REP-E8A10AD2'));
      expect(report.hazardCategory, equals('Fallen Tree'));
      expect(report.finalSeverityScore, equals(70));
      expect(report.severityLabel, equals('High'));
      expect(report.status, equals('Assigned'));
      // Note coordinates: lat is index 1, lng is index 0
      expect(report.latitude, equals(13.0827));
      expect(report.longitude, equals(80.2707));
      expect(report.citizenName, equals('John Citizen'));
      expect(report.assignedCrewName, equals('Bob Crew'));
      expect(report.aiDetections.length, equals(1));
      expect(report.aiDetections.first.detectionClass, equals('fallen tree'));
      expect(report.aiDetections.first.confidence, equals(0.88));
      expect(report.aiDetections.first.bbox?.width, equals(200));
    });

    test('Priority Queue sorting orders highest severity first, tie-breaking by older date', () {
      final r1 = HazardReportModel(
        id: '1',
        reportId: 'REP-1',
        imageUrl: '',
        hazardCategory: 'Pothole',
        finalSeverityScore: 50,
        severityLabel: 'Medium',
        latitude: 0,
        longitude: 0,
        status: 'Submitted',
        createdAt: DateTime(2026, 10, 11, 10, 0),
      );

      final r2 = HazardReportModel(
        id: '2',
        reportId: 'REP-2',
        imageUrl: '',
        hazardCategory: 'Fallen Tree',
        finalSeverityScore: 85,
        severityLabel: 'Critical',
        latitude: 0,
        longitude: 0,
        status: 'Submitted',
        createdAt: DateTime(2026, 10, 11, 12, 0), // newer critical
      );

      final r3 = HazardReportModel(
        id: '3',
        reportId: 'REP-3',
        imageUrl: '',
        hazardCategory: 'Fallen Tree',
        finalSeverityScore: 85,
        severityLabel: 'Critical',
        latitude: 0,
        longitude: 0,
        status: 'Submitted',
        createdAt: DateTime(2026, 10, 11, 8, 0), // older critical (tie breaker winner)
      );

      final list = [r1, r2, r3];
      list.sort((a, b) {
        if (b.finalSeverityScore != a.finalSeverityScore) {
          return b.finalSeverityScore.compareTo(a.finalSeverityScore);
        }
        return a.createdAt.compareTo(b.createdAt);
      });

      expect(list[0].id, equals('3')); // Score 85, older date (8:00)
      expect(list[1].id, equals('2')); // Score 85, newer date (12:00)
      expect(list[2].id, equals('1')); // Score 50
    });
  });
}
