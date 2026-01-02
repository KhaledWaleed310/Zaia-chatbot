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

/// Register screen
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _nameController = TextEditingController();
  final _companyNameController = TextEditingController();

  String? _selectedCompanySize;
  String? _selectedIndustry;
  bool _acceptedTerms = false;
  bool _marketingConsent = false;

  final List<String> _companySizes = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '500+',
  ];

  final List<String> _industries = [
    'Technology',
    'E-commerce',
    'Healthcare',
    'Finance',
    'Education',
    'Real Estate',
    'Travel & Hospitality',
    'Other',
  ];

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _nameController.dispose();
    _companyNameController.dispose();
    super.dispose();
  }

  void _onRegister() {
    if (!_acceptedTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please accept the Terms and Conditions'),
        ),
      );
      return;
    }

    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(AuthRegisterRequested(
            email: _emailController.text.trim(),
            password: _passwordController.text,
            name: _nameController.text.trim().isNotEmpty
                ? _nameController.text.trim()
                : null,
            companyName: _companyNameController.text.trim().isNotEmpty
                ? _companyNameController.text.trim()
                : null,
            companySize: _selectedCompanySize,
            industry: _selectedIndustry,
            marketingConsent: _marketingConsent,
          ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state.status == AuthStatus.emailVerificationRequired) {
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
            appBar: AppBar(
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.pop(),
              ),
            ),
            body: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header
                      _buildHeader(context),

                      const SizedBox(height: 32),

                      // Name field
                      AppTextField(
                        controller: _nameController,
                        label: 'Full Name',
                        hint: 'Enter your name',
                        prefixIcon: Icons.person_outlined,
                        textCapitalization: TextCapitalization.words,
                      ),

                      const SizedBox(height: 16),

                      // Email field
                      EmailTextField(
                        controller: _emailController,
                        validator: Validators.email,
                      ),

                      const SizedBox(height: 16),

                      // Password field
                      PasswordTextField(
                        controller: _passwordController,
                        validator: Validators.password,
                        textInputAction: TextInputAction.next,
                      ),

                      const SizedBox(height: 16),

                      // Confirm password field
                      PasswordTextField(
                        controller: _confirmPasswordController,
                        label: 'Confirm Password',
                        hint: 'Confirm your password',
                        validator: (value) => Validators.confirmPassword(
                          value,
                          _passwordController.text,
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Company section
                      _buildCompanySection(context),

                      const SizedBox(height: 24),

                      // Terms and marketing
                      _buildTermsSection(context),

                      const SizedBox(height: 24),

                      // Register button
                      AppButton.primary(
                        text: 'Create Account',
                        onPressed: _onRegister,
                        isLoading: state.isLoading,
                      ),

                      const SizedBox(height: 24),

                      // Login link
                      _buildLoginLink(context),
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
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Create Account',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Start building your AI chatbot today',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      ],
    );
  }

  Widget _buildCompanySection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Company Information (Optional)',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 16),

        // Company name
        AppTextField(
          controller: _companyNameController,
          label: 'Company Name',
          hint: 'Enter your company name',
          prefixIcon: Icons.business_outlined,
          textCapitalization: TextCapitalization.words,
        ),

        const SizedBox(height: 16),

        // Company size dropdown
        DropdownButtonFormField<String>(
          value: _selectedCompanySize,
          decoration: const InputDecoration(
            labelText: 'Company Size',
            prefixIcon: Icon(Icons.people_outlined),
          ),
          items: _companySizes
              .map((size) => DropdownMenuItem(
                    value: size,
                    child: Text('$size employees'),
                  ))
              .toList(),
          onChanged: (value) {
            setState(() {
              _selectedCompanySize = value;
            });
          },
        ),

        const SizedBox(height: 16),

        // Industry dropdown
        DropdownButtonFormField<String>(
          value: _selectedIndustry,
          decoration: const InputDecoration(
            labelText: 'Industry',
            prefixIcon: Icon(Icons.category_outlined),
          ),
          items: _industries
              .map((industry) => DropdownMenuItem(
                    value: industry,
                    child: Text(industry),
                  ))
              .toList(),
          onChanged: (value) {
            setState(() {
              _selectedIndustry = value;
            });
          },
        ),
      ],
    );
  }

  Widget _buildTermsSection(BuildContext context) {
    return Column(
      children: [
        // Terms checkbox
        CheckboxListTile(
          value: _acceptedTerms,
          onChanged: (value) {
            setState(() {
              _acceptedTerms = value ?? false;
            });
          },
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          title: RichText(
            text: TextSpan(
              style: Theme.of(context).textTheme.bodyMedium,
              children: [
                const TextSpan(text: 'I agree to the '),
                TextSpan(
                  text: 'Terms and Conditions',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const TextSpan(text: ' and '),
                TextSpan(
                  text: 'Privacy Policy',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Marketing consent
        CheckboxListTile(
          value: _marketingConsent,
          onChanged: (value) {
            setState(() {
              _marketingConsent = value ?? false;
            });
          },
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
          title: Text(
            'I want to receive updates and marketing emails',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }

  Widget _buildLoginLink(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Already have an account? ',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        TextButton(
          onPressed: () => context.pop(),
          child: const Text('Sign In'),
        ),
      ],
    );
  }
}
