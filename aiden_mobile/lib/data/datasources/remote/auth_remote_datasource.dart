import 'package:aiden_mobile/core/api/api_client.dart';
import 'package:aiden_mobile/core/api/api_endpoints.dart';
import 'package:aiden_mobile/core/api/api_exceptions.dart';
import 'package:aiden_mobile/data/models/auth/user_model.dart';

/// Remote data source for authentication
abstract class AuthRemoteDatasource {
  /// Login with email and password
  Future<LoginResponse> login(LoginRequest request);

  /// Register a new user
  Future<RegisterResponse> register(RegisterRequest request);

  /// Get current authenticated user
  Future<UserModel> getCurrentUser();

  /// Verify email with token
  Future<MessageResponse> verifyEmail(VerifyEmailRequest request);

  /// Resend verification email
  Future<MessageResponse> resendVerification(String email);

  /// Request password reset
  Future<MessageResponse> forgotPassword(ForgotPasswordRequest request);

  /// Reset password with token
  Future<MessageResponse> resetPassword(ResetPasswordRequest request);
}

/// Implementation of AuthRemoteDatasource
class AuthRemoteDatasourceImpl implements AuthRemoteDatasource {
  final ApiClient _apiClient;

  AuthRemoteDatasourceImpl({required ApiClient apiClient})
      : _apiClient = apiClient;

  @override
  Future<LoginResponse> login(LoginRequest request) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.authLogin,
        data: request.toJson(),
      );

      if (response.statusCode == 200 && response.data != null) {
        return LoginResponse.fromJson(response.data as Map<String, dynamic>);
      }

      throw const ServerException(message: 'Login failed');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<RegisterResponse> register(RegisterRequest request) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.authRegister,
        data: request.toJson(),
      );

      if (response.statusCode == 201 && response.data != null) {
        return RegisterResponse.fromJson(response.data as Map<String, dynamic>);
      }

      throw const ServerException(message: 'Registration failed');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<UserModel> getCurrentUser() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.authMe);

      if (response.statusCode == 200 && response.data != null) {
        return UserModel.fromJson(response.data as Map<String, dynamic>);
      }

      throw const ServerException(message: 'Failed to get user');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<MessageResponse> verifyEmail(VerifyEmailRequest request) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.authVerifyEmail,
        data: request.toJson(),
      );

      if (response.statusCode == 200 && response.data != null) {
        return MessageResponse.fromJson(response.data as Map<String, dynamic>);
      }

      throw const ServerException(message: 'Email verification failed');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<MessageResponse> resendVerification(String email) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.authResendVerification,
        data: {'email': email},
      );

      if (response.statusCode == 200 && response.data != null) {
        return MessageResponse.fromJson(response.data as Map<String, dynamic>);
      }

      throw const ServerException(message: 'Failed to resend verification');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<MessageResponse> forgotPassword(ForgotPasswordRequest request) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.authForgotPassword,
        data: request.toJson(),
      );

      if (response.statusCode == 200 && response.data != null) {
        return MessageResponse.fromJson(response.data as Map<String, dynamic>);
      }

      throw const ServerException(message: 'Failed to send reset email');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<MessageResponse> resetPassword(ResetPasswordRequest request) async {
    try {
      final response = await _apiClient.post(
        ApiEndpoints.authResetPassword,
        data: request.toJson(),
      );

      if (response.statusCode == 200 && response.data != null) {
        return MessageResponse.fromJson(response.data as Map<String, dynamic>);
      }

      throw const ServerException(message: 'Password reset failed');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }
}
