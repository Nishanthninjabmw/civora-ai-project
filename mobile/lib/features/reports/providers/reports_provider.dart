import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../models/hazard_report_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/models/user_model.dart';

class ReportsState {
  final bool isLoading;
  final bool isRefreshing;
  final List<HazardReportModel> reports;
  final String? errorMessage;
  final Map<String, int> stats;
  final List<Map<String, dynamic>> crewMembers;

  // Filter & Search states
  final String searchQuery;
  final String statusFilter;
  final String severityFilter;
  final String categoryFilter;
  final String crewFilter;
  final String sortBy;

  const ReportsState({
    this.isLoading = false,
    this.isRefreshing = false,
    this.reports = const [],
    this.errorMessage,
    this.stats = const {'total': 0, 'pending': 0, 'critical': 0, 'resolved': 0},
    this.crewMembers = const [],
    this.searchQuery = '',
    this.statusFilter = 'UNRESOLVED',
    this.severityFilter = 'ALL',
    this.categoryFilter = 'ALL',
    this.crewFilter = 'ALL',
    this.sortBy = 'SEVERITY_DESC',
  });

  /// Priority-First Filtered & Sorted Reports computation
  List<HazardReportModel> get filteredAndSortedReports {
    var result = List<HazardReportModel>.from(reports);

    // Status filter
    if (statusFilter == 'UNRESOLVED') {
      result = result
          .where((r) =>
              r.status != 'Resolved' &&
              r.status != 'Rejected' &&
              r.status != 'Duplicate')
          .toList();
    } else if (statusFilter != 'ALL') {
      result = result.where((r) => r.status == statusFilter).toList();
    }

    // Severity filter
    if (severityFilter == 'CRITICAL_HIGH') {
      result = result
          .where((r) =>
              r.severityLabel == 'Critical' || r.severityLabel == 'High')
          .toList();
    } else if (severityFilter != 'ALL') {
      result = result.where((r) => r.severityLabel == severityFilter).toList();
    }

    // Category filter
    if (categoryFilter != 'ALL') {
      result = result.where((r) => r.hazardCategory == categoryFilter).toList();
    }

    // Crew filter
    if (crewFilter == 'UNASSIGNED') {
      result = result.where((r) => r.assignedCrewId == null).toList();
    } else if (crewFilter == 'ASSIGNED') {
      result = result.where((r) => r.assignedCrewId != null).toList();
    } else if (crewFilter != 'ALL') {
      result = result.where((r) => r.assignedCrewId == crewFilter).toList();
    }

    // Search query
    if (searchQuery.trim().isNotEmpty) {
      final q = searchQuery.toLowerCase().trim();
      result = result.where((r) {
        final catMatch = r.hazardCategory.toLowerCase().contains(q);
        final idMatch = r.reportId.toLowerCase().contains(q);
        final descMatch = (r.description ?? '').toLowerCase().contains(q);
        final addrMatch = (r.address ?? '').toLowerCase().contains(q);
        return catMatch || idMatch || descMatch || addrMatch;
      }).toList();
    }

    // PRIORITY-FIRST SORTING ENGINE
    // Default: Highest severity score first (100 -> 0)
    // Secondary deterministic tie-breaker: oldest report first (createdAt ascending)
    result.sort((a, b) {
      if (sortBy == 'SEVERITY_DESC') {
        if (b.finalSeverityScore != a.finalSeverityScore) {
          return b.finalSeverityScore.compareTo(a.finalSeverityScore);
        }
        return a.createdAt.compareTo(b.createdAt);
      } else if (sortBy == 'SEVERITY_ASC') {
        if (a.finalSeverityScore != b.finalSeverityScore) {
          return a.finalSeverityScore.compareTo(b.finalSeverityScore);
        }
        return a.createdAt.compareTo(b.createdAt);
      } else if (sortBy == 'NEWEST') {
        return b.createdAt.compareTo(a.createdAt);
      } else if (sortBy == 'OLDEST') {
        return a.createdAt.compareTo(b.createdAt);
      }
      return 0;
    });

    return result;
  }

