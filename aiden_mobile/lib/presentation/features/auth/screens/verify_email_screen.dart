import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'package:aiden_mobile/presentation/common/widgets/app_button.dart';
import 'package:aiden_mobile/presentation/common/widgets/loading_overlay.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_bloc.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_event.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_state.dart';
import 'package:aiden_mobile/presentation/navigation/app_router.dart';

/// Verify email screen
class VerifyEmailScreen extends StatefulWidget {
  final String? email;
  final String? token;

  const VerifyEmailScreen({
    super.key,
    this.email,
    this.token,
  });

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  bool _isResending = false;

  @override
  void initState() {
    super.initState();
    // If token is provided, verify immediately
    if (widget.token != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        context.read<AuthBloc>().add(AuthVerifyEmailRequested(
              token: widget.token!,
            ));
      });
    }
  }

  void _onResend() {
    if (widget.email != null) {
      setState(() {
        _isResending = true;
      });
      context.read<AuthBloc>().add(AuthResendVerificationRequested(
            email: widget.email!,
          ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.emailVerified) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Email verified successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          context.go(AppRoutes.login);
        } else if (state.successMessage != null && _isResending) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.successMessage!),
              backgroundColor: Colors.green,
            ),
          );
          setState(() {
            _isResending = false;
          });
        } else if (state.hasError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
          setState(() {
            _isResending = false;
          });
          context.read<AuthBloc>().add(const AuthClearError());
        }
      },
      builder: (context, state) {
        // If verifying token, show loading
        if (widget.token != null && state.isLoading) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 24),
                  Text(
                    'Verifying your email...',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                ],
              ),
            ),
          );
        }

        return LoadingOverlay(
          isLoading: _isResending,
          child: Scaffold(
            appBar: AppBar(
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.go(AppRoutes.login),
              ),
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 48),

                    // Email icon
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.mark_email_unread,
                        size: 50,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Title
                    Text(
                      'Verify Your Email',
                      style:
                          Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 16),

                    // Description
                    Text(
                      'We\'ve sent a verification email to:',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                      textAlign: TextAlign.center,
                    ),

                    if (widget.email != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        widget.email!,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                        textAlign: TextAlign.center,
                      ),
                    ],

                    const SizedBox(height: 32),

                    // Instructions
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color:
                            Theme.of(context).colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.info_outline,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Please check your email and click the verification link to activate your account.',
                                  style:
                                      Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Didn't receive email
                    Text(
                      "Didn't receive the email?",
                      style: Theme.of(context).textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 4),

                    Text(
                      'Check your spam folder or click below to resend.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 16),

                    // Resend button
                    AppButton.outlined(
                      text: 'Resend Verification Email',
                      onPressed: widget.email != null ? _onResend : null,
                      isLoading: _isResending,
                    ),

                    const SizedBox(height: 24),

                    // Change email
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Wrong email? ',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        TextButton(
                          onPressed: () => context.go(AppRoutes.register),
                          child: const Text('Register again'),
                        ),
                      ],
                    ),

                    const SizedBox(height: 8),

                    // Back to login
                    TextButton(
                      onPressed: () => context.go(AppRoutes.login),
                      child: const Text('Back to Login'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
