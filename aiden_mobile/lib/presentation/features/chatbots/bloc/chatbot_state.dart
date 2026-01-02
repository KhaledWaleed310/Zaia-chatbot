import 'package:equatable/equatable.dart';

import 'package:aiden_mobile/domain/entities/chatbot.dart';

/// Chatbot operation status
enum ChatbotStatus {
  initial,
  loading,
  loaded,
  creating,
  created,
  updating,
  updated,
  deleting,
  deleted,
  uploadingDocument,
  documentUploaded,
  deletingDocument,
  documentDeleted,
  error,
}

/// Chatbot state
class ChatbotState extends Equatable {
  final ChatbotStatus status;
  final List<Chatbot> chatbots;
  final Chatbot? selectedChatbot;
  final List<Document> documents;
  final String? errorMessage;
  final String? successMessage;
  final bool isLoadingDocuments;

  const ChatbotState({
    this.status = ChatbotStatus.initial,
    this.chatbots = const [],
    this.selectedChatbot,
    this.documents = const [],
    this.errorMessage,
    this.successMessage,
    this.isLoadingDocuments = false,
  });

  /// Initial state
  factory ChatbotState.initial() => const ChatbotState();

  /// Check if currently loading
  bool get isLoading =>
      status == ChatbotStatus.loading ||
      status == ChatbotStatus.creating ||
      status == ChatbotStatus.updating ||
      status == ChatbotStatus.deleting;

  /// Check if has error
  bool get hasError => status == ChatbotStatus.error && errorMessage != null;

  /// Check if has chatbots
  bool get hasChatbots => chatbots.isNotEmpty;

  /// Get chatbot count
  int get chatbotCount => chatbots.length;

  /// Get document count for selected chatbot
  int get documentCount => documents.length;

  /// Get documents that are still processing
  List<Document> get processingDocuments =>
      documents.where((d) => d.isProcessing).toList();

  /// Get documents that are ready
  List<Document> get readyDocuments =>
      documents.where((d) => d.isReady).toList();

  /// Get documents that failed
  List<Document> get failedDocuments =>
      documents.where((d) => d.isFailed).toList();

  ChatbotState copyWith({
    ChatbotStatus? status,
    List<Chatbot>? chatbots,
    Chatbot? selectedChatbot,
    bool clearSelectedChatbot = false,
    List<Document>? documents,
    String? errorMessage,
    bool clearError = false,
    String? successMessage,
    bool clearSuccess = false,
    bool? isLoadingDocuments,
  }) {
    return ChatbotState(
      status: status ?? this.status,
      chatbots: chatbots ?? this.chatbots,
      selectedChatbot: clearSelectedChatbot
          ? null
          : selectedChatbot ?? this.selectedChatbot,
      documents: documents ?? this.documents,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      successMessage: clearSuccess ? null : successMessage ?? this.successMessage,
      isLoadingDocuments: isLoadingDocuments ?? this.isLoadingDocuments,
    );
  }

  @override
  List<Object?> get props => [
        status,
        chatbots,
        selectedChatbot,
        documents,
        errorMessage,
        successMessage,
        isLoadingDocuments,
      ];
}
