import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../models/hazard_report_model.dart';

class AiDetectionOverlay extends StatelessWidget {
  final HazardReportModel report;

  const AiDetectionOverlay({
    super.key,
    required this.report,
  });

  @override
  Widget build(BuildContext context) {
    final hasDetections = report.aiDetections.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.charcoal,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.psychology_outlined, color: AppColors.copper, size: 20),
              SizedBox(width: 8),
              Text(
                'AI Severity & Vision Inference',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (hasDetections) ...[
            ...report.aiDetections.map((det) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.darkSurface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        det.detectionClass.toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        'Confidence: ${(det.confidence * 100).toStringAsFixed(1)}%',
                        style: const TextStyle(
                          color: AppColors.copper,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                )),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Model: ${report.modelMetadata?.modelId ?? 'road-damage'}',
                  style: const TextStyle(color: AppColors.gray, fontSize: 11),
                ),
                Text(
                  'Inference: ${report.modelMetadata?.inferenceTimeMs ?? 0}ms',
                  style: const TextStyle(color: AppColors.gray, fontSize: 11),
                ),
              ],
            ),
          ] else ...[
            // Graceful Fallback / Transparent AI Status Notice
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
                  Row(
                    children: const [
                      Icon(Icons.info_outline, color: AppColors.copper, size: 16),
                      SizedBox(width: 6),
                      Text(
                        'Status: Deterministic Category Triage Active',
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
                    'AI vision inference is currently using deterministic municipal category rules. Scores are calculated without hallucinating detections.',
                    style: TextStyle(
                      color: AppColors.gray,
                      fontSize: 11,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
