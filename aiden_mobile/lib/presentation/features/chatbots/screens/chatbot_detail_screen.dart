import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'package:aiden_mobile/domain/entities/chatbot.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_bloc.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_event.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_state.dart';
import 'package:aiden_mobile/presentation/navigation/app_router.dart';

/// Screen showing chatbot details with navigation tabs
class ChatbotDetailScreen extends StatefulWidget {
  final String botId;

  const ChatbotDetailScreen({
    super.key,
    required this.botId,
  });

  @override
  State<ChatbotDetailScreen> createState() => _ChatbotDetailScreenState();
}

class _ChatbotDetailScreenState extends State<ChatbotDetailScreen> {
  @override
  void initState() {
    super.initState();
    _loadChatbot();
  }

  void _loadChatbot() {
    context.read<ChatbotBloc>().add(ChatbotLoadOne(botId: widget.botId));
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ChatbotBloc, ChatbotState>(
      builder: (context, state) {
        if (state.status == ChatbotStatus.loading &&
            state.selectedChatbot == null) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        final chatbot = state.selectedChatbot;
        if (chatbot == null) {
          return Scaffold(
            appBar: AppBar(),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64),
                  const SizedBox(height: 16),
                  const Text('Chatbot not found'),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () => context.go(AppRoutes.chatbots),
                    child: const Text('Go back'),
                  ),
                ],
              ),
            ),
          );
        }

        return _buildContent(context, chatbot);
      },
    );
  }

  Widget _buildContent(BuildContext context, Chatbot chatbot) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    Color botColor;
    try {
      botColor = Color(
        int.parse(chatbot.displayPrimaryColor.replaceFirst('#', '0xFF')),
      );
    } catch (e) {
      botColor = colorScheme.primary;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(chatbot.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push(AppRoutes.chatbotSettings(chatbot.id)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: botColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        chatbot.isPersonal ? Icons.person : Icons.smart_toy,
                        color: botColor,
                        size: 36,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            chatbot.name,
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(
                                chatbot.isPublic
                                    ? Icons.public
                                    : Icons.lock_outline,
                                size: 16,
                                color: colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                chatbot.isPublic ? 'Public' : 'Private',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Stats row
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    icon: Icons.description,
                    label: 'Documents',
                    value: chatbot.documentCount.toString(),
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    icon: Icons.chat_bubble,
                    label: 'Messages',
                    value: _formatNumber(chatbot.totalMessages),
                    color: Colors.green,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Quick actions
            Text(
              'Quick Actions',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),

            _ActionTile(
              icon: Icons.chat,
              title: 'Test Chat',
              subtitle: 'Try your chatbot',
              color: Colors.blue,
              onTap: () => context.push(AppRoutes.chatbotChat(chatbot.id)),
            ),
            _ActionTile(
              icon: Icons.description,
              title: 'Documents',
              subtitle: '${chatbot.documentCount} documents',
              color: Colors.orange,
              onTap: () => context.push(AppRoutes.chatbotDocuments(chatbot.id)),
            ),
            _ActionTile(
              icon: Icons.analytics,
              title: 'Analytics',
              subtitle: 'View performance',
              color: Colors.purple,
              onTap: () => context.push(AppRoutes.chatbotAnalytics(chatbot.id)),
            ),
            _ActionTile(
              icon: Icons.people,
              title: 'Leads',
              subtitle: 'Captured contacts',
              color: Colors.teal,
              onTap: () => context.push(AppRoutes.chatbotLeads(chatbot.id)),
            ),
            _ActionTile(
              icon: Icons.headset_mic,
              title: 'Handoff',
              subtitle: 'Live chat requests',
              color: Colors.red,
              onTap: () => context.push(AppRoutes.chatbotHandoff(chatbot.id)),
            ),
            _ActionTile(
              icon: Icons.calendar_today,
              title: 'Bookings',
              subtitle: 'Scheduled appointments',
              color: Colors.indigo,
              onTap: () => context.push(AppRoutes.chatbotBookings(chatbot.id)),
            ),
            _ActionTile(
              icon: Icons.psychology,
              title: 'Learning',
              subtitle: 'AIDEN insights',
              color: Colors.pink,
              onTap: () => context.push(AppRoutes.chatbotLearning(chatbot.id)),
            ),
          ],
        ),
      ),
    );
  }

  String _formatNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }
}

/// Stat card widget
class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Action tile widget
class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
