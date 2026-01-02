import 'package:equatable/equatable.dart';

/// Chatbot domain entity
class Chatbot extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String? systemPrompt;
  final String? welcomeMessage;
  final String? primaryColor;
  final String? textColor;
  final String? position;
  final bool isPersonal;
  final bool isPublic;
  final bool hasPassword;
  final String? shareLink;
  final int documentCount;
  final int totalMessages;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Chatbot({
    required this.id,
    required this.tenantId,
    required this.name,
    this.systemPrompt,
    this.welcomeMessage,
    this.primaryColor,
    this.textColor,
    this.position,
    this.isPersonal = false,
    this.isPublic = false,
    this.hasPassword = false,
    this.shareLink,
    this.documentCount = 0,
    this.totalMessages = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Get default welcome message
  String get displayWelcomeMessage =>
      welcomeMessage ?? 'Hello! How can I help you today?';

  /// Get default primary color
  String get displayPrimaryColor => primaryColor ?? '#3B82F6';

  /// Get default text color
  String get displayTextColor => textColor ?? '#FFFFFF';

  /// Get default position
  String get displayPosition => position ?? 'bottom-right';

  /// Check if chatbot has documents
  bool get hasDocuments => documentCount > 0;

  /// Check if chatbot has been used
  bool get hasBeenUsed => totalMessages > 0;

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        systemPrompt,
        welcomeMessage,
        primaryColor,
        textColor,
        position,
        isPersonal,
        isPublic,
        hasPassword,
        shareLink,
        documentCount,
        totalMessages,
        createdAt,
        updatedAt,
      ];

  Chatbot copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? systemPrompt,
    String? welcomeMessage,
    String? primaryColor,
    String? textColor,
    String? position,
    bool? isPersonal,
    bool? isPublic,
    bool? hasPassword,
    String? shareLink,
    int? documentCount,
    int? totalMessages,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Chatbot(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      systemPrompt: systemPrompt ?? this.systemPrompt,
      welcomeMessage: welcomeMessage ?? this.welcomeMessage,
      primaryColor: primaryColor ?? this.primaryColor,
      textColor: textColor ?? this.textColor,
      position: position ?? this.position,
      isPersonal: isPersonal ?? this.isPersonal,
      isPublic: isPublic ?? this.isPublic,
      hasPassword: hasPassword ?? this.hasPassword,
      shareLink: shareLink ?? this.shareLink,
      documentCount: documentCount ?? this.documentCount,
      totalMessages: totalMessages ?? this.totalMessages,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Document domain entity
class Document extends Equatable {
  final String id;
  final String filename;
  final String contentType;
  final int size;
  final DocumentStatus status;
  final int chunksCount;
  final DateTime createdAt;

  const Document({
    required this.id,
    required this.filename,
    required this.contentType,
    required this.size,
    required this.status,
    this.chunksCount = 0,
    required this.createdAt,
  });

  /// Check if document is processing
  bool get isProcessing => status == DocumentStatus.processing;

  /// Check if document is ready
  bool get isReady => status == DocumentStatus.processed;

  /// Check if document failed
  bool get isFailed => status == DocumentStatus.failed;

  /// Get file extension
  String get extension {
    final parts = filename.split('.');
    return parts.length > 1 ? parts.last.toLowerCase() : '';
  }

  /// Get formatted file size
  String get formattedSize {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  List<Object?> get props => [
        id,
        filename,
        contentType,
        size,
        status,
        chunksCount,
        createdAt,
      ];
}

/// Document processing status
enum DocumentStatus {
  pending,
  processing,
  processed,
  failed;

  static DocumentStatus fromString(String value) {
    switch (value.toLowerCase()) {
      case 'pending':
        return DocumentStatus.pending;
      case 'processing':
        return DocumentStatus.processing;
      case 'processed':
        return DocumentStatus.processed;
      case 'failed':
        return DocumentStatus.failed;
      default:
        return DocumentStatus.pending;
    }
  }
}
