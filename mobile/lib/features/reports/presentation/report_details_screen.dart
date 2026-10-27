import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../shared/widgets/civora_app_bar.dart';
import '../../../shared/widgets/safe_network_image.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/models/user_model.dart';
import '../models/hazard_report_model.dart';
import '../providers/reports_provider.dart';
import 'widgets/status_badge.dart';
import 'widgets/severity_badge.dart';
import 'widgets/before_after_evidence.dart';
import 'widgets/audit_trail_timeline.dart';
import 'widgets/ai_detection_overlay.dart';

class ReportDetailsScreen extends ConsumerStatefulWidget {
  final String reportId;

  const ReportDetailsScreen({
    super.key,
    required this.reportId,
  });

  @override
  ConsumerState<ReportDetailsScreen> createState() => _ReportDetailsScreenState();
}

class _ReportDetailsScreenState extends ConsumerState<ReportDetailsScreen> {
  HazardReportModel? _report;
  bool _isLoading = true;
  String? _errorMessage;
  int? _errorStatusCode;

  // Admin / Crew action form states
  String _selectedStatus = '';
  String? _selectedCrewId;
  final TextEditingController _noteController = TextEditingController();
  File? _resolutionImageFile;
  bool _isUpdating = false;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _fetchReportDetails();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _fetchReportDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _errorStatusCode = null;
    });

    try {
      final res = await apiClient.get(ApiConstants.reportById(widget.reportId));
      if (res is Map<String, dynamic>) {
        final parsed = HazardReportModel.fromJson(res);
        setState(() {
          _report = parsed;
          _selectedStatus = parsed.status;
          _selectedCrewId = parsed.assignedCrewId;
          _isLoading = false;
        });
      } else {
        throw ApiException(message: 'Invalid report data received.');
      }
    } on ApiException catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.message;
        _errorStatusCode = e.statusCode;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to load report: ${e.toString()}';
      });
    }
  }

  Future<void> _pickResolutionImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1600,
        maxHeight: 1600,
      );
      if (picked != null) {
        setState(() {
          _resolutionImageFile = File(picked.path);
        });
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to select image: $e')),
      );
    }
  }

  Future<void> _submitStatusUpdate() async {
    final user = ref.read(authProvider).user;
    if (_report == null || user == null) return;

    // Crew resolution validation
    if (user.role == UserRole.crew && _selectedStatus == 'Resolved') {
      if (_resolutionImageFile == null && _report!.resolutionImageUrl == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('After-repair photograph required to mark report as Resolved.'),
            backgroundColor: AppColors.critical,
          ),
        );
        return;
      }
      if (_noteController.text.trim().isEmpty && (_report!.resolutionNotes == null || _report!.resolutionNotes!.isEmpty)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Resolution notes required describing repair work performed.'),
            backgroundColor: AppColors.critical,
          ),
        );
        return;
      }
    }

    setState(() => _isUpdating = true);

    try {
      if (user.role == UserRole.crew && _selectedStatus == 'Resolved' && _resolutionImageFile != null) {
        final updated = await ref.read(reportsProvider.notifier).resolveReport(
              reportId: _report!.id,
              resolutionPhoto: _resolutionImageFile!,
              resolutionNotes: _noteController.text.trim(),
            );
        setState(() {
          _report = updated;
          _resolutionImageFile = null;
          _noteController.clear();
        });
      } else {
        final updated = await ref.read(reportsProvider.notifier).adminUpdateStatus(
              reportId: _report!.id,
              status: _selectedStatus,
              note: _noteController.text.trim().isNotEmpty ? _noteController.text.trim() : null,
              assignedCrewId: _selectedCrewId,
            );
        setState(() {
          _report = updated;
          _noteController.clear();
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Report updated successfully.'),
            backgroundColor: AppColors.statusResolved,
          ),
        );
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: AppColors.critical),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Update failed: $e'), backgroundColor: AppColors.critical),
        );
      }
    } finally {
      setState(() => _isUpdating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final crewList = ref.watch(reportsProvider).crewMembers;

    return Scaffold(
      backgroundColor: AppColors.dark,
      appBar: const CivoraAppBar(
        subtitle: 'Hazard Incident Details',
        showBackButton: true,
      ),
      body: _buildBody(user, crewList),
    );
  }

  Widget _buildBody(UserModel? user, List<Map<String, dynamic>> crewList) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.copper),
      );
    }

    if (_errorMessage != null || _report == null) {
      return _buildErrorState();
    }

    final report = _report!;

    return RefreshIndicator(
      color: AppColors.copper,
      backgroundColor: AppColors.charcoal,
      onRefresh: _fetchReportDetails,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Bar: Category, Status, Priority Badge
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.hazardCategory,
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Incident Record: ${report.reportId}',
                        style: const TextStyle(
                          color: AppColors.gray,
                          fontSize: 11,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    StatusBadge(status: report.status, fontSize: 12),
                    const SizedBox(height: 6),
                    SeverityBadge(
                      score: report.finalSeverityScore,
                      label: report.severityLabel,
                      fontSize: 12,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Before & After Evidence (When Resolved)
            if (report.resolutionImageUrl != null && report.resolutionImageUrl!.isNotEmpty) ...[
              BeforeAfterEvidence(
                beforeImageUrl: report.imageUrl,
                afterImageUrl: report.resolutionImageUrl!,
                reportedAt: report.createdAt,
                resolvedAt: report.resolvedAt,
                resolutionNotes: report.resolutionNotes,
                resolvedByName: report.resolvedByName,
              ),
              const SizedBox(height: 16),
            ] else ...[
              // Original Citizen Photo
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  height: 240,
                  width: double.infinity,
                  color: AppColors.charcoal,
                  child: SafeNetworkImage(
                    imageUrl: report.imageUrl,
                    height: 240,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    fallbackText: 'Original citizen hazard photograph',
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Citizen Hazard Description Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.charcoal,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Hazard Description',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    report.description != null && report.description!.isNotEmpty
                        ? report.description!
                        : 'No additional details provided by citizen.',
                    style: const TextStyle(
                      color: AppColors.grayLight,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                  if (report.citizenName != null) ...[
                    const SizedBox(height: 10),
                    const Divider(color: AppColors.border),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.person_outline, size: 14, color: AppColors.copper),
                        const SizedBox(width: 6),
                        Text(
                          'Reported by: ${report.citizenName!}',
                          style: const TextStyle(color: AppColors.gray, fontSize: 11),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // AI Inference & Severity Rationale Card
            AiDetectionOverlay(report: report),
            const SizedBox(height: 16),

            // Location & Interactive Map Card
            _buildMapCard(report),
            const SizedBox(height: 16),

            // Role-specific Action Panels
            if (user?.role == UserRole.admin || user?.role == UserRole.crew) ...[
              _buildActionPanel(user!, crewList),
              const SizedBox(height: 16),
            ],

            // Assigned Maintenance Unit Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.charcoal,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Assigned Maintenance Unit',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (report.assignedCrewName != null)
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AppColors.copper.withOpacity(0.2),
                          foregroundColor: AppColors.copper,
                          radius: 18,
                          child: Text(
                            report.assignedCrewName!.substring(0, 1).toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              report.assignedCrewName!,
                              style: const TextStyle(
                                color: AppColors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              report.assignedCrewEmail ?? 'Municipal Field Crew',
                              style: const TextStyle(color: AppColors.gray, fontSize: 11),
                            ),
                          ],
                        ),
                      ],
                    )
                  else
                    const Text(
                      'No maintenance unit assigned yet.',
                      style: TextStyle(color: AppColors.gray, fontStyle: FontStyle.italic, fontSize: 12),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Audit Trail Timeline Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.charcoal,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Audit Trail & Lifecycle History',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  AuditTrailTimeline(history: report.statusHistory),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildMapCard(HazardReportModel report) {
    final hasCoords = report.latitude != 0.0 && report.longitude != 0.0;
    final center = hasCoords ? LatLng(report.latitude, report.longitude) : const LatLng(13.0827, 80.2707);

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
                  children: const [
                    Icon(Icons.location_on_outlined, color: AppColors.copper, size: 18),
                    SizedBox(width: 6),
                    Text(
                      'Incident Coordinates',
                      style: TextStyle(color: AppColors.white, fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                  ],
                ),
                Text(
                  '${report.latitude.toStringAsFixed(5)}, ${report.longitude.toStringAsFixed(5)}',
                  style: const TextStyle(color: AppColors.gray, fontFamily: 'monospace', fontSize: 11),
                ),
              ],
            ),
          ),
          if (report.address != null && report.address!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 14, right: 14, bottom: 10),
              child: Text(
                report.address!,
                style: const TextStyle(color: AppColors.grayLight, fontSize: 12),
              ),
            ),
          ClipRRect(
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(16),
            ),
            child: SizedBox(
              height: 200,
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: center,
                  initialZoom: 15,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.civora.civora_app',
                  ),
                  if (hasCoords)
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: center,
                          width: 40,
                          height: 40,
                          child: const Icon(
                            Icons.location_pin,
                            color: AppColors.copper,
                            size: 38,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionPanel(UserModel user, List<Map<String, dynamic>> crewList) {
    final isAdmin = user.role == UserRole.admin;
    final isCrew = user.role == UserRole.crew;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.charcoal,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.copper.withOpacity(0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.edit_note, color: AppColors.copper, size: 20),
              const SizedBox(width: 8),
              Text(
                isAdmin ? 'Admin Dispatch & Status Override' : 'Field Crew Work & Proof Upload',
                style: const TextStyle(
                  color: AppColors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Admin: Crew assignment dropdown
          if (isAdmin) ...[
            const Text('Assign Maintenance Crew', style: TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.darkSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedCrewId,
                  dropdownColor: AppColors.charcoal,
                  hint: const Text('-- Unassigned --', style: TextStyle(color: AppColors.gray, fontSize: 12)),
                  items: [
                    const DropdownMenuItem<String>(
                      value: null,
                      child: Text('-- Unassigned --', style: TextStyle(color: AppColors.gray, fontSize: 12)),
                    ),
                    ...crewList.map((crew) => DropdownMenuItem<String>(
                          value: crew['_id']?.toString() ?? crew['id']?.toString(),
                          child: Text(
                            '${crew['name']} (${crew['email']})',
                            style: const TextStyle(color: AppColors.white, fontSize: 12),
                          ),
                        )),
                  ],
                  onChanged: (val) {
                    setState(() => _selectedCrewId = val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Status selector
          const Text('Update Status', style: TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.darkSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: _selectedStatus,
                dropdownColor: AppColors.charcoal,
                items: (isAdmin
                        ? [
                            'Submitted',
                            'Under Review',
                            'Approved',
                            'Assigned',
                            'In Progress',
                            'Resolved',
                            'Rejected',
                            'Duplicate'
                          ]
                        : ['Assigned', 'In Progress', 'Resolved'])
                    .map((status) => DropdownMenuItem(
                          value: status,
                          child: Text(
                            status,
                            style: const TextStyle(color: AppColors.white, fontSize: 12),
                          ),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedStatus = val);
                },
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Crew: After-repair photograph upload (Mandatory when resolving)
          if (isCrew && _selectedStatus == 'Resolved') ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.darkSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.copper.withOpacity(0.5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'After-Repair Photograph (Mandatory Proof)',
                    style: TextStyle(
                      color: AppColors.copper,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_resolutionImageFile != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        _resolutionImageFile!,
                        height: 120,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _pickResolutionImage(ImageSource.camera),
                          icon: const Icon(Icons.camera_alt, size: 14),
                          label: const Text('Camera', style: TextStyle(fontSize: 11)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _pickResolutionImage(ImageSource.gallery),
                          icon: const Icon(Icons.photo_library, size: 14),
                          label: const Text('Gallery', style: TextStyle(fontSize: 11)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Note Field
          Text(
            _selectedStatus == 'Resolved' ? 'Resolution Work Notes (Mandatory)' : 'Work Progress / Audit Note',
            style: const TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _noteController,
            maxLines: 2,
            style: const TextStyle(color: AppColors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: _selectedStatus == 'Resolved'
                  ? 'Describe repair completed: materials used, road compacted, safety restored...'
                  : 'Add status update note...',
            ),
          ),
          const SizedBox(height: 16),

          // Submit action
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isUpdating ? null : _submitStatusUpdate,
              child: _isUpdating
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(color: AppColors.dark, strokeWidth: 2),
                        ),
                        SizedBox(width: 8),
                        Text('Saving...'),
                      ],
                    )
                  : Text(_selectedStatus == 'Resolved' ? 'Upload Proof & Mark Resolved' : 'Save Status Update'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    final isForbidden = _errorStatusCode == 403;
    final isNotFound = _errorStatusCode == 404;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isForbidden ? Icons.lock_outline : Icons.error_outline,
              size: 56,
              color: isForbidden ? AppColors.medium : AppColors.critical,
            ),
            const SizedBox(height: 16),
            Text(
              isForbidden
                  ? 'Access Restricted'
                  : isNotFound
                      ? 'Hazard Report Not Found'
                      : 'Unable to Load Report',
              style: const TextStyle(
                color: AppColors.white,
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? 'The requested hazard report does not exist or you lack permission to view it.',
              style: const TextStyle(color: AppColors.gray, fontSize: 13, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _fetchReportDetails,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}
