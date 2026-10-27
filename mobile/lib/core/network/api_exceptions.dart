class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic details;

  ApiException({
    required this.message,
    this.statusCode,
    this.details,
  });

  @override
  String toString() => message;
}

class UnauthorizedException extends ApiException {
  UnauthorizedException({String? message})
      : super(
          message: message ?? 'Session expired or not authorized. Please sign in again.',
          statusCode: 401,
        );
}

class ForbiddenException extends ApiException {
  ForbiddenException({String? message})
      : super(
          message: message ?? 'Access denied. You lack permissions for this resource.',
          statusCode: 403,
        );
}

class NotFoundException extends ApiException {
  NotFoundException({String? message})
      : super(
          message: message ?? 'Requested record not found.',
          statusCode: 404,
        );
}

class NetworkException extends ApiException {
  NetworkException({String? message})
      : super(
          message: message ?? 'Unable to connect to CIVORA server. Please check your network connection.',
        );
}
