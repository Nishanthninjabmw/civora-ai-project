import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../models/user_model.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';

class PortalConfig {
  final UserRole role;
  final String title;
  final String badge;
  final Color badgeColor;
  final Color badgeBg;
  final String description;
  final IconData icon;
  final String demoEmail;

  const PortalConfig({
    required this.role,
    required this.title,
    required this.badge,
    required this.badgeColor,
    required this.badgeBg,
    required this.description,
    required this.icon,
    required this.demoEmail,
  });
}

const List<PortalConfig> portals = [
  PortalConfig(
    role: UserRole.citizen,
    title: 'Citizen Portal',
    badge: 'Public Reporting',
    badgeColor: AppColors.low,
    badgeBg: AppColors.lowBg,
    description:
        'Report municipal road hazards, submit geo-tagged photo evidence, and track neighborhood repair progress.',
    icon: Icons.people_outline,
    demoEmail: 'citizen@civora.com',
  ),
  PortalConfig(
    role: UserRole.admin,
    title: 'Administrator Portal',
    badge: 'Municipal Operations',
    badgeColor: AppColors.medium,
    badgeBg: AppColors.mediumBg,
    description:
        'Triage hazards via priority queue, review live geospatial map pins, and assign maintenance personnel.',
    icon: Icons.shield_outlined,
    demoEmail: 'admin@civora.com',
  ),
  PortalConfig(
    role: UserRole.crew,
    title: 'Repair Crew Portal',
    badge: 'Field Maintenance',
    badgeColor: Color(0xFF60A5FA),
    badgeBg: Color(0x333B82F6),
    description:
        'Review active work orders, record on-site repair progress, and submit after-repair proof photographs.',
    icon: Icons.build_outlined,
    demoEmail: 'crew@civora.com',
  ),
];

class PortalSelectionScreen extends ConsumerWidget {
  const PortalSelectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.dark,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 12),
              // Header Icon
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.charcoal,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.copper.withOpacity(0.4)),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.copper.withOpacity(0.08),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.shield_outlined,
                  color: AppColors.copper,
                  size: 44,
                ),
              ),
              const SizedBox(height: 20),
              // App Title & Tagline
              const Text(
                'CIVORA',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Select Your Access Portal',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Role-segregated workspaces for municipal hazard response. Select your authorized portal to authenticate.',
                style: TextStyle(
                  color: AppColors.gray,
                  fontSize: 13,
                  height: 1.4,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),

              // Portal Cards
              ...portals.map((portal) => _buildPortalCard(context, ref, portal)),

              const SizedBox(height: 20),

              // Demo Helper Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.charcoal.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.auto_awesome, color: AppColors.copper, size: 16),
                        SizedBox(width: 6),
                        Text(
                          'Demonstration Note',
                          style: TextStyle(
                            color: AppColors.copper,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'All demo accounts share password "password123".\nPortal cards provide one-tap credential auto-fill.',
                      style: TextStyle(
                        color: AppColors.gray,
                        fontSize: 11,
                        height: 1.4,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPortalCard(BuildContext context, WidgetRef ref, PortalConfig portal) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.charcoal,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            ref.read(authProvider.notifier).selectPortal(portal.role);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => LoginScreen(portal: portal),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.dark,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Icon(portal.icon, color: AppColors.copper, size: 24),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: portal.badgeBg,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: portal.badgeColor.withOpacity(0.4)),
                      ),
                      child: Text(
                        portal.badge,
                        style: TextStyle(
                          color: portal.badgeColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  portal.title,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  portal.description,
                  style: const TextStyle(
                    color: AppColors.gray,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 14),
                const Divider(color: AppColors.border),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      portal.demoEmail,
                      style: const TextStyle(
                        color: AppColors.grayLight,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      ),
                    ),
                    Row(
                      children: const [
                        Text(
                          'Sign In',
                          style: TextStyle(
                            color: AppColors.copper,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        SizedBox(width: 4),
                        Icon(
                          Icons.arrow_forward,
                          color: AppColors.copper,
                          size: 14,
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
