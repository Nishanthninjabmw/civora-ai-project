import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

enum SeverityBand { critical, high, medium, low }

class SeverityHelper {
  /// Severity thresholds matching backend:
  /// Critical: >= 80
  /// High:     60 - 79
  /// Medium:   35 - 59
  /// Low:      < 35
  static SeverityBand getBand(int score) {
    if (score >= 80) return SeverityBand.critical;
    if (score >= 60) return SeverityBand.high;
    if (score >= 35) return SeverityBand.medium;
    return SeverityBand.low;
  }

  static String getLabel(int score) {
    switch (getBand(score)) {
      case SeverityBand.critical:
        return 'Critical';
      case SeverityBand.high:
        return 'High';
      case SeverityBand.medium:
        return 'Medium';
      case SeverityBand.low:
        return 'Low';
    }
  }

  static Color getColor(String? label, [int? score]) {
    final cleanLabel = (label ?? (score != null ? getLabel(score) : 'Low')).toLowerCase();
    if (cleanLabel.contains('critical') || (score != null && score >= 80)) {
      return AppColors.critical;
    }
    if (cleanLabel.contains('high') || (score != null && score >= 60)) {
      return AppColors.high;
    }
    if (cleanLabel.contains('medium') || (score != null && score >= 35)) {
      return AppColors.medium;
    }
    return AppColors.low;
  }

  static Color getBackgroundColor(String? label, [int? score]) {
    final cleanLabel = (label ?? (score != null ? getLabel(score) : 'Low')).toLowerCase();
    if (cleanLabel.contains('critical') || (score != null && score >= 80)) {
      return AppColors.criticalBg;
    }
    if (cleanLabel.contains('high') || (score != null && score >= 60)) {
      return AppColors.highBg;
    }
    if (cleanLabel.contains('medium') || (score != null && score >= 35)) {
      return AppColors.mediumBg;
    }
    return AppColors.lowBg;
  }
}
