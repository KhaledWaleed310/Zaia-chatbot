import 'package:dio/dio.dart';
import 'package:aiden_mobile/core/api/api_exceptions.dart';

/// Interceptor for handling and transforming API errors
class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final apiException = _transformError(err);

    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: apiException,
      ),
    );
  }

  /// Transform DioException to appropriate ApiException
  ApiException _transformError(DioException err) {
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const TimeoutException();

      case DioExceptionType.connectionError:
        return const NetworkException();

      case DioExceptionType.badResponse:
        return _handleBadResponse(err.response);

      case DioExceptionType.cancel:
        return const ApiException(message: 'Request cancelled');

      case DioExceptionType.badCertificate:
        return const ApiException(message: 'SSL certificate error');

      case DioExceptionType.unknown:
      default:
        if (err.error != null && err.error.toString().contains('SocketException')) {
          return const NetworkException();
        }
        return ApiException(
          message: err.message ?? 'Unknown error occurred',
        );
    }
  }

  /// Handle bad response (4xx, 5xx)
  ApiException _handleBadResponse(Response<dynamic>? response) {
    if (response == null) {
      return const ServerException(message: 'No response from server');
    }

    final statusCode = response.statusCode ?? 0;
    final data = response.data;

    // Extract error message from response
    String message = 'Server error';
    if (data is Map<String, dynamic>) {
      message = data['detail'] as String? ??
          data['message'] as String? ??
          data['error'] as String? ??
          'Server error';
    }

    switch (statusCode) {
      case 400:
        return ServerException(
          message: message,
          statusCode: statusCode,
          data: data,
        );

      case 401:
        return UnauthorizedException(message: message);

      case 403:
        return ForbiddenException(message: message);

      case 404:
        return NotFoundException(message: message);

      case 422:
        // Parse validation errors if present
        Map<String, List<String>>? errors;
        if (data is Map<String, dynamic> && data['detail'] is List) {
          errors = _parseValidationErrors(data['detail'] as List);
        }
        return ValidationException(
          message: message,
          errors: errors,
          data: data,
        );

      case 429:
        Duration? retryAfter;
        final retryHeader = response.headers.value('retry-after');
        if (retryHeader != null) {
          final seconds = int.tryParse(retryHeader);
          if (seconds != null) {
            retryAfter = Duration(seconds: seconds);
          }
        }
        return RateLimitException(
          message: message,
          retryAfter: retryAfter,
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return ServerException(
          message: 'Server is temporarily unavailable',
          statusCode: statusCode,
        );

      default:
        return ServerException(
          message: message,
          statusCode: statusCode,
          data: data,
        );
    }
  }

  /// Parse FastAPI validation errors
  Map<String, List<String>> _parseValidationErrors(List<dynamic> details) {
    final errors = <String, List<String>>{};

    for (final detail in details) {
      if (detail is Map<String, dynamic>) {
        final loc = detail['loc'] as List?;
        final msg = detail['msg'] as String? ?? 'Validation error';

        if (loc != null && loc.isNotEmpty) {
          // Get the field name (last item in loc, skip 'body')
          final field = loc.last.toString();
          errors.putIfAbsent(field, () => []).add(msg);
        }
      }
    }

    return errors;
  }
}
