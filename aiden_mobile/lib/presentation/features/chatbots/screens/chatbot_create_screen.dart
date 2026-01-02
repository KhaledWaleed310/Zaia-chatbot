import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'package:aiden_mobile/presentation/common/widgets/app_button.dart';
import 'package:aiden_mobile/presentation/common/widgets/app_text_field.dart';
import 'package:aiden_mobile/presentation/common/widgets/loading_overlay.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_bloc.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_event.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_state.dart';
import 'package:aiden_mobile/presentation/navigation/app_router.dart';

/// Screen for creating a new chatbot
class ChatbotCreateScreen extends StatefulWidget {
  const ChatbotCreateScreen({super.key});

  @override
  State<ChatbotCreateScreen> createState() => _ChatbotCreateScreenState();
}

class _ChatbotCreateScreenState extends State<ChatbotCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _systemPromptController = TextEditingController();
  final _welcomeMessageController = TextEditingController();

  int _currentStep = 0;
  String _selectedColor = '#3B82F6';
  bool _isPersonal = false;

  final List<Map<String, String>> _colorOptions = [
    {'name': 'Blue', 'value': '#3B82F6'},
    {'name': 'Green', 'value': '#10B981'},
    {'name': 'Purple', 'value': '#8B5CF6'},
    {'name': 'Red', 'value': '#EF4444'},
    {'name': 'Orange', 'value': '#F97316'},
    {'name': 'Pink', 'value': '#EC4899'},
    {'name': 'Teal', 'value': '#14B8A6'},
    {'name': 'Indigo', 'value': '#6366F1'},
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _systemPromptController.dispose();
    _welcomeMessageController.dispose();
    super.dispose();
  }

  void _onCreate() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<ChatbotBloc>().add(ChatbotCreate(
            name: _nameController.text.trim(),
            systemPrompt: _systemPromptController.text.trim().isNotEmpty
                ? _systemPromptController.text.trim()
                : null,
            welcomeMessage: _welcomeMessageController.text.trim().isNotEmpty
                ? _welcomeMessageController.text.trim()
                : null,
            primaryColor: _selectedColor,
            isPersonal: _isPersonal,
          ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ChatbotBloc, ChatbotState>(
      listener: (context, state) {
        if (state.status == ChatbotStatus.created) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.successMessage!),
              backgroundColor: Colors.green,
            ),
          );
          context.read<ChatbotBloc>().add(const ChatbotClearSuccess());
          context.go(AppRoutes.chatbotDetail(state.selectedChatbot!.id));
        } else if (state.hasError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
          context.read<ChatbotBloc>().add(const ChatbotClearError());
        }
      },
      builder: (context, state) {
        return LoadingOverlay(
          isLoading: state.status == ChatbotStatus.creating,
          child: Scaffold(
            appBar: AppBar(
              title: const Text('Create Chatbot'),
            ),
            body: Form(
              key: _formKey,
              child: Stepper(
                currentStep: _currentStep,
                onStepContinue: () {
                  if (_currentStep == 0) {
                    if (_nameController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Please enter a chatbot name'),
                        ),
                      );
                      return;
                    }
                    setState(() => _currentStep++);
                  } else if (_currentStep == 1) {
                    setState(() => _currentStep++);
                  } else {
                    _onCreate();
                  }
                },
                onStepCancel: () {
                  if (_currentStep > 0) {
                    setState(() => _currentStep--);
                  } else {
                    context.pop();
                  }
                },
                controlsBuilder: (context, details) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Row(
                      children: [
                        AppButton.primary(
                          text: _currentStep == 2 ? 'Create' : 'Continue',
                          onPressed: details.onStepContinue,
                          isLoading: state.status == ChatbotStatus.creating,
                        ),
                        const SizedBox(width: 12),
                        AppButton.outlined(
                          text: _currentStep == 0 ? 'Cancel' : 'Back',
                          onPressed: details.onStepCancel,
                        ),
                      ],
                    ),
                  );
                },
                steps: [
                  // Step 1: Basic Info
                  Step(
                    title: const Text('Basic Info'),
                    subtitle: const Text('Name your chatbot'),
                    content: _buildBasicInfoStep(),
                    isActive: _currentStep >= 0,
                    state: _currentStep > 0
                        ? StepState.complete
                        : StepState.indexed,
                  ),

                  // Step 2: Personality
                  Step(
                    title: const Text('Personality'),
                    subtitle: const Text('Customize behavior'),
                    content: _buildPersonalityStep(),
                    isActive: _currentStep >= 1,
                    state: _currentStep > 1
                        ? StepState.complete
                        : StepState.indexed,
                  ),

                  // Step 3: Appearance
                  Step(
                    title: const Text('Appearance'),
                    subtitle: const Text('Choose a color'),
                    content: _buildAppearanceStep(),
                    isActive: _currentStep >= 2,
                    state: _currentStep > 2
                        ? StepState.complete
                        : StepState.indexed,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildBasicInfoStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppTextField(
          controller: _nameController,
          label: 'Chatbot Name',
          hint: 'Enter a name for your chatbot',
          prefixIcon: Icons.smart_toy_outlined,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Please enter a name';
            }
            if (value.trim().length < 2) {
              return 'Name must be at least 2 characters';
            }
            return null;
          },
        ),
        const SizedBox(height: 16),
        SwitchListTile(
          title: const Text('Personal Chatbot'),
          subtitle: const Text(
            'Personal chatbots are for private use only',
          ),
          value: _isPersonal,
          onChanged: (value) => setState(() => _isPersonal = value),
          contentPadding: EdgeInsets.zero,
        ),
      ],
    );
  }

  Widget _buildPersonalityStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppTextField(
          controller: _systemPromptController,
          label: 'System Prompt (Optional)',
          hint: 'Define how your chatbot should behave',
          maxLines: 4,
          textInputAction: TextInputAction.newline,
        ),
        const SizedBox(height: 8),
        Text(
          'Example: "You are a helpful customer support agent for an e-commerce store. Be friendly and concise."',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 24),
        AppTextField(
          controller: _welcomeMessageController,
          label: 'Welcome Message (Optional)',
          hint: 'The first message your chatbot sends',
          maxLines: 2,
        ),
        const SizedBox(height: 8),
        Text(
          'Default: "Hello! How can I help you today?"',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
      ],
    );
  }

  Widget _buildAppearanceStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Choose a primary color',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: _colorOptions.map((option) {
            final color = Color(
              int.parse(option['value']!.replaceFirst('#', '0xFF')),
            );
            final isSelected = _selectedColor == option['value'];

            return InkWell(
              onTap: () => setState(() => _selectedColor = option['value']!),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                  border: isSelected
                      ? Border.all(
                          color: Theme.of(context).colorScheme.primary,
                          width: 3,
                        )
                      : null,
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: color.withOpacity(0.5),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: isSelected
                    ? const Icon(Icons.check, color: Colors.white, size: 28)
                    : null,
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),

        // Preview
        Text(
          'Preview',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Color(
                    int.parse(_selectedColor.replaceFirst('#', '0xFF')),
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.smart_toy,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _nameController.text.isEmpty
                          ? 'Your Chatbot'
                          : _nameController.text,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    Text(
                      _welcomeMessageController.text.isEmpty
                          ? 'Hello! How can I help you today?'
                          : _welcomeMessageController.text,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
