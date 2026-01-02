import 'package:equatable/equatable.dart';

/// Base failure class for domain layer
abstract class Failure extends Equatable {
  final String message;
  final int? code;

  const Failure({
    required this.message,
    this.code,
  });

  @override
  List<Object?> get props => [message, code];
}

/// Server failure - API returned an error
class ServerFailure extends Failure {
  const ServerFailure(String message, {int? code})
      : super(message: message, code: code);
}

/// Network failure - no internet connection
class NetworkFailure extends Failure {
  const NetworkFailure([String message = 'No internet connection'])
      : super(message: message);
}

/// Cache failure - local storage error
class CacheFailure extends Failure {
  const CacheFailure([String message = 'Cache error']) : super(message: message);
}

/// Authentication failure - invalid credentials or expired token
class AuthFailure extends Failure {
  const AuthFailure([String message = 'Authentication failed'])
      : super(message: message, code: 401);
}

/// Forbidden failure - access denied
class ForbiddenFailure extends Failure {
  const ForbiddenFailure([String message = 'Access denied'])
      : super(message: message, code: 403);
}

/// Not found failure - resource doesn't exist
class NotFoundFailure extends Failure {
  const NotFoundFailure([String message = 'Resource not found'])
      : super(message: message, code: 404);
}

/// Validation failure - input validation error
class ValidationFailure extends Failure {
  final Map<String, List<String>>? errors;

  const ValidationFailure({
    String message = 'Validation failed',
    this.errors,
  }) : super(message: message, code: 422);

  @override
  List<Object?> get props => [message, code, errors];

  /// Get first error message for a specific field
  String? getFieldError(String field) {
    return errors?[field]?.firstOrNull;
  }

  /// Get all errors as a single string
  String get allErrors {
    if (errors == null || errors!.isEmpty) return message;

    return errors!.entries
        .map((e) => '${e.key}: ${e.value.join(", ")}')
        .join('\n');
  }
}

/// Rate limit failure - too many requests
class RateLimitFailure extends Failure {
  final Duration? retryAfter;

  const RateLimitFailure({
    String message = 'Too many requests',
    this.retryAfter,
  }) : super(message: message, code: 429);

  @override
  List<Object?> get props => [message, code, retryAfter];
}

/// Timeout failure - request timed out
class TimeoutFailure extends Failure {
  const TimeoutFailure([String message = 'Request timed out'])
      : super(message: message);
}

/// Offline failure - operation queued for sync
class OfflineFailure extends Failure {
  const OfflineFailure([String message = 'Operation saved for offline sync'])
      : super(message: message);
}

/// Unknown failure - unexpected error
class UnknownFailure extends Failure {
  const UnknownFailure([String message = 'An unexpected error occurred'])
      : super(message: message);
}

/// WebSocket failure - real-time connection error
class WebSocketFailure extends Failure {
  const WebSocketFailure([String message = 'Connection error'])
      : super(message: message);
}

/// File failure - file operation error
class FileFailure extends Failure {
  const FileFailure([String message = 'File operation failed'])
      : super(message: message);
}

/// Permission failure - missing permissions
class PermissionFailure extends Failure {
  const PermissionFailure([String message = 'Permission denied'])
      : super(message: message);
}
