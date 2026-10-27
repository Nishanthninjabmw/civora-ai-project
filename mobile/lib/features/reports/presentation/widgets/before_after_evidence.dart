import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../shared/widgets/safe_network_image.dart';

class BeforeAfterEvidence extends StatelessWidget {
  final String beforeImageUrl;
  final String afterImageUrl;
  final DateTime? reportedAt;
  final DateTime? resolvedAt;
  final String? resolutionNotes;
  final String? resolvedByName;

  const BeforeAfterEvidence({
    super.key,
    required this.beforeImageUrl,
    required this.afterImageUrl,
    this.reportedAt,
    this.resolvedAt,
    this.resolutionNotes,
    this.resolvedByName,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.charcoal,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.statusResolved.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.verified, color: AppColors.statusResolved, size: 20),
              SizedBox(width: 8),
              Text(
                'Verified Repair Evidence',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Side-by-side or stacked Before & After images
          Row(
            children: [
              // Before
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'BEFORE (Citizen)',
                          style: TextStyle(
                            color: AppColors.gray,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        height: 130,
                        color: AppColors.dark,
                        child: SafeNetworkImage(
                          imageUrl: beforeImageUrl,
                          height: 130,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          fallbackText: 'Original hazard photo',
                        ),
                      ),
                    ),
                    if (reportedAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        DateFormatter.formatDate(reportedAt),
                        style: const TextStyle(
                          color: AppColors.gray,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // After
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text(
                          'AFTER (Crew Proof)',
                          style: TextStyle(
                            color: AppColors.statusResolved,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        height: 130,
                        decoration: BoxDecoration(
                          color: AppColors.dark,
                          border: Border.all(color: AppColors.statusResolved.withOpacity(0.4)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: SafeNetworkImage(
                          imageUrl: afterImageUrl,
                          height: 130,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          fallbackText: 'Repair proof photo',
                        ),
                      ),
                    ),
                    if (resolvedAt != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        DateFormatter.formatDateTime(resolvedAt),
                        style: const TextStyle(
                          color: AppColors.statusResolved,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),

          if (resolutionNotes != null && resolutionNotes!.isNotEmpty) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.darkSurface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Resolution Summary:',
                    style: TextStyle(
                      color: AppColors.grayLight,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    resolutionNotes!,
                    style: const TextStyle(
                      color: AppColors.white,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                  if (resolvedByName != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Signed off by: $resolvedByName',
                      style: const TextStyle(
                        color: AppColors.copper,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
