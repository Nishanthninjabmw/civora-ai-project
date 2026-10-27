import 'package:flutter/material.dart';

/// CIVORA Core Brand Color Palette
/// Matches the web design system: near-black, dark charcoal, and muted copper.
class AppColors {
  // Brand Background & Surface Colors
  static const Color dark = Color(0xFF0F1115); // Near-black background
  static const Color charcoal = Color(0xFF1C1F26); // Dark charcoal surface cards
  static const Color darkSurface = Color(0xFF14171E); // Secondary card surface
  static const Color brown = Color(0xFF3E2723); // Dark brown accent
  static const Color border = Color(0xFF2A2E39); // Subtle dark borders
  static const Color borderSubtle = Color(0xFF222631);

  // Brand Accent Colors
  static const Color copper = Color(0xFFC58361); // Muted copper primary
  static const Color copperHover = Color(0xFFD79573); // Copper light / hover
  static const Color copperDark = Color(0xFFA56644); // Dark copper

  // Text & Utility Colors
  static const Color white = Color(0xFFF9F6F0); // Warm white primary text
  static const Color gray = Color(0xFF8A94A6); // Utility gray secondary text
  static const Color grayLight = Color(0xFFB0B7C3);
  static const Color grayDark = Color(0xFF4A5568);

  // Severity Band Colors
  static const Color critical = Color(0xFFEF4444); // Critical >= 80
  static const Color criticalBg = Color(0x33EF4444);
  static const Color high = Color(0xFFF97316); // High 60-79
  static const Color highBg = Color(0x33F97316);
  static const Color medium = Color(0xFFEAB308); // Medium 35-59
  static const Color mediumBg = Color(0x33EAB308);
  static const Color low = Color(0xFF10B981); // Low < 35
  static const Color lowBg = Color(0x3310B981);

  // Status Badge Colors
  static const Color statusSubmitted = Color(0xFF8A94A6);
  static const Color statusUnderReview = Color(0xFF38BDF8);
  static const Color statusAssigned = Color(0xFFFACC15);
  static const Color statusInProgress = Color(0xFF3B82F6);
  static const Color statusResolved = Color(0xFF22C55E);
  static const Color statusRejected = Color(0xFFEF4444);
}
