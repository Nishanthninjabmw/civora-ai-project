import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../shared/widgets/civora_app_bar.dart';
import '../../../shared/widgets/safe_network_image.dart';
import '../../../shared/widgets/error_state_widget.dart';
import '../../reports/models/hazard_report_model.dart';
import '../../reports/providers/reports_provider.dart';
import '../../reports/presentation/report_details_screen.dart';
import '../../reports/presentation/widgets/status_badge.dart';
import '../../reports/presentation/widgets/severity_badge.dart';

class CrewDashboardScreen extends ConsumerStatefulWidget {
  const CrewDashboardScreen({super.key});

  @override
  ConsumerState<CrewDashboardScreen> createState() => _CrewDashboardScreenState();
}

class _CrewDashboardScreenState extends ConsumerState<CrewDashboardScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    Future.microtask(() {
      ref.read(reportsProvider.notifier).fetchReports();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _handleStartWork(String reportId) async {
    try {
      await ref.read(reportsProvider.notifier).startWorkOrder(reportId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Status updated to In Progress. Maintenance underway.'),
            backgroundColor: AppColors.statusInProgress,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update status: $e'), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final reportsState = ref.watch(reportsProvider);
    final allReports = reportsState.reports;

    final activeReports = allReports
        .where((r) => r.status != 'Resolved' && r.status != 'Rejected')
        .toList();
    final resolvedReports = allReports
        .where((r) => r.status == 'Resolved')
        .toList();

    return Scaffold(
      backgroundColor: AppColors.dark,
      appBar: CivoraAppBar(
        subtitle: 'Field Operations & Work Orders',
        actions: [
          IconButton(
            icon: reportsState.isRefreshing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.copper),
                  )
                : const Icon(Icons.refresh, color: AppColors.gray, size: 20),
            tooltip: 'Refresh Assignments',
            onPressed: reportsState.isLoading || reportsState.isRefreshing
                ? null
                : () => ref.read(reportsProvider.notifier).fetchReports(silent: true),
          ),
        ],
      ),
      body: Column(
        children: [
          // Tab Header
          Container(
            color: AppColors.dark,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TabBar(
              controller: _tabController,
              indicatorColor: AppColors.copper,
              labelColor: AppColors.copper,
              unselectedLabelColor: AppColors.gray,
              labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              tabs: [
                Tab(
                  icon: const Icon(Icons.engineering_outlined, size: 18),
                  text: 'Active Jobs (${activeReports.length})',
                ),
                Tab(
                  icon: const Icon(Icons.task_alt, size: 18),
                  text: 'Completed (${resolvedReports.length})',
                ),
              ],
            ),
          ),
          const Divider(color: AppColors.border),

          if (reportsState.errorMessage != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: ErrorStateWidget(
                message: reportsState.errorMessage!,
                onRetry: () => ref.read(reportsProvider.notifier).fetchReports(),
              ),
            ),

          // Tab views
          Expanded(
            child: reportsState.isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.copper),
                  )
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildJobList(activeReports, isActive: true),
                      _buildJobList(resolvedReports, isActive: false),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildJobList(List<HazardReportModel> jobs, {required bool isActive}) {
    if (jobs.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isActive ? Icons.task_alt : Icons.history,
                size: 52,
                color: AppColors.low,
              ),
              const SizedBox(height: 14),
              Text(
                isActive ? "You're all caught up!" : 'No completed repairs yet',
                style: const TextStyle(color: AppColors.white, fontSize: 17, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Text(
                isActive
                    ? 'No active maintenance assignments pending in your queue.'
                    : 'Repairs you resolve will appear here with verified before/after proof.',
                style: const TextStyle(color: AppColors.gray, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.copper,
      backgroundColor: AppColors.charcoal,
      onRefresh: () => ref.read(reportsProvider.notifier).fetchReports(silent: true),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        itemCount: jobs.length,
        itemBuilder: (context, index) {
          final report = jobs[index];
          final isInProgress = report.status == 'In Progress';
          final isResolved = report.status == 'Resolved';

          return Container(
            margin: const EdgeInsets.only(bottom: 14),
            decoration: BoxDecoration(
              color: AppColors.charcoal,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Card Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'ORDER ID: ${report.reportId}',
                              style: const TextStyle(
                                color: AppColors.gray,
                                fontSize: 10,
                                fontFamily: 'monospace',
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              report.hazardCategory,
                              style: const TextStyle(
                                color: AppColors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SeverityBadge(
                        score: report.finalSeverityScore,
                        label: report.severityLabel,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Image and summary
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          width: 80,
                          height: 80,
                          color: AppColors.darkSurface,
                          child: SafeNetworkImage(
                            imageUrl: isResolved && report.resolutionImageUrl != null
                                ? report.resolutionImageUrl!
                                : report.imageUrl,
                            width: 80,
                            height: 80,
                            fit: BoxFit.cover,
                            fallbackText: 'Work photo',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined, color: AppColors.copper, size: 14),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    report.address ?? '${report.latitude.toStringAsFixed(4)}, ${report.longitude.toStringAsFixed(4)}',
                                    style: const TextStyle(color: AppColors.white, fontSize: 12),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            if (report.description != null && report.description!.isNotEmpty)
                              Text(
                                '"${report.description!}"',
                                style: const TextStyle(color: AppColors.grayLight, fontSize: 11),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            if (isResolved && report.resolutionNotes != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                'Repair note: ${report.resolutionNotes!}',
                                style: const TextStyle(color: AppColors.low, fontSize: 11),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: AppColors.border),
                  const SizedBox(height: 8),

                  // Footer actions
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      StatusBadge(status: report.status),
                      Row(
                        children: [
                          if (!isResolved && !isInProgress)
                            OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                visualDensity: VisualDensity.compact,
                              ),
                              onPressed: () => _handleStartWork(report.id),
                              child: const Text('Start Work', style: TextStyle(fontSize: 11)),
                            ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              visualDensity: VisualDensity.compact,
                            ),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ReportDetailsScreen(reportId: report.id),
                                ),
                              );
                            },
                            icon: Icon(
                              isResolved ? Icons.visibility_outlined : Icons.upload_file_outlined,
                              size: 14,
                            ),
                            label: Text(
                              isResolved ? 'View Record' : 'Proof & Resolve',
                              style: const TextStyle(fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
