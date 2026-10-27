import 'package:flutter/material.dart';
import '../../../../core/utils/severity_helper.dart';

class SeverityBadge extends StatelessWidget {
  final int score;
  final String label;
  final bool showScore;
  final double fontSize;

  const SeverityBadge({
    super.key,
    required this.score,
    required this.label,
    this.showScore = true,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    final color = SeverityHelper.getColor(label, score);
    final bg = SeverityHelper.getBackgroundColor(label, score);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        showScore ? '$label ($score)' : label,
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
