/// Base API exception class
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  const ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  @override
  String toString() => 'ApiException: $message (status: $statusCode)';
}

/// Server returned an error response
class ServerException extends ApiException {
  const ServerException({
    required super.message,
    super.statusCode,
    super.data,
  });
}

/// Network connectivity issues
class NetworkException extends ApiException {
  const NetworkException({
    super.message = 'No internet connection',
    super.statusCode,
  });
}

/// Request timeout
class TimeoutException extends ApiException {
  const TimeoutException({
    super.message = 'Request timed out',
    super.statusCode,
  });
}

/// Authentication failure (401)
class UnauthorizedException extends ApiException {
  const UnauthorizedException({
    super.message = 'Unauthorized access',
    super.statusCode = 401,
  });
}

/// Access denied (403)
class ForbiddenException extends ApiException {
  const ForbiddenException({
    super.message = 'Access forbidden',
    super.statusCode = 403,
  });
}

/// Resource not found (404)
class NotFoundException extends ApiException {
  const NotFoundException({
    super.message = 'Resource not found',
    super.statusCode = 404,
  });
}

/// Validation error (422)
class ValidationException extends ApiException {
  final Map<String, List<String>>? errors;

  const ValidationException({
    super.message = 'Validation failed',
    super.statusCode = 422,
    this.errors,
    super.data,
  });
}

/// Rate limit exceeded (429)
class RateLimitException extends ApiException {
  final Duration? retryAfter;

  const RateLimitException({
    super.message = 'Rate limit exceeded',
    super.statusCode = 429,
    this.retryAfter,
  });
}

/// Cache-related exception
class CacheException implements Exception {
  final String message;

  const CacheException({this.message = 'Cache error'});

  @override
  String toString() => 'CacheException: $message';
}

/// Local storage exception
class StorageException implements Exception {
  final String message;

  const StorageException({this.message = 'Storage error'});

  @override
  String toString() => 'StorageException: $message';
}