  /// Unique categories found in current reports
  List<String> get availableCategories {
    final set = <String>{};
    for (final r in reports) {
      if (r.hazardCategory.isNotEmpty) set.add(r.hazardCategory);
    }
    return set.toList();
  }

  ReportsState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    List<HazardReportModel>? reports,
    String? errorMessage,
    Map<String, int>? stats,
    List<Map<String, dynamic>>? crewMembers,
    String? searchQuery,
    String? statusFilter,
    String? severityFilter,
    String? categoryFilter,
    String? crewFilter,
    String? sortBy,
    bool clearError = false,
  }) {
    return ReportsState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      reports: reports ?? this.reports,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      stats: stats ?? this.stats,
      crewMembers: crewMembers ?? this.crewMembers,
      searchQuery: searchQuery ?? this.searchQuery,
      statusFilter: statusFilter ?? this.statusFilter,
      severityFilter: severityFilter ?? this.severityFilter,
      categoryFilter: categoryFilter ?? this.categoryFilter,
      crewFilter: crewFilter ?? this.crewFilter,
      sortBy: sortBy ?? this.sortBy,
    );
  }
}

class ReportsNotifier extends Notifier<ReportsState> {
  @override
  ReportsState build() {
    return const ReportsState();
  }

  List<HazardReportModel> _deduplicate(List<HazardReportModel> list) {
    final seen = <String>{};
    final output = <HazardReportModel>[];
    for (final r in list) {
      final key = r.id.isNotEmpty ? r.id : r.reportId;
      if (!seen.contains(key)) {
        seen.add(key);
        output.add(r);
      }
    }
    return output;
  }

  Future<void> fetchReports({bool silent = false}) async {
    final auth = ref.read(authProvider);
    if (!auth.isAuthenticated) return;

    if (!silent) {
      state = state.copyWith(isLoading: true, clearError: true);
    } else {
      state = state.copyWith(isRefreshing: true, clearError: true);
    }

    try {
      final role = auth.user?.role;

      // 1. Fetch reports
      final reportsRes = await apiClient.get(ApiConstants.reports);
      final List<HazardReportModel> loadedReports = [];

      if (reportsRes is List) {
        for (final item in reportsRes) {
          if (item is Map<String, dynamic>) {
            loadedReports.add(HazardReportModel.fromJson(item));
          }
        }
      }

      Map<String, int> loadedStats = state.stats;
      List<Map<String, dynamic>> loadedCrew = state.crewMembers;

      // 2. If Admin, fetch dashboard stats and crew list in parallel
      if (role == UserRole.admin) {
        try {
          final statsRes = await apiClient.get(ApiConstants.reportStats);
          if (statsRes is Map<String, dynamic>) {
            loadedStats = {
              'total': (statsRes['total'] as num?)?.toInt() ?? 0,
              'pending': (statsRes['pending'] as num?)?.toInt() ?? 0,
              'critical': (statsRes['critical'] as num?)?.toInt() ?? 0,
              'resolved': (statsRes['resolved'] as num?)?.toInt() ?? 0,
            };
          }
        } catch (_) {}

        try {
          final crewRes = await apiClient.get(ApiConstants.crew);
          if (crewRes is List) {
            loadedCrew = crewRes
                .whereType<Map<String, dynamic>>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
          }
        } catch (_) {}
      }

      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        reports: _deduplicate(loadedReports),
        stats: loadedStats,
        crewMembers: loadedCrew,
        clearError: true,
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        errorMessage: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        errorMessage: 'Failed to fetch reports: ${e.toString()}',
      );
    }
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void setStatusFilter(String status) {
    state = state.copyWith(statusFilter: status);
  }

  void setSeverityFilter(String severity) {
    state = state.copyWith(severityFilter: severity);
  }

  void setCategoryFilter(String category) {
    state = state.copyWith(categoryFilter: category);
  }

