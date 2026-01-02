import 'package:dartz/dartz.dart';

import 'package:aiden_mobile/core/error/failures.dart';
import 'package:aiden_mobile/domain/entities/user.dart';

/// Auth repository interface
abstract class AuthRepository {
  /// Login with email and password
  Future<Either<Failure, User>> login({
    required String email,
    required String password,
  });

  /// Register a new user
  Future<Either<Failure, User>> register({
    required String email,
    required String password,
    String? name,
    String? companyName,
    String? companySize,
    String? industry,
    String? useCase,
    String? country,
    String? referralSource,
    bool marketingConsent = false,
  });

  /// Get current authenticated user
  Future<Either<Failure, User>> getCurrentUser();

  /// Check if user is logged in
  Future<bool> isLoggedIn();

  /// Logout
  Future<Either<Failure, void>> logout();

  /// Verify email with token
  Future<Either<Failure, String>> verifyEmail(String token);

  /// Resend verification email
  Future<Either<Failure, String>> resendVerification(String email);

  /// Request password reset
  Future<Either<Failure, String>> forgotPassword(String email);

  /// Reset password with token
  Future<Either<Failure, String>> resetPassword({
    required String token,
    required String newPassword,
  });

  /// Get remembered email
  Future<String?> getRememberedEmail();

  /// Save remembered email
  Future<void> saveRememberedEmail(String email);

  /// Clear remembered email
  Future<void> clearRememberedEmail();
}
