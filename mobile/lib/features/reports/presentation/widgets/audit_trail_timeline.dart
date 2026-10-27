import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../models/hazard_report_model.dart';

class AuditTrailTimeline extends StatelessWidget {
  final List<StatusHistoryItem> history;

  const AuditTrailTimeline({
    super.key,
    required this.history,
  });

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) {
      return const Text(
        'No lifecycle history recorded.',
        style: TextStyle(color: AppColors.gray, fontSize: 12),
      );
    }

    return Column(
      children: history.map((item) {
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.darkSurface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    item.status,
                    style: const TextStyle(
                      color: AppColors.copper,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    DateFormatter.formatDateTime(item.timestamp),
                    style: const TextStyle(
                      color: AppColors.gray,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
              if (item.note != null && item.note!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  item.note!,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 12,
                    height: 1.3,
                  ),
                ),
              ],
            ],
          ),
        );
      }).toList(),
    );
  }
}
