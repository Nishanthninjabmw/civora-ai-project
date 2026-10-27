import 'dart:io';
import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage_service.dart';
import 'api_exceptions.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: {
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Always ensure the current baseUrl is used (in case user updated it in settings)
          options.baseUrl = ApiConstants.baseUrl;

          final token = await SecureStorageService.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          final mappedError = _mapDioError(e);
          return handler.reject(
            DioException(
              requestOptions: e.requestOptions,
              response: e.response,
              type: e.type,
              error: mappedError,
            ),
          );
        },
      ),
    );
  }

  ApiException _mapDioError(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.connectionError) {
      return NetworkException(
        message: 'Unable to reach CIVORA server at ${ApiConstants.baseUrl}. Please verify the backend is running.',
      );
    }

    final response = e.response;
    if (response != null) {
      final statusCode = response.statusCode;
      String message = 'An unexpected server error occurred ($statusCode)';

      if (response.data is Map && response.data['message'] != null) {
        message = response.data['message'].toString();
      } else if (response.data is String && response.data.toString().isNotEmpty) {
        message = response.data.toString();
      }

      switch (statusCode) {
        case 400:
          return ApiException(message: message, statusCode: 400);
        case 401:
          return UnauthorizedException(message: message);
        case 403:
          return ForbiddenException(message: message);
        case 404:
          return NotFoundException(message: message);
        case 503:
          return ApiException(
            message: message.isNotEmpty
                ? message
                : 'CIVORA database service is connecting. Please retry in a few moments.',
            statusCode: 503,
          );
        default:
          return ApiException(message: message, statusCode: statusCode);
      }
    }

    return ApiException(message: e.message ?? 'Unknown network failure');
  }

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    }
  }

  Future<dynamic> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.post(path, data: data, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    }
  }

  Future<dynamic> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.put(path, data: data, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    }
  }

  Future<dynamic> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.patch(path, data: data, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    }
  }

  /// Upload multipart form data allowing Dio to set boundary automatically
  Future<dynamic> uploadMultipart(
    String path, {
    required Map<String, dynamic> fields,
    File? file,
    String fileField = 'image',
    File? secondFile,
    String secondFileField = 'resolutionImage',
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final formDataMap = Map<String, dynamic>.from(fields);

      if (file != null && await file.exists()) {
        final fileName = file.path.split(Platform.pathSeparator).last;
        formDataMap[fileField] = await MultipartFile.fromFile(
          file.path,
          filename: fileName,
        );
      }

      if (secondFile != null && await secondFile.exists()) {
        final fileName = secondFile.path.split(Platform.pathSeparator).last;
        formDataMap[secondFileField] = await MultipartFile.fromFile(
          secondFile.path,
          filename: fileName,
        );
      }

      final formData = FormData.fromMap(formDataMap);

      final response = await _dio.post(
        path,
        data: formData,
        onSendProgress: onSendProgress,
      );
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    }
  }

  /// Update report status with optional resolution file
  Future<dynamic> updateReportStatusMultipart(
    String path, {
    required Map<String, dynamic> fields,
    File? resolutionFile,
  }) async {
    try {
      final formDataMap = Map<String, dynamic>.from(fields);

      if (resolutionFile != null && await resolutionFile.exists()) {
        final fileName = resolutionFile.path.split(Platform.pathSeparator).last;
        formDataMap['resolutionImage'] = await MultipartFile.fromFile(
          resolutionFile.path,
          filename: fileName,
        );
      }

      final formData = FormData.fromMap(formDataMap);

      final response = await _dio.put(
        path,
        data: formData,
      );
      return response.data;
    } on DioException catch (e) {
      if (e.error is ApiException) throw e.error as ApiException;
      throw _mapDioError(e);
    }
  }
}

// Global shared ApiClient singleton
final apiClient = ApiClient();
