import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../shared/widgets/civora_app_bar.dart';
import '../../reports/providers/reports_provider.dart';
import '../../reports/presentation/report_details_screen.dart';

class ReportHazardScreen extends ConsumerStatefulWidget {
  const ReportHazardScreen({super.key});

  @override
  ConsumerState<ReportHazardScreen> createState() => _ReportHazardScreenState();
}

class _ReportHazardScreenState extends ConsumerState<ReportHazardScreen> {
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _picker = ImagePicker();

  File? _imageFile;
  String _selectedCategory = 'Pothole';
  final TextEditingController _descController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();

  // Coordinates & Map state
  LatLng? _selectedLocation;
  double? _gpsAccuracy;
  String? _locationSource;
  bool _isGpsLoading = false;
  String? _locationError;

  final MapController _mapController = MapController();
  final LatLng _defaultMapCenter = const LatLng(13.0827, 80.2707); // Default city coordinates

  bool _isSubmitting = false;
  String? _submitError;

  final List<Map<String, String>> _categories = const [
    {'value': 'Pothole', 'label': 'Pothole / Road Damage'},
    {'value': 'Garbage', 'label': 'Illegal Dumping / Garbage'},
    {'value': 'Broken Streetlight', 'label': 'Broken Streetlight'},
    {'value': 'Fallen Tree', 'label': 'Fallen Tree / Obstruction'},
    {'value': 'Waterlogging', 'label': 'Waterlogging / Flooding'},
    {'value': 'Other', 'label': 'Other Civic Hazard'},
  ];

