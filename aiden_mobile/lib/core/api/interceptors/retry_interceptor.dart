import 'dart:async';
import 'package:dio/dio.dart';

/// Interceptor for retrying failed requests
class RetryInterceptor extends Interceptor {
  final Dio _dio;
  final int maxRetries;
  final Duration retryDelay;

  /// HTTP methods that are safe to retry
  static const List<String> _retryableMethods = ['GET', 'HEAD', 'OPTIONS'];

  /// Status codes that warrant a retry
  static const List<int> _retryableStatusCodes = [408, 500, 502, 503, 504];

  RetryInterceptor({
    required Dio dio,
    this.maxRetries = 3,
    this.retryDelay = const Duration(seconds: 1),
  }) : _dio = dio;

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Get current retry count
    final retryCount = err.requestOptions.extra['retryCount'] as int? ?? 0;

    // Check if we should retry
    if (_shouldRetry(err) && retryCount < maxRetries) {
      // Wait before retrying with exponential backoff
      final delay = retryDelay * (retryCount + 1);
      await Future<void>.delayed(delay);

      // Update retry count
      err.requestOptions.extra['retryCount'] = retryCount + 1;

      try {
        // Retry the request
        final response = await _dio.fetch(err.requestOptions);
        return handler.resolve(response);
      } on DioException catch (e) {
        return handler.reject(e);
      }
    }

    handler.next(err);
  }

  /// Determine if request should be retried
  bool _shouldRetry(DioException err) {
    // Only retry safe methods
    if (!_retryableMethods.contains(err.requestOptions.method.toUpperCase())) {
      return false;
    }

    // Retry on connection errors
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout) {
      return true;
    }

    // Retry on specific status codes
    final statusCode = err.response?.statusCode;
    if (statusCode != null && _retryableStatusCodes.contains(statusCode)) {
      return true;
    }

    return false;
  }
}
