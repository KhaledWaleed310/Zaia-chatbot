import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'package:aiden_mobile/domain/entities/chatbot.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_bloc.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_event.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_state.dart';
import 'package:aiden_mobile/presentation/features/chatbots/widgets/chatbot_card.dart';
import 'package:aiden_mobile/presentation/navigation/app_router.dart';

/// Screen showing list of user's chatbots
class ChatbotListScreen extends StatefulWidget {
  const ChatbotListScreen({super.key});

  @override
  State<ChatbotListScreen> createState() => _ChatbotListScreenState();
}

class _ChatbotListScreenState extends State<ChatbotListScreen> {
  @override
  void initState() {
    super.initState();
    _loadChatbots();
  }

  void _loadChatbots({bool forceRefresh = false}) {
    context.read<ChatbotBloc>().add(ChatbotLoadAll(forceRefresh: forceRefresh));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chatbots'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push(AppRoutes.chatbotCreate),
            tooltip: 'Create Chatbot',
          ),
        ],
      ),
      body: BlocConsumer<ChatbotBloc, ChatbotState>(
        listener: (context, state) {
          if (state.hasError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
            context.read<ChatbotBloc>().add(const ChatbotClearError());
          }

          if (state.status == ChatbotStatus.deleted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.successMessage!),
                backgroundColor: Colors.green,
              ),
            );
            context.read<ChatbotBloc>().add(const ChatbotClearSuccess());
          }
        },
        builder: (context, state) {
          if (state.status == ChatbotStatus.loading && !state.hasChatbots) {
            return const Center(child: CircularProgressIndicator());
          }

          if (!state.hasChatbots) {
            return _buildEmptyState(context);
          }

          return RefreshIndicator(
            onRefresh: () async => _loadChatbots(forceRefresh: true),
            child: _buildChatbotGrid(context, state.chatbots),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.chatbotCreate),
        icon: const Icon(Icons.add),
        label: const Text('New Chatbot'),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.smart_toy_outlined,
              size: 80,
              color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'No Chatbots Yet',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Create your first AI chatbot to get started',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: () => context.push(AppRoutes.chatbotCreate),
              icon: const Icon(Icons.add),
              label: const Text('Create Chatbot'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatbotGrid(BuildContext context, List<Chatbot> chatbots) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 1,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 2.0,
      ),
      itemCount: chatbots.length,
      itemBuilder: (context, index) {
        final chatbot = chatbots[index];
        return ChatbotCard(
          chatbot: chatbot,
          onTap: () => context.push(AppRoutes.chatbotDetail(chatbot.id)),
          onMenuTap: () => _showChatbotMenu(context, chatbot),
        );
      },
    );
  }

  void _showChatbotMenu(BuildContext context, Chatbot chatbot) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.settings),
              title: const Text('Settings'),
              onTap: () {
                Navigator.pop(context);
                context.push(AppRoutes.chatbotSettings(chatbot.id));
              },
            ),
            ListTile(
              leading: const Icon(Icons.description),
              title: const Text('Documents'),
              onTap: () {
                Navigator.pop(context);
                context.push(AppRoutes.chatbotDocuments(chatbot.id));
              },
            ),
            ListTile(
              leading: const Icon(Icons.chat),
              title: const Text('Chat'),
              onTap: () {
                Navigator.pop(context);
                context.push(AppRoutes.chatbotChat(chatbot.id));
              },
            ),
            ListTile(
              leading: const Icon(Icons.analytics),
              title: const Text('Analytics'),
              onTap: () {
                Navigator.pop(context);
                context.push(AppRoutes.chatbotAnalytics(chatbot.id));
              },
            ),
            const Divider(),
            ListTile(
              leading: Icon(
                Icons.delete,
                color: Theme.of(context).colorScheme.error,
              ),
              title: Text(
                'Delete',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                _confirmDelete(context, chatbot);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, Chatbot chatbot) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete Chatbot'),
        content: Text(
          'Are you sure you want to delete "${chatbot.name}"? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<ChatbotBloc>().add(ChatbotDelete(botId: chatbot.id));
            },
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}