  @override
  void dispose() {
    _descController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1600,
        maxHeight: 1600,
      );
      if (picked != null) {
        final file = File(picked.path);
        final length = await file.length();
        if (length > 5 * 1024 * 1024) {
          setState(() {
            _submitError = 'Image file is too large. Maximum allowed size is 5MB.';
          });
          return;
        }
        setState(() {
          _imageFile = file;
          _submitError = null;
        });
      }
    } catch (e) {
      setState(() {
        _submitError = 'Failed to capture or select image: $e';
      });
    }
  }

  Future<void> _requestGPSLocation() async {
    setState(() {
      _isGpsLoading = true;
      _locationError = null;
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _isGpsLoading = false;
          _locationError = 'Location services are disabled on this device. Please tap on the map to place a pin.';
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _isGpsLoading = false;
            _locationError = 'Location permission denied. Please tap directly on the map to pin the hazard.';
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _isGpsLoading = false;
          _locationError = 'Location permissions permanently denied. Please tap directly on the map below.';
        });
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      final newLoc = LatLng(position.latitude, position.longitude);
      setState(() {
        _selectedLocation = newLoc;
        _gpsAccuracy = position.accuracy;
        _locationSource = 'GPS Sensor';
        _isGpsLoading = false;
      });

      _mapController.move(newLoc, 15);
    } catch (e) {
      setState(() {
        _isGpsLoading = false;
        _locationError = 'GPS acquisition timed out. Please tap directly on the map to pin location.';
      });
    }
  }

  void _onMapTap(TapPosition tapPosition, LatLng point) {
    setState(() {
      _selectedLocation = point;
      _gpsAccuracy = null;
      _locationSource = 'Manual Map Pin';
      _locationError = null;
    });
  }

  Future<void> _handleSubmit() async {
    if (_imageFile == null) {
      setState(() => _submitError = 'Please upload or capture a hazard photo.');
      return;
    }
    if (_selectedLocation == null) {
      setState(() => _submitError = 'Please provide location coordinates via GPS or by tapping on the map.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _submitError = null;
    });

    try {
      final newReport = await ref.read(reportsProvider.notifier).submitHazardReport(
            imageFile: _imageFile!,
            hazardCategory: _selectedCategory,
            description: _descController.text.trim(),
            latitude: _selectedLocation!.latitude,
            longitude: _selectedLocation!.longitude,
            address: _addressController.text.trim().isNotEmpty ? _addressController.text.trim() : null,
            accuracy: _gpsAccuracy,
          );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Hazard report created successfully! Opening details...'),
            backgroundColor: AppColors.statusResolved,
          ),
        );

        // Replace route with Report Details using returned ID
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ReportDetailsScreen(reportId: newReport.id),
          ),
        );
      }
    } on ApiException catch (e) {
      setState(() {
        _isSubmitting = false;
        _submitError = e.message;
      });
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _submitError = 'Submission failed: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dark,
      appBar: const CivoraAppBar(
        subtitle: 'New Infrastructure Report',
        showBackButton: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Report a Civic Hazard',
                  style: TextStyle(
                    color: AppColors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Submit infrastructure defects for municipal evaluation and crew dispatch.',
                  style: TextStyle(color: AppColors.gray, fontSize: 12),
                ),
                const SizedBox(height: 20),

                // Section 1: Photograph Capture
                _buildPhotoCard(),
                const SizedBox(height: 16),

                // Section 2: Location Tagging & Map
                _buildLocationCard(),
                const SizedBox(height: 16),

                // Section 3: Hazard Details
                _buildDetailsCard(),
                const SizedBox(height: 16),

                // Submit Error Banner
                if (_submitError != null) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.criticalBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.critical.withOpacity(0.5)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error_outline, color: AppColors.critical, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _submitError!,
                            style: const TextStyle(color: Color(0xFFFECACA), fontSize: 12, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Submit Button
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isSubmitting
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: AppColors.dark, strokeWidth: 2),
                            ),
                            SizedBox(width: 10),
                            Text('Uploading Hazard & AI Severity...'),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.cloud_upload_outlined, size: 20),
                            SizedBox(width: 8),
                            Text('Submit Hazard Report', style: TextStyle(fontSize: 15)),
                          ],
                        ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoCard() {
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
              Icon(Icons.camera_alt_outlined, color: AppColors.copper, size: 20),
              SizedBox(width: 8),
              Text(
                '1. Hazard Photo',
                style: TextStyle(color: AppColors.white, fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_imageFile != null) ...[
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(
                    _imageFile!,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () => setState(() => _imageFile = null),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.85),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.delete_outline, color: Colors.white, size: 14),
                            SizedBox(width: 4),
                            Text('Change Photo', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            Container(
              height: 140,
              decoration: BoxDecoration(
                color: AppColors.darkSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border, style: BorderStyle.solid),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_a_photo_outlined, color: AppColors.copper, size: 36),
                    const SizedBox(height: 8),
                    const Text('Capture or Select Photo', style: TextStyle(color: AppColors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    const Text('JPEG, PNG, WebP (Max: 5MB)', style: TextStyle(color: AppColors.gray, fontSize: 11)),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt, size: 16),
                  label: const Text('Take Photo'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library, size: 16),
                  label: const Text('From Gallery'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLocationCard() {
    final center = _selectedLocation ?? _defaultMapCenter;

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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.location_on_outlined, color: AppColors.copper, size: 20),
                  SizedBox(width: 8),
                  Text(
                    '2. Location Tagging',
                    style: TextStyle(color: AppColors.white, fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  visualDensity: VisualDensity.compact,
                ),
                onPressed: _isGpsLoading ? null : _requestGPSLocation,
                icon: _isGpsLoading
                    ? const SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.copper),
                      )
                    : const Icon(Icons.my_location, size: 14, color: AppColors.copper),
                label: Text(
                  _isGpsLoading ? 'Detecting...' : 'Use My GPS',
                  style: const TextStyle(fontSize: 11),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Use device GPS or tap directly on the map below to position the hazard pin:',
            style: TextStyle(color: AppColors.gray, fontSize: 11),
          ),
          const SizedBox(height: 12),

          // Map
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              height: 200,
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: center,
                  initialZoom: 14,
                  onTap: _onMapTap,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.civora.civora_app',
                  ),
                  if (_selectedLocation != null)
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: _selectedLocation!,
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
          const SizedBox(height: 10),

          // Location status
          if (_selectedLocation != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.lowBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.low.withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: AppColors.low, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${_locationSource ?? 'Selected'}: ${_selectedLocation!.latitude.toStringAsFixed(5)}, ${_selectedLocation!.longitude.toStringAsFixed(5)}'
                      '${_gpsAccuracy != null ? ' (±${_gpsAccuracy!.round()}m)' : ''}',
                      style: const TextStyle(color: AppColors.low, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

          if (_locationError != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.mediumBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.medium.withOpacity(0.4)),
              ),
              child: Text(
                _locationError!,
                style: const TextStyle(color: AppColors.medium, fontSize: 11),
              ),
            ),
          ],

          const SizedBox(height: 12),
          const Text('Street Address / Landmark (Optional)', style: TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextField(
            controller: _addressController,
            style: const TextStyle(color: AppColors.white, fontSize: 13),
            decoration: const InputDecoration(
              hintText: 'e.g., Corner of Anna Salai and 4th Cross St',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsCard() {
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
              Icon(Icons.notes_outlined, color: AppColors.copper, size: 20),
              SizedBox(width: 8),
              Text(
                '3. Hazard Details',
                style: TextStyle(color: AppColors.white, fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Category *', style: TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: AppColors.darkSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: _selectedCategory,
                dropdownColor: AppColors.charcoal,
                items: _categories
                    .map((cat) => DropdownMenuItem(
                          value: cat['value'],
                          child: Text(
                            cat['label']!,
                            style: const TextStyle(color: AppColors.white, fontSize: 13),
                          ),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text('Description (Optional)', style: TextStyle(color: AppColors.white, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextField(
            controller: _descController,
            maxLines: 3,
            style: const TextStyle(color: AppColors.white, fontSize: 13),
            decoration: const InputDecoration(
              hintText: 'Describe danger level, traffic impediment, or surrounding conditions...',
            ),
          ),
        ],
      ),
    );
  }
}
