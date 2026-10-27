import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final double fontSize;

  const StatusBadge({
    super.key,
    required this.status,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    Color color = AppColors.gray;
    Color bg = AppColors.charcoal;

    switch (status) {
      case 'Resolved':
        color = AppColors.statusResolved;
        bg = const Color(0x3322C55E);
        break;
      case 'In Progress':
        color = AppColors.statusInProgress;
        bg = const Color(0x333B82F6);
        break;
      case 'Assigned':
        color = AppColors.statusAssigned;
        bg = const Color(0x33FACC15);
        break;
      case 'Under Review':
        color = AppColors.statusUnderReview;
        bg = const Color(0x3338BDF8);
        break;
      case 'Rejected':
        color = AppColors.statusRejected;
        bg = AppColors.criticalBg;
        break;
      case 'Submitted':
      default:
        color = AppColors.statusSubmitted;
        bg = AppColors.charcoal;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
