import 'package:equatable/equatable.dart';

/// Base class for chat events
abstract class ChatEvent extends Equatable {
  const ChatEvent();

  @override
  List<Object?> get props => [];
}

/// Initialize chat for a bot
class ChatInitialize extends ChatEvent {
  final String botId;
  final String? sessionId;

  const ChatInitialize({required this.botId, this.sessionId});

  @override
  List<Object?> get props => [botId, sessionId];
}

/// Send a message
class ChatSendMessage extends ChatEvent {
  final String message;

  const ChatSendMessage({required this.message});

  @override
  List<Object?> get props => [message];
}

/// Load conversations
class ChatLoadConversations extends ChatEvent {
  final String botId;

  const ChatLoadConversations({required this.botId});

  @override
  List<Object?> get props => [botId];
}

/// Select a conversation
class ChatSelectConversation extends ChatEvent {
  final String sessionId;

  const ChatSelectConversation({required this.sessionId});

  @override
  List<Object?> get props => [sessionId];
}

/// Start new conversation
class ChatNewConversation extends ChatEvent {
  const ChatNewConversation();
}

/// Delete a conversation
class ChatDeleteConversation extends ChatEvent {
  final String sessionId;

  const ChatDeleteConversation({required this.sessionId});

  @override
  List<Object?> get props => [sessionId];
}

/// Clear error
class ChatClearError extends ChatEvent {
  const ChatClearError();
}
