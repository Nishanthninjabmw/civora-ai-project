import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'core/constants/app_colors.dart';
import 'features/auth/models/user_model.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/presentation/portal_selection_screen.dart';
import 'features/citizen/presentation/citizen_dashboard_screen.dart';
import 'features/admin/presentation/admin_dashboard_screen.dart';
import 'features/crew/presentation/crew_dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: CivoraApp(),
    ),
  );
}

class CivoraApp extends StatelessWidget {
  const CivoraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CIVORA',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    // Initial session restoration state
    if (authState.isLoading && authState.user == null) {
      return const Scaffold(
        backgroundColor: AppColors.dark,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.shield_outlined,
                color: AppColors.copper,
                size: 56,
              ),
              SizedBox(height: 16),
              Text(
                'CIVORA',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2,
                ),
              ),
              SizedBox(height: 16),
              CircularProgressIndicator(
                color: AppColors.copper,
                strokeWidth: 2,
              ),
            ],
          ),
        ),
      );
    }

    // If authenticated, navigate to the specific role dashboard
    if (authState.isAuthenticated && authState.user != null) {
      switch (authState.user!.role) {
        case UserRole.admin:
          return const AdminDashboardScreen();
        case UserRole.crew:
          return const CrewDashboardScreen();
        case UserRole.citizen:
          return const CitizenDashboardScreen();
      }
    }

    // Default: Three-portal role entry screen
    return const PortalSelectionScreen();
  }
}
