import 'dart:io';
import 'package:flutter/foundation.dart';

/// CIVORA API Endpoints and Network Configuration
class ApiConstants {
  // Configurable base host
  static String? _customBaseUrl;

  static void setCustomBaseUrl(String url) {
    _customBaseUrl = url.trim().endsWith('/')
        ? url.trim().substring(0, url.trim().length - 1)
        : url.trim();
  }

  static String get baseUrl {
    if (_customBaseUrl != null && _customBaseUrl!.isNotEmpty) {
      return _customBaseUrl!;
    }

    // Android emulator cannot access `localhost` on development machine; uses 10.0.2.2
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:5001/api';
    }

    // Default for iOS simulator, macOS desktop, web, or physical host proxy
    return 'http://localhost:5001/api';
  }

  // Base domain for resolving relative image URLs like `/uploads/...`
  static String get serverOrigin {
    final uri = Uri.parse(baseUrl);
    return '${uri.scheme}://${uri.host}:${uri.port}';
  }

  /// Resolve full image URL from backend response
  static String resolveImageUrl(String? pathOrUrl) {
    if (pathOrUrl == null || pathOrUrl.isEmpty) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    // Relative path such as `/uploads/123.jpg`
    final cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : '/$pathOrUrl';
    return '$serverOrigin$cleanPath';
  }

  // Auth endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  static const String crew = '/auth/crew';

  // Report endpoints
  static const String reports = '/reports';
  static const String reportStats = '/reports/stats';
  static String reportById(String id) => '/reports/$id';
  static String reportStatus(String id) => '/reports/$id/status';
}
