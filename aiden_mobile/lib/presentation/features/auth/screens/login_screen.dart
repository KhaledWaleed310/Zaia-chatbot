import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'package:aiden_mobile/core/utils/validators.dart';
import 'package:aiden_mobile/presentation/common/widgets/app_button.dart';
import 'package:aiden_mobile/presentation/common/widgets/app_text_field.dart';
import 'package:aiden_mobile/presentation/common/widgets/loading_overlay.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_bloc.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_event.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_state.dart';
import 'package:aiden_mobile/presentation/navigation/app_router.dart';

/// Login screen
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _rememberMe = false;

  @override
  void initState() {
    super.initState();
    // Pre-fill remembered email
    final authState = context.read<AuthBloc>().state;
    if (authState.rememberedEmail != null) {
      _emailController.text = authState.rememberedEmail!;
      _rememberMe = true;
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onLogin() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(AuthLoginRequested(
            email: _emailController.text.trim(),
            password: _passwordController.text,
            rememberMe: _rememberMe,
          ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.authenticated) {
          context.go(AppRoutes.dashboard);
        } else if (state.status == AuthStatus.emailVerificationRequired) {
          context.go(
            '${AppRoutes.verifyEmail}?email=${state.pendingEmail}',
          );
        } else if (state.hasError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
          context.read<AuthBloc>().add(const AuthClearError());
        }
      },
      builder: (context, state) {
        return LoadingOverlay(
          isLoading: state.isLoading,
          child: Scaffold(
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 48),

                      // Logo and title
                      _buildHeader(context),

                      const SizedBox(height: 48),

                      // Email field
                      EmailTextField(
                        controller: _emailController,
                        validator: Validators.email,
                        autofocus: _emailController.text.isEmpty,
                      ),

                      const SizedBox(height: 16),

                      // Password field
                      PasswordTextField(
                        controller: _passwordController,
                        validator: (value) =>
                            Validators.required(value, 'Password'),
                        onSubmitted: (_) => _onLogin(),
                      ),

                      const SizedBox(height: 16),

                      // Remember me and forgot password
                      _buildRememberForgot(context),

                      const SizedBox(height: 24),

                      // Login button
                      AppButton.primary(
                        text: 'Login',
                        onPressed: _onLogin,
                        isLoading: state.isLoading,
                      ),

                      const SizedBox(height: 24),

                      // Register link
                      _buildRegisterLink(context),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      children: [
        // Logo placeholder
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.smart_toy,
            size: 48,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Welcome Back',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Sign in to continue to AIDEN',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      ],
    );
  }

  Widget _buildRememberForgot(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Remember me
        Row(
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Checkbox(
                value: _rememberMe,
                onChanged: (value) {
                  setState(() {
                    _rememberMe = value ?? false;
                  });
                },
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () {
                setState(() {
                  _rememberMe = !_rememberMe;
                });
              },
              child: Text(
                'Remember me',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ],
        ),

        // Forgot password
        TextButton(
          onPressed: () => context.push(AppRoutes.forgotPassword),
          child: const Text('Forgot Password?'),
        ),
      ],
    );
  }

  Widget _buildRegisterLink(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Don't have an account? ",
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        TextButton(
          onPressed: () => context.push(AppRoutes.register),
          child: const Text('Sign Up'),
        ),
      ],
    );
  }
}
