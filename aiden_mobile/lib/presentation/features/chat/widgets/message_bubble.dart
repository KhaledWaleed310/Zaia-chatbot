import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import 'package:aiden_mobile/domain/entities/message.dart';

/// Message bubble widget
class MessageBubble extends StatelessWidget {
  final Message message;

  const MessageBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isUser = message.isUser;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        margin: EdgeInsets.only(
          left: isUser ? 48 : 0,
          right: isUser ? 0 : 48,
          bottom: 8,
        ),
        child: Column(
          crossAxisAlignment:
              isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            // Message content
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isUser
                    ? colorScheme.primary
                    : colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (message.isStreaming && message.content.isEmpty)
                    _buildTypingIndicator(context)
                  else if (isUser)
                    Text(
                      message.content,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colorScheme.onPrimary,
                      ),
                    )
                  else
                    MarkdownBody(
                      data: message.content,
                      styleSheet: MarkdownStyleSheet(
                        p: theme.textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurface,
                        ),
                        code: theme.textTheme.bodySmall?.copyWith(
                          backgroundColor: colorScheme.surfaceContainerHigh,
                          fontFamily: 'monospace',
                        ),
                        codeblockDecoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHigh,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      selectable: true,
                    ),

                  // Streaming indicator
                  if (message.isStreaming && message.content.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: colorScheme.primary,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Sources
            if (message.hasSources) ...[
              const SizedBox(height: 4),
              _buildSources(context),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTypingIndicator(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildDot(0),
        const SizedBox(width: 4),
        _buildDot(1),
        const SizedBox(width: 4),
        _buildDot(2),
      ],
    );
  }

  Widget _buildDot(int index) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 300 + (index * 100)),
      builder: (context, value, child) {
        return Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: Theme.of(context)
                .colorScheme
                .onSurfaceVariant
                .withOpacity(0.5 + (value * 0.5)),
            shape: BoxShape.circle,
          ),
        );
      },
    );
  }

  Widget _buildSources(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.source,
                size: 14,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Text(
                'Sources',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: message.sources!.map((source) {
              return Chip(
                label: Text(
                  source.filename,
                  style: theme.textTheme.labelSmall,
                ),
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
