import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/widgets/civora_app_bar.dart';
import '../../../shared/widgets/safe_network_image.dart';
import '../../../shared/widgets/error_state_widget.dart';
import '../../reports/providers/reports_provider.dart';
import '../../reports/presentation/report_details_screen.dart';
import '../../reports/presentation/widgets/status_badge.dart';
import '../../reports/presentation/widgets/severity_badge.dart';
import 'report_hazard_screen.dart';

class CitizenDashboardScreen extends ConsumerStatefulWidget {
  const CitizenDashboardScreen({super.key});

  @override
  ConsumerState<CitizenDashboardScreen> createState() => _CitizenDashboardScreenState();
}

class _CitizenDashboardScreenState extends ConsumerState<CitizenDashboardScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(reportsProvider.notifier).fetchReports();
    });
  }

  @override
  Widget build(BuildContext context) {
    final reportsState = ref.watch(reportsProvider);
    final reports = reportsState.reports;

    return Scaffold(
      backgroundColor: AppColors.dark,
      appBar: CivoraAppBar(
        subtitle: 'Public Hazard Reporting',
        actions: [
          IconButton(
            icon: reportsState.isRefreshing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.copper),
                  )
                : const Icon(Icons.refresh, color: AppColors.gray, size: 20),
            tooltip: 'Refresh Reports',
            onPressed: reportsState.isLoading || reportsState.isRefreshing
                ? null
                : () => ref.read(reportsProvider.notifier).fetchReports(silent: true),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.copper,
        foregroundColor: AppColors.dark,
        icon: const Icon(Icons.add_a_photo_outlined),
        label: const Text('Report Hazard', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ReportHazardScreen()),
          );
        },
      ),
      body: RefreshIndicator(
        color: AppColors.copper,
        backgroundColor: AppColors.charcoal,
        onRefresh: () => ref.read(reportsProvider.notifier).fetchReports(silent: true),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header title
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'My Reports',
                        style: TextStyle(
                          color: AppColors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Track and monitor reports submitted from your account (${reports.length} total)',
                        style: const TextStyle(color: AppColors.gray, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),

              if (reportsState.errorMessage != null) ...[
                ErrorStateWidget(
                  message: reportsState.errorMessage!,
                  onRetry: () => ref.read(reportsProvider.notifier).fetchReports(),
                ),
                const SizedBox(height: 12),
              ],

              if (reportsState.isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.copper),
                  ),
                )
              else if (reports.isEmpty)
                _buildEmptyState()
              else
                ...reports.map((report) => _buildReportCard(report)),

              const SizedBox(height: 80), // Padding for FAB
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 20),
      decoration: BoxDecoration(
        color: AppColors.charcoal,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.dark,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(Icons.assignment_outlined, size: 40, color: AppColors.copper),
          ),
          const SizedBox(height: 16),
          const Text(
            'No reports submitted yet',
            style: TextStyle(color: AppColors.white, fontSize: 17, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          const Text(
            'Help keep your municipal streets safe by reporting potholes, fallen trees, waterlogging, and road hazards.',
            style: TextStyle(color: AppColors.gray, fontSize: 12, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ReportHazardScreen()),
              );
            },
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Create First Report'),
          ),
        ],
      ),
    );
  }

  Widget _buildReportCard(dynamic report) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
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
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ReportDetailsScreen(reportId: report.id),
              ),
            );
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Photo with overlay status
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      topRight: Radius.circular(16),
                    ),
                    child: Container(
                      height: 160,
                      width: double.infinity,
                      color: AppColors.darkSurface,
                      child: SafeNetworkImage(
                        imageUrl: report.imageUrl,
                        height: 160,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        fallbackText: 'Hazard photograph',
                      ),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: StatusBadge(status: report.status),
                  ),
                ],
              ),

              // Details
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          report.hazardCategory,
                          style: const TextStyle(
                            color: AppColors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        SeverityBadge(
                          score: report.finalSeverityScore,
                          label: report.severityLabel,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 14, color: AppColors.gray),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            report.address != null && report.address!.isNotEmpty
                                ? report.address!
                                : '${report.latitude.toStringAsFixed(4)}, ${report.longitude.toStringAsFixed(4)}',
                            style: const TextStyle(color: AppColors.grayLight, fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Divider(color: AppColors.border),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          DateFormatter.formatDate(report.createdAt),
                          style: const TextStyle(color: AppColors.gray, fontSize: 11),
                        ),
                        Row(
                          children: const [
                            Text(
                              'View Details',
                              style: TextStyle(
                                color: AppColors.copper,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward_ios, size: 11, color: AppColors.copper),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
