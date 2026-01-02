import 'package:flutter/material.dart';

import 'package:aiden_mobile/core/extensions/datetime_extensions.dart';
import 'package:aiden_mobile/domain/entities/chatbot.dart';

/// Card widget for displaying a chatbot
class ChatbotCard extends StatelessWidget {
  final Chatbot chatbot;
  final VoidCallback? onTap;
  final VoidCallback? onMenuTap;

  const ChatbotCard({
    super.key,
    required this.chatbot,
    this.onTap,
    this.onMenuTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // Parse primary color
    Color botColor;
    try {
      botColor = Color(
        int.parse(chatbot.displayPrimaryColor.replaceFirst('#', '0xFF')),
      );
    } catch (e) {
      botColor = colorScheme.primary;
    }

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Color header
            Container(
              height: 8,
              color: botColor,
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header row
                  Row(
                    children: [
                      // Bot icon
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: botColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          chatbot.isPersonal
                              ? Icons.person
                              : Icons.smart_toy,
                          color: botColor,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 12),

                      // Name and status
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              chatbot.name,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                if (chatbot.isPublic) ...[
                                  Icon(
                                    Icons.public,
                                    size: 14,
                                    color: colorScheme.primary,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Public',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: colorScheme.primary,
                                    ),
                                  ),
                                ] else ...[
                                  Icon(
                                    Icons.lock_outline,
                                    size: 14,
                                    color: colorScheme.onSurfaceVariant,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Private',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                ],
                                if (chatbot.hasPassword) ...[
                                  const SizedBox(width: 8),
                                  Icon(
                                    Icons.key,
                                    size: 14,
                                    color: colorScheme.onSurfaceVariant,
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Menu button
                      if (onMenuTap != null)
                        IconButton(
                          icon: const Icon(Icons.more_vert),
                          onPressed: onMenuTap,
                          splashRadius: 20,
                        ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Stats row
                  Row(
                    children: [
                      // Documents
                      _StatChip(
                        icon: Icons.description_outlined,
                        label: '${chatbot.documentCount}',
                        tooltip: 'Documents',
                        color: colorScheme.primary,
                      ),
                      const SizedBox(width: 16),

                      // Messages
                      _StatChip(
                        icon: Icons.chat_bubble_outline,
                        label: _formatNumber(chatbot.totalMessages),
                        tooltip: 'Messages',
                        color: colorScheme.secondary,
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Updated time
                  Text(
                    'Updated ${chatbot.updatedAt.timeAgo}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
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

/// Small stat chip widget
class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final String tooltip;
  final Color color;

  const _StatChip({
    required this.icon,
    required this.label,
    required this.tooltip,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
          ),
        ],
      ),
    );
  }
}
