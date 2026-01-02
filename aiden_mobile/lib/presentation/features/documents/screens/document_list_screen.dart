import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:aiden_mobile/core/extensions/datetime_extensions.dart';
import 'package:aiden_mobile/domain/entities/chatbot.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_bloc.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_event.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_state.dart';

/// Screen for managing chatbot documents
class DocumentListScreen extends StatefulWidget {
  final String botId;

  const DocumentListScreen({
    super.key,
    required this.botId,
  });

  @override
  State<DocumentListScreen> createState() => _DocumentListScreenState();
}

class _DocumentListScreenState extends State<DocumentListScreen> {
  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  void _loadDocuments() {
    context.read<ChatbotBloc>().add(ChatbotLoadDocuments(botId: widget.botId));
  }

  Future<void> _pickAndUploadFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'txt', 'doc', 'docx', 'md'],
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = File(result.files.first.path!);
        if (mounted) {
          context.read<ChatbotBloc>().add(ChatbotUploadDocument(
                botId: widget.botId,
                file: file,
              ));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error picking file: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Documents'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDocuments,
          ),
        ],
      ),
      body: BlocConsumer<ChatbotBloc, ChatbotState>(
        listener: (context, state) {
          if (state.status == ChatbotStatus.documentUploaded) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.successMessage!),
                backgroundColor: Colors.green,
              ),
            );
            context.read<ChatbotBloc>().add(const ChatbotClearSuccess());
          } else if (state.status == ChatbotStatus.documentDeleted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.successMessage!),
                backgroundColor: Colors.green,
              ),
            );
            context.read<ChatbotBloc>().add(const ChatbotClearSuccess());
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
          if (state.isLoadingDocuments && state.documents.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.documents.isEmpty) {
            return _buildEmptyState(context);
          }

          return RefreshIndicator(
            onRefresh: () async => _loadDocuments(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.documents.length,
              itemBuilder: (context, index) {
                final document = state.documents[index];
                return _DocumentCard(
                  document: document,
                  onDelete: () => _confirmDelete(context, document),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: BlocBuilder<ChatbotBloc, ChatbotState>(
        builder: (context, state) {
          final isUploading = state.status == ChatbotStatus.uploadingDocument;
          return FloatingActionButton.extended(
            onPressed: isUploading ? null : _pickAndUploadFile,
            icon: isUploading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.upload_file),
            label: Text(isUploading ? 'Uploading...' : 'Upload'),
          );
        },
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
              Icons.description_outlined,
              size: 80,
              color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
            ),
            const SizedBox(height: 24),
            Text(
              'No Documents Yet',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Upload documents to train your chatbot with custom knowledge',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: _pickAndUploadFile,
              icon: const Icon(Icons.upload_file),
              label: const Text('Upload Document'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, Document document) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete Document'),
        content: Text(
          'Are you sure you want to delete "${document.filename}"? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              context.read<ChatbotBloc>().add(ChatbotDeleteDocument(
                    botId: widget.botId,
                    documentId: document.id,
                  ));
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

/// Document card widget
class _DocumentCard extends StatelessWidget {
  final Document document;
  final VoidCallback onDelete;

  const _DocumentCard({
    required this.document,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // File icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _getIconColor(document.extension).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                _getFileIcon(document.extension),
                color: _getIconColor(document.extension),
              ),
            ),
            const SizedBox(width: 12),

            // File info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    document.filename,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        document.formattedSize,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text('•'),
                      const SizedBox(width: 8),
                      Text(
                        document.createdAt.timeAgo,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  _StatusBadge(status: document.status),
                ],
              ),
            ),

            // Delete button
            IconButton(
              icon: Icon(
                Icons.delete_outline,
                color: colorScheme.error,
              ),
              onPressed: onDelete,
            ),
          ],
        ),
      ),
    );
  }

  IconData _getFileIcon(String extension) {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'doc':
      case 'docx':
        return Icons.description;
      case 'txt':
        return Icons.text_snippet;
      case 'md':
        return Icons.code;
      default:
        return Icons.insert_drive_file;
    }
  }

  Color _getIconColor(String extension) {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return Colors.red;
      case 'doc':
      case 'docx':
        return Colors.blue;
      case 'txt':
        return Colors.grey;
      case 'md':
        return Colors.teal;
      default:
        return Colors.orange;
    }
  }
}

/// Status badge widget
class _StatusBadge extends StatelessWidget {
  final DocumentStatus status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color textColor;
    String label;
    IconData icon;

    switch (status) {
      case DocumentStatus.pending:
        backgroundColor = Colors.grey.shade100;
        textColor = Colors.grey.shade700;
        label = 'Pending';
        icon = Icons.hourglass_empty;
        break;
      case DocumentStatus.processing:
        backgroundColor = Colors.blue.shade100;
        textColor = Colors.blue.shade700;
        label = 'Processing';
        icon = Icons.sync;
        break;
      case DocumentStatus.processed:
        backgroundColor = Colors.green.shade100;
        textColor = Colors.green.shade700;
        label = 'Ready';
        icon = Icons.check_circle_outline;
        break;
      case DocumentStatus.failed:
        backgroundColor = Colors.red.shade100;
        textColor = Colors.red.shade700;
        label = 'Failed';
        icon = Icons.error_outline;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
