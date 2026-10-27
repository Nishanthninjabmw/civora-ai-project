import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/utils/severity_helper.dart';
import '../../../shared/widgets/civora_app_bar.dart';
import '../../../shared/widgets/safe_network_image.dart';
import '../../../shared/widgets/error_state_widget.dart';
import '../../reports/models/hazard_report_model.dart';
import '../../reports/providers/reports_provider.dart';
import '../../reports/presentation/report_details_screen.dart';
import '../../reports/presentation/widgets/status_badge.dart';
import '../../reports/presentation/widgets/severity_badge.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _showMap = true;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(reportsProvider.notifier).fetchReports();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reportsState = ref.watch(reportsProvider);
    final reportsNotifier = ref.read(reportsProvider.notifier);
    final filteredReports = reportsState.filteredAndSortedReports;
    final stats = reportsState.stats;

    // Geolocated reports for city hazard map
    final mapReports = reportsState.reports
        .where((r) => r.latitude != 0.0 && r.longitude != 0.0)
        .toList();

    final defaultCenter = mapReports.isNotEmpty
        ? LatLng(mapReports.first.latitude, mapReports.first.longitude)
        : const LatLng(13.0827, 80.2707);

    return Scaffold(
      backgroundColor: AppColors.dark,
      appBar: CivoraAppBar(
        subtitle: 'Municipal Operations Center',
        actions: [
          IconButton(
            icon: reportsState.isRefreshing
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.copper),
                  )
                : const Icon(Icons.refresh, color: AppColors.gray, size: 20),
            tooltip: 'Refresh Operations Queue',
            onPressed: reportsState.isLoading || reportsState.isRefreshing
                ? null
                : () => reportsNotifier.fetchReports(silent: true),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.copper,
        backgroundColor: AppColors.charcoal,
        onRefresh: () => reportsNotifier.fetchReports(silent: true),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header title
              const Text(
                'Operations Center',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                'Real-time municipal hazard prioritization, AI validation, geospatial triage, and crew dispatch.',
                style: TextStyle(color: AppColors.gray, fontSize: 12),
              ),
              const SizedBox(height: 16),

              if (reportsState.errorMessage != null) ...[
                ErrorStateWidget(
                  message: reportsState.errorMessage!,
                  onRetry: () => reportsNotifier.fetchReports(),
                ),
                const SizedBox(height: 12),
              ],

              // Metric Cards (Grid of 4)
              _buildMetricsGrid(stats),
              const SizedBox(height: 16),

              // City Hazard Geospatial Map
              _buildGeospatialMap(mapReports, defaultCenter),
              const SizedBox(height: 16),

              // Priority-First Hazard Queue Section
              _buildPriorityQueueHeader(reportsState, reportsNotifier),
              const SizedBox(height: 12),

              // Filter & Search Controls
              _buildFiltersBar(reportsState, reportsNotifier),
              const SizedBox(height: 14),

              // Queue List
              if (reportsState.isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(
                    child: CircularProgressIndicator(color: AppColors.copper),
                  ),
                )
              else if (filteredReports.isEmpty)
                _buildEmptyQueueState()
              else
                ...filteredReports.map((report) => _buildQueueItem(report)),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricsGrid(Map<String, int> stats) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                title: 'Critical Priority',
                value: (stats['critical'] ?? 0).toString(),
                subtitle: 'Score ≥ 80',
                color: AppColors.critical,
                icon: Icons.whatshot_outlined,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricCard(
                title: 'Pending Dispatch',
                value: (stats['pending'] ?? 0).toString(),
                subtitle: 'Active Triage',
                color: AppColors.medium,
                icon: Icons.hourglass_top_outlined,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                title: 'Total Reports',
                value: (stats['total'] ?? 0).toString(),
                subtitle: 'Municipal Registry',
                color: const Color(0xFF60A5FA),
                icon: Icons.people_outline,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildMetricCard(
                title: 'Verified Resolved',
                value: (stats['resolved'] ?? 0).toString(),
                subtitle: 'Repairs Completed',
                color: AppColors.low,
                icon: Icons.verified_outlined,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.charcoal,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: color.withOpacity(0.4)),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.grayLight,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGeospatialMap(List<HazardReportModel> mapReports, LatLng center) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.charcoal,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.map_outlined, color: AppColors.copper, size: 18),
                    const SizedBox(width: 6),
                    const Text(
                      'City Hazard Geospatial Map',
                      style: TextStyle(color: AppColors.white, fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Text(
                      '${mapReports.length} incidents',
                      style: const TextStyle(color: AppColors.gray, fontSize: 11),
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      icon: Icon(
                        _showMap ? Icons.expand_less : Icons.expand_more,
                        size: 18,
                        color: AppColors.gray,
                      ),
                      visualDensity: VisualDensity.compact,
                      onPressed: () => setState(() => _showMap = !_showMap),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (_showMap)
            ClipRRect(
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
              child: SizedBox(
                height: 220,
                child: FlutterMap(
                  options: MapOptions(
                    initialCenter: center,
                    initialZoom: 12,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.civora.civora_app',
                    ),
                    MarkerLayer(
                      markers: mapReports.map((report) {
                        final color = SeverityHelper.getColor(report.severityLabel, report.finalSeverityScore);

                        return Marker(
                          point: LatLng(report.latitude, report.longitude),
                          width: 32,
                          height: 32,
                          child: GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ReportDetailsScreen(reportId: report.id),
                                ),
                              );
                            },
                            child: Container(
                              decoration: BoxDecoration(
                                color: color,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.5),
                                    blurRadius: 6,
                                  ),
                                ],
                              ),
                              child: Center(
                                child: Text(
                                  report.finalSeverityScore.toString(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPriorityQueueHeader(ReportsState state, ReportsNotifier notifier) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Priority-Ranked Hazard Queue',
              style: TextStyle(
                color: AppColors.white,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              '${state.filteredAndSortedReports.length} reports',
              style: const TextStyle(color: AppColors.gray, fontSize: 11, fontFamily: 'monospace'),
            ),
          ],
        ),
        const SizedBox(height: 2),
        const Text(
          'Ranked primarily by severity score (100 down to 0) with older reports winning ties.',
          style: TextStyle(color: AppColors.gray, fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildFiltersBar(ReportsState state, ReportsNotifier notifier) {
    return Column(
      children: [
        // Search Box
        TextField(
          controller: _searchController,
          style: const TextStyle(color: AppColors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: 'Search category, report ID, address...',
            prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.gray),
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 16, color: AppColors.gray),
                    onPressed: () {
                      _searchController.clear();
                      notifier.setSearchQuery('');
                    },
                  )
                : null,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          ),
          onChanged: (val) => notifier.setSearchQuery(val),
        ),
        const SizedBox(height: 10),

        // Filter Dropdowns Row
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              // Sort Selector
              _buildDropdownFilter(
                label: 'Sort: ',
                value: state.sortBy,
                items: const [
                  {'value': 'SEVERITY_DESC', 'label': 'Severity: High to Low (Priority)'},
                  {'value': 'SEVERITY_ASC', 'label': 'Severity: Low to High'},
                  {'value': 'NEWEST', 'label': 'Newest Submitted'},
                  {'value': 'OLDEST', 'label': 'Oldest Submitted'},
                ],
                onChanged: (val) => notifier.setSortBy(val!),
              ),
              const SizedBox(width: 8),

              // Status Filter
              _buildDropdownFilter(
                label: 'Status: ',
                value: state.statusFilter,
                items: const [
                  {'value': 'UNRESOLVED', 'label': 'Unresolved (Active Queue)'},
                  {'value': 'ALL', 'label': 'All Statuses'},
                  {'value': 'Submitted', 'label': 'Submitted'},
                  {'value': 'Under Review', 'label': 'Under Review'},
                  {'value': 'Assigned', 'label': 'Assigned'},
                  {'value': 'In Progress', 'label': 'In Progress'},
                  {'value': 'Resolved', 'label': 'Resolved'},
                ],
                onChanged: (val) => notifier.setStatusFilter(val!),
              ),
              const SizedBox(width: 8),

              // Severity Filter
              _buildDropdownFilter(
                label: 'Severity: ',
                value: state.severityFilter,
                items: const [
                  {'value': 'ALL', 'label': 'All Severity'},
                  {'value': 'CRITICAL_HIGH', 'label': 'Critical & High'},
                  {'value': 'Critical', 'label': 'Critical (≥ 80)'},
                  {'value': 'High', 'label': 'High (60-79)'},
                  {'value': 'Medium', 'label': 'Medium (35-59)'},
                  {'value': 'Low', 'label': 'Low (< 35)'},
                ],
                onChanged: (val) => notifier.setSeverityFilter(val!),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownFilter({
    required String label,
    required String value,
    required List<Map<String, String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.charcoal,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isDense: true,
          dropdownColor: AppColors.charcoal,
          style: const TextStyle(color: AppColors.white, fontSize: 11),
          items: items
              .map((i) => DropdownMenuItem(
                    value: i['value'],
                    child: Text(i['label']!),
                  ))
              .toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildEmptyQueueState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      decoration: BoxDecoration(
        color: AppColors.charcoal,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Center(
        child: Column(
          children: const [
            Icon(Icons.search_off, size: 36, color: AppColors.gray),
            SizedBox(height: 10),
            Text('No hazard reports matching criteria found.', style: TextStyle(color: AppColors.gray, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildQueueItem(HazardReportModel report) {
    final isCritical = report.severityLabel == 'Critical';
    final isResolved = report.status == 'Resolved';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isCritical && !isResolved ? const Color(0xFF261215) : AppColors.charcoal,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isCritical && !isResolved
              ? AppColors.critical.withOpacity(0.5)
              : AppColors.border,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ReportDetailsScreen(reportId: report.id),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Thumbnail
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: 72,
                    height: 72,
                    color: AppColors.darkSurface,
                    child: SafeNetworkImage(
                      imageUrl: report.imageUrl,
                      width: 72,
                      height: 72,
                      fit: BoxFit.cover,
                      fallbackText: 'No photo',
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              report.hazardCategory,
                              style: const TextStyle(
                                color: AppColors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          SeverityBadge(
                            score: report.finalSeverityScore,
                            label: report.severityLabel,
                            fontSize: 10,
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        report.reportId,
                        style: const TextStyle(color: AppColors.gray, fontSize: 10, fontFamily: 'monospace'),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        report.description != null && report.description!.isNotEmpty
                            ? report.description!
                            : (report.address ?? 'No additional description provided'),
                        style: const TextStyle(color: AppColors.grayLight, fontSize: 11),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          StatusBadge(status: report.status, fontSize: 10),
                          if (report.assignedCrewName != null)
                            Text(
                              'Crew: ${report.assignedCrewName}',
                              style: const TextStyle(color: AppColors.copper, fontSize: 10, fontWeight: FontWeight.w600),
                            )
                          else
                            const Text(
                              'Unassigned',
                              style: TextStyle(color: AppColors.gray, fontSize: 10, fontStyle: FontStyle.italic),
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
      ),
    );
  }
}
