import 'package:equatable/equatable.dart';

/// Auth events
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

/// Check initial auth status
class AuthCheckStatus extends AuthEvent {
  const AuthCheckStatus();
}

/// Login with email and password
class AuthLoginRequested extends AuthEvent {
  final String email;
  final String password;
  final bool rememberMe;

  const AuthLoginRequested({
    required this.email,
    required this.password,
    this.rememberMe = false,
  });

  @override
  List<Object?> get props => [email, password, rememberMe];
}

/// Register new user
class AuthRegisterRequested extends AuthEvent {
  final String email;
  final String password;
  final String? name;
  final String? companyName;
  final String? companySize;
  final String? industry;
  final String? useCase;
  final String? country;
  final String? referralSource;
  final bool marketingConsent;

  const AuthRegisterRequested({
    required this.email,
    required this.password,
    this.name,
    this.companyName,
    this.companySize,
    this.industry,
    this.useCase,
    this.country,
    this.referralSource,
    this.marketingConsent = false,
  });

  @override
  List<Object?> get props => [
        email,
        password,
        name,
        companyName,
        companySize,
        industry,
        useCase,
        country,
        referralSource,
        marketingConsent,
      ];
}

/// Logout
class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

/// Request password reset
class AuthForgotPasswordRequested extends AuthEvent {
  final String email;

  const AuthForgotPasswordRequested({required this.email});

  @override
  List<Object?> get props => [email];
}

/// Reset password with token
class AuthResetPasswordRequested extends AuthEvent {
  final String token;
  final String newPassword;

  const AuthResetPasswordRequested({
    required this.token,
    required this.newPassword,
  });

  @override
  List<Object?> get props => [token, newPassword];
}

/// Verify email with token
class AuthVerifyEmailRequested extends AuthEvent {
  final String token;

  const AuthVerifyEmailRequested({required this.token});

  @override
  List<Object?> get props => [token];
}

/// Resend verification email
class AuthResendVerificationRequested extends AuthEvent {
  final String email;

  const AuthResendVerificationRequested({required this.email});

  @override
  List<Object?> get props => [email];
}

/// Refresh current user
class AuthRefreshUser extends AuthEvent {
  const AuthRefreshUser();
}

/// Clear error state
class AuthClearError extends AuthEvent {
  const AuthClearError();
}
