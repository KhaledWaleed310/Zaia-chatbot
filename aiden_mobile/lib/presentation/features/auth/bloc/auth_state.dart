import 'package:equatable/equatable.dart';

import 'package:aiden_mobile/domain/entities/user.dart';

/// Auth status enum
enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  emailVerificationRequired,
  passwordResetSent,
  passwordResetSuccess,
  emailVerified,
  error,
  timeout,
}

/// Auth state
class AuthState extends Equatable {
  final AuthStatus status;
  final User? user;
  final String? errorMessage;
  final String? successMessage;
  final String? pendingEmail;
  final String? rememberedEmail;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.errorMessage,
    this.successMessage,
    this.pendingEmail,
    this.rememberedEmail,
  });

  /// Initial state
  const AuthState.initial()
      : this(status: AuthStatus.initial);

  /// Loading state
  const AuthState.loading()
      : this(status: AuthStatus.loading);

  /// Authenticated state
  AuthState.authenticated(User user)
      : this(
          status: AuthStatus.authenticated,
          user: user,
        );

  /// Unauthenticated state
  const AuthState.unauthenticated({String? rememberedEmail})
      : this(
          status: AuthStatus.unauthenticated,
          rememberedEmail: rememberedEmail,
        );

  /// Email verification required state
  AuthState.emailVerificationRequired(String email)
      : this(
          status: AuthStatus.emailVerificationRequired,
          pendingEmail: email,
        );

  /// Password reset sent state
  AuthState.passwordResetSent(String email)
      : this(
          status: AuthStatus.passwordResetSent,
          successMessage: 'Password reset link sent to $email',
          pendingEmail: email,
        );

  /// Password reset success state
  const AuthState.passwordResetSuccess()
      : this(
          status: AuthStatus.passwordResetSuccess,
          successMessage: 'Password reset successful. Please login.',
        );

  /// Email verified state
  const AuthState.emailVerified()
      : this(
          status: AuthStatus.emailVerified,
          successMessage: 'Email verified successfully. Please login.',
        );

  /// Error state
  AuthState.error(String message, {AuthState? previousState})
      : this(
          status: AuthStatus.error,
          errorMessage: message,
          user: previousState?.user,
          pendingEmail: previousState?.pendingEmail,
          rememberedEmail: previousState?.rememberedEmail,
        );

  /// Timeout state - auth check took too long
  const AuthState.timeout()
      : this(
          status: AuthStatus.timeout,
          errorMessage: 'Connection timed out. Please try again.',
        );

  /// Check if authenticated
  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;

  /// Check if loading
  bool get isLoading => status == AuthStatus.loading;

  /// Check if has error
  bool get hasError =>
      status == AuthStatus.error && errorMessage != null;

  /// Copy with method
  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? errorMessage,
    String? successMessage,
    String? pendingEmail,
    String? rememberedEmail,
    bool clearError = false,
    bool clearSuccess = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      successMessage:
          clearSuccess ? null : (successMessage ?? this.successMessage),
      pendingEmail: pendingEmail ?? this.pendingEmail,
      rememberedEmail: rememberedEmail ?? this.rememberedEmail,
    );
  }

  @override
  List<Object?> get props => [
        status,
        user,
        errorMessage,
        successMessage,
        pendingEmail,
        rememberedEmail,
      ];
}
