import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/auth/models/user_model.dart';
import '../../../features/reports/providers/reports_provider.dart';

class CivoraAppBar extends ConsumerWidget implements PreferredSizeWidget {
  final String? subtitle;
  final List<Widget>? actions;
  final bool showBackButton;

  const CivoraAppBar({
    super.key,
    this.subtitle,
    this.actions,
    this.showBackButton = false,
  });

  @override
  Size get preferredSize => const Size.fromHeight(64);

  void _showServerConfigDialog(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController(text: ApiConstants.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.charcoal,
        title: const Text('Backend API Host', style: TextStyle(color: AppColors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter reachable CIVORA backend URL:\n• Android Emulator: http://10.0.2.2:5001/api\n• Physical Phone: http://<YOUR_LAN_IP>:5001/api\n• iOS / Desktop: http://localhost:5001/api',
              style: TextStyle(color: AppColors.gray, fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              style: const TextStyle(color: AppColors.white, fontSize: 13),
              decoration: const InputDecoration(
                labelText: 'Base URL',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppColors.gray)),
          ),
          ElevatedButton(
            onPressed: () {
              ApiConstants.setCustomBaseUrl(controller.text);
              Navigator.pop(ctx);
              ref.read(reportsProvider.notifier).fetchReports();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('API URL set to: ${ApiConstants.baseUrl}')),
              );
            },
            child: const Text('Save & Reconnect'),
          ),
        ],
      ),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.charcoal,
        title: const Text('Sign Out', style: TextStyle(color: AppColors.white)),
        content: const Text(
          'Are you sure you want to end your current municipal session?',
          style: TextStyle(color: AppColors.gray, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppColors.gray)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.critical,
              foregroundColor: AppColors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authProvider.notifier).logout();
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;

    Color badgeColor = AppColors.copper;
    Color badgeBg = AppColors.copper.withOpacity(0.15);
    String badgeText = user?.role.value ?? 'Public';

    if (user?.role == UserRole.admin) {
      badgeColor = AppColors.medium;
      badgeBg = AppColors.mediumBg;
    } else if (user?.role == UserRole.crew) {
      badgeColor = const Color(0xFF60A5FA);
      badgeBg = const Color(0x333B82F6);
    } else if (user?.role == UserRole.citizen) {
      badgeColor = AppColors.low;
      badgeBg = AppColors.lowBg;
    }

    return AppBar(
      automaticallyImplyLeading: false,
      leading: showBackButton
          ? IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, size: 18),
              onPressed: () => Navigator.maybePop(context),
            )
          : null,
      title: Row(
        children: [
          // CIVORA shield icon
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppColors.charcoal,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.copper.withValues(alpha: 0.5)),
            ),
            child: const Icon(
              Icons.shield_outlined,
              color: AppColors.copper,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'CIVORA',
                style: TextStyle(
                  color: AppColors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  letterSpacing: 1.5,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: const TextStyle(
                    color: AppColors.gray,
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                  ),
                ),
            ],
          ),
        ],
      ),
      actions: [
        if (user != null) ...[
          // Role & user badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: badgeBg,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  badgeText,
                  style: TextStyle(
                    color: badgeColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
        ],
        // Network Host Config icon
        IconButton(
          icon: const Icon(Icons.wifi_tethering, size: 18, color: AppColors.gray),
          tooltip: 'Configure Backend Host',
          onPressed: () => _showServerConfigDialog(context, ref),
        ),
        if (actions != null) ...actions!,
        if (user != null)
          IconButton(
            icon: const Icon(Icons.logout, size: 18, color: AppColors.gray),
            tooltip: 'Sign Out',
            onPressed: () => _confirmLogout(context, ref),
          ),
        const SizedBox(width: 4),
      ],
    );
  }
}