  void setCrewFilter(String crew) {
    state = state.copyWith(crewFilter: crew);
  }

  void setSortBy(String sort) {
    state = state.copyWith(sortBy: sort);
  }

  /// Submit a new citizen hazard report with photo and coordinates
  Future<HazardReportModel> submitHazardReport({
    required File imageFile,
    required String hazardCategory,
    String? description,
    required double latitude,
    required double longitude,
    String? address,
    double? accuracy,
  }) async {
    final fields = <String, dynamic>{
      'hazardCategory': hazardCategory,
      'coordinates': '[$longitude, $latitude]',
      if (description != null && description.isNotEmpty)
        'description': description,
      if (address != null && address.isNotEmpty) 'address': address,
      if (accuracy != null) 'accuracy': accuracy.toString(),
    };

    final response = await apiClient.uploadMultipart(
      ApiConstants.reports,
      fields: fields,
      file: imageFile,
      fileField: 'image',
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(message: 'Invalid response from report creation API.');
    }

    final newReport = HazardReportModel.fromJson(response);

    // Refresh feed immediately
    fetchReports(silent: true);

    return newReport;
  }

  /// Admin assign maintenance crew
  Future<HazardReportModel> assignCrew({
    required String reportId,
    required String crewId,
  }) async {
    final response = await apiClient.put(
      ApiConstants.reportStatus(reportId),
      data: {
        'assignedCrew': crewId,
        'status': 'Assigned',
        'note': 'Report assigned to field maintenance crew.',
      },
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(message: 'Failed to assign maintenance crew.');
    }

    final updated = HazardReportModel.fromJson(response);
    fetchReports(silent: true);
    return updated;
  }

  /// Start work order (Crew)
  Future<HazardReportModel> startWorkOrder(String reportId) async {
    final response = await apiClient.put(
      ApiConstants.reportStatus(reportId),
      data: {
        'status': 'In Progress',
        'note': 'Field crew arrived on site; maintenance underway.',
      },
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(message: 'Failed to update work status.');
    }

    final updated = HazardReportModel.fromJson(response);
    fetchReports(silent: true);
    return updated;
  }

  /// Resolve report with mandatory after-repair photograph and resolution notes
  Future<HazardReportModel> resolveReport({
    required String reportId,
    required File resolutionPhoto,
    required String resolutionNotes,
  }) async {
    final fields = <String, dynamic>{
      'status': 'Resolved',
      'note': resolutionNotes.trim(),
    };

    final response = await apiClient.updateReportStatusMultipart(
      ApiConstants.reportStatus(reportId),
      fields: fields,
      resolutionFile: resolutionPhoto,
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(message: 'Failed to submit repair resolution proof.');
    }

    final updated = HazardReportModel.fromJson(response);
    fetchReports(silent: true);
    return updated;
  }

  /// Admin status or severity override
  Future<HazardReportModel> adminUpdateStatus({
    required String reportId,
    required String status,
    String? note,
    String? assignedCrewId,
    int? finalSeverityScore,
    String? severityLabel,
  }) async {
    final data = <String, dynamic>{
      'status': status,
    };
    if (note != null && note.isNotEmpty) data['note'] = note;
    if (assignedCrewId != null && assignedCrewId.isNotEmpty) {
      data['assignedCrew'] = assignedCrewId;
    }
    if (finalSeverityScore != null) {
      data['finalSeverityScore'] = finalSeverityScore;
    }
    if (severityLabel != null) {
      data['severityLabel'] = severityLabel;
    }

    final response = await apiClient.put(
      ApiConstants.reportStatus(reportId),
      data: data,
    );

    if (response is! Map<String, dynamic>) {
      throw ApiException(message: 'Failed to update report status.');
    }

    final updated = HazardReportModel.fromJson(response);
    fetchReports(silent: true);
    return updated;
  }
}

final reportsProvider = NotifierProvider<ReportsNotifier, ReportsState>(ReportsNotifier.new);
