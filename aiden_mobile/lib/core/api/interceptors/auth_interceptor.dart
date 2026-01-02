import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Interceptor for adding JWT token to requests
class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _secureStorage;

  /// Endpoints that don't require authentication
  static const List<String> _publicEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/chatbots/share/',
    '/greeting/',
    '/translation/widget/',
  ];

  AuthInterceptor({required FlutterSecureStorage secureStorage})
      : _secureStorage = secureStorage;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth header for public endpoints
    if (_isPublicEndpoint(options.path)) {
      return handler.next(options);
    }

    // Get token from secure storage with timeout
    String? token;
    try {
      token = await _secureStorage
          .read(key: 'access_token')
          .timeout(const Duration(seconds: 3));
    } catch (e) {
      // Proceed without token on timeout/error
      token = null;
    }

    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    return handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Handle 401 - clear tokens and let app handle redirect
    if (err.response?.statusCode == 401) {
      await _clearTokens();
    }

    handler.next(err);
  }

  /// Check if the endpoint is public (no auth required)
  bool _isPublicEndpoint(String path) {
    return _publicEndpoints.any((endpoint) => path.contains(endpoint));
  }

  /// Clear stored tokens
  Future<void> _clearTokens() async {
    await _secureStorage.delete(key: 'access_token');
    await _secureStorage.delete(key: 'refresh_token');
  }
}
