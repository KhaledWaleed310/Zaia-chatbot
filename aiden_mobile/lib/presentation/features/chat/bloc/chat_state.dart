import 'package:equatable/equatable.dart';

import 'package:aiden_mobile/domain/entities/message.dart';

/// Chat status
enum ChatStatus {
  initial,
  loading,
  loaded,
  sending,
  streaming,
  error,
}

/// Chat state
class ChatState extends Equatable {
  final ChatStatus status;
  final String? botId;
  final String? sessionId;
  final List<Message> messages;
  final List<Conversation> conversations;
  final String streamingContent;
  final String? errorMessage;

  const ChatState({
    this.status = ChatStatus.initial,
    this.botId,
    this.sessionId,
    this.messages = const [],
    this.conversations = const [],
    this.streamingContent = '',
    this.errorMessage,
  });

  factory ChatState.initial() => const ChatState();

  bool get isLoading => status == ChatStatus.loading;
  bool get isSending => status == ChatStatus.sending;
  bool get isStreaming => status == ChatStatus.streaming;
  bool get hasError => status == ChatStatus.error && errorMessage != null;
  bool get hasMessages => messages.isNotEmpty;
  bool get hasConversations => conversations.isNotEmpty;

  ChatState copyWith({
    ChatStatus? status,
    String? botId,
    String? sessionId,
    bool clearSessionId = false,
    List<Message>? messages,
    List<Conversation>? conversations,
    String? streamingContent,
    String? errorMessage,
    bool clearError = false,
  }) {
    return ChatState(
      status: status ?? this.status,
      botId: botId ?? this.botId,
      sessionId: clearSessionId ? null : sessionId ?? this.sessionId,
      messages: messages ?? this.messages,
      conversations: conversations ?? this.conversations,
      streamingContent: streamingContent ?? this.streamingContent,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [
        status,
        botId,
        sessionId,
        messages,
        conversations,
        streamingContent,
        errorMessage,
      ];
}
