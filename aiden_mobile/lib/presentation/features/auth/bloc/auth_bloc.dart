import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:aiden_mobile/domain/repositories/auth_repository.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_event.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_state.dart';

/// Auth BLoC
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(const AuthState.initial()) {
    on<AuthCheckStatus>(_onCheckStatus);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthRegisterRequested>(_onRegisterRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
    on<AuthForgotPasswordRequested>(_onForgotPasswordRequested);
    on<AuthResetPasswordRequested>(_onResetPasswordRequested);
    on<AuthVerifyEmailRequested>(_onVerifyEmailRequested);
    on<AuthResendVerificationRequested>(_onResendVerificationRequested);
    on<AuthRefreshUser>(_onRefreshUser);
    on<AuthClearError>(_onClearError);
  }

  /// Check initial auth status
  Future<void> _onCheckStatus(
    AuthCheckStatus event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthState.loading());

    final isLoggedIn = await _authRepository.isLoggedIn();

    if (isLoggedIn) {
      final result = await _authRepository.getCurrentUser();

      result.fold(
        (failure) async {
          final rememberedEmail = await _authRepository.getRememberedEmail();
          emit(AuthState.unauthenticated(rememberedEmail: rememberedEmail));
        },
        (user) {
          if (!user.isVerified) {
            emit(AuthState.emailVerificationRequired(user.email));
          } else {
            emit(AuthState.authenticated(user));
          }
        },
      );
    } else {
      final rememberedEmail = await _authRepository.getRememberedEmail();
      emit(AuthState.unauthenticated(rememberedEmail: rememberedEmail));
    }
  }

  /// Handle login request
  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthState.loading());

    final result = await _authRepository.login(
      email: event.email,
      password: event.password,
    );

    await result.fold(
      (failure) async {
        emit(AuthState.error(failure.message));
      },
      (user) async {
        // Handle remember me
        if (event.rememberMe) {
          await _authRepository.saveRememberedEmail(event.email);
        } else {
          await _authRepository.clearRememberedEmail();
        }

        // Check if email is verified
        if (!user.isVerified) {
          emit(AuthState.emailVerificationRequired(user.email));
        } else {
          emit(AuthState.authenticated(user));
        }
      },
    );
  }

  /// Handle registration request
  Future<void> _onRegisterRequested(
    AuthRegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthState.loading());

    final result = await _authRepository.register(
      email: event.email,
      password: event.password,
      name: event.name,
      companyName: event.companyName,
      companySize: event.companySize,
      industry: event.industry,
      useCase: event.useCase,
      country: event.country,
      referralSource: event.referralSource,
      marketingConsent: event.marketingConsent,
    );

    result.fold(
      (failure) => emit(AuthState.error(failure.message)),
      (user) => emit(AuthState.emailVerificationRequired(user.email)),
    );
  }

  /// Handle logout request
  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthState.loading());

    final result = await _authRepository.logout();

    await result.fold(
      (failure) async {
        // Still logout even if there's an error
        final rememberedEmail = await _authRepository.getRememberedEmail();
        emit(AuthState.unauthenticated(rememberedEmail: rememberedEmail));
      },
      (_) async {
        final rememberedEmail = await _authRepository.getRememberedEmail();
        emit(AuthState.unauthenticated(rememberedEmail: rememberedEmail));
      },
    );
  }

  /// Handle forgot password request
  Future<void> _onForgotPasswordRequested(
    AuthForgotPasswordRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthState.loading());

    final result = await _authRepository.forgotPassword(event.email);

    result.fold(
      (failure) => emit(AuthState.error(failure.message)),
      (_) => emit(AuthState.passwordResetSent(event.email)),
    );
  }

  /// Handle reset password request
  Future<void> _onResetPasswordRequested(
    AuthResetPasswordRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthState.loading());

    final result = await _authRepository.resetPassword(
      token: event.token,
      newPassword: event.newPassword,
    );

    result.fold(
      (failure) => emit(AuthState.error(failure.message)),
      (_) => emit(const AuthState.passwordResetSuccess()),
    );
  }

  /// Handle verify email request
  Future<void> _onVerifyEmailRequested(
    AuthVerifyEmailRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthState.loading());

    final result = await _authRepository.verifyEmail(event.token);

    result.fold(
      (failure) => emit(AuthState.error(failure.message)),
      (_) => emit(const AuthState.emailVerified()),
    );
  }

  /// Handle resend verification request
  Future<void> _onResendVerificationRequested(
    AuthResendVerificationRequested event,
    Emitter<AuthState> emit,
  ) async {
    final currentState = state;
    emit(const AuthState.loading());

    final result = await _authRepository.resendVerification(event.email);

    result.fold(
      (failure) => emit(AuthState.error(
        failure.message,
        previousState: currentState,
      )),
      (_) => emit(currentState.copyWith(
        successMessage: 'Verification email sent',
      )),
    );
  }

  /// Refresh current user
  Future<void> _onRefreshUser(
    AuthRefreshUser event,
    Emitter<AuthState> emit,
  ) async {
    if (!state.isAuthenticated) return;

    final result = await _authRepository.getCurrentUser();

    result.fold(
      (failure) {
        // Don't emit error, just keep current state
      },
      (user) => emit(AuthState.authenticated(user)),
    );
  }

  /// Clear error
  void _onClearError(
    AuthClearError event,
    Emitter<AuthState> emit,
  ) {
    emit(state.copyWith(clearError: true, clearSuccess: true));
  }
}
