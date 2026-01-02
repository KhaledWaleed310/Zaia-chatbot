import 'package:json_annotation/json_annotation.dart';

part 'chat_model.g.dart';

/// Chat message request
@JsonSerializable()
class ChatMessageRequest {
  final String message;
  @JsonKey(name: 'session_id')
  final String? sessionId;

  const ChatMessageRequest({
    required this.message,
    this.sessionId,
  });

  factory ChatMessageRequest.fromJson(Map<String, dynamic> json) =>
      _$ChatMessageRequestFromJson(json);

  Map<String, dynamic> toJson() => _$ChatMessageRequestToJson(this);
}

/// Chat response from API
@JsonSerializable()
class ChatResponseModel {
  final String response;
  @JsonKey(name: 'session_id')
  final String sessionId;
  final List<Map<String, dynamic>> sources;

  const ChatResponseModel({
    required this.response,
    required this.sessionId,
    this.sources = const [],
  });

  factory ChatResponseModel.fromJson(Map<String, dynamic> json) =>
      _$ChatResponseModelFromJson(json);

  Map<String, dynamic> toJson() => _$ChatResponseModelToJson(this);
}

/// Message in a conversation
@JsonSerializable()
class MessageModel {
  final String role;
  final String content;
  final DateTime timestamp;
  final List<Map<String, dynamic>>? sources;

  const MessageModel({
    required this.role,
    required this.content,
    required this.timestamp,
    this.sources,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) =>
      _$MessageModelFromJson(json);

  Map<String, dynamic> toJson() => _$MessageModelToJson(this);

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';
}

/// Conversation list item
@JsonSerializable()
class ConversationListItemModel {
  final String id;
  @JsonKey(name: 'session_id')
  final String sessionId;
  final String? title;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;
  @JsonKey(name: 'message_count')
  final int messageCount;

  const ConversationListItemModel({
    required this.id,
    required this.sessionId,
    this.title,
    required this.createdAt,
    required this.updatedAt,
    this.messageCount = 0,
  });

  factory ConversationListItemModel.fromJson(Map<String, dynamic> json) =>
      _$ConversationListItemModelFromJson(json);

  Map<String, dynamic> toJson() => _$ConversationListItemModelToJson(this);
}

/// Conversation detail response
@JsonSerializable()
class ConversationDetailModel {
  final String id;
  @JsonKey(name: 'session_id')
  final String sessionId;
  final String? title;
  final List<Map<String, dynamic>> messages;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const ConversationDetailModel({
    required this.id,
    required this.sessionId,
    this.title,
    this.messages = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory ConversationDetailModel.fromJson(Map<String, dynamic> json) =>
      _$ConversationDetailModelFromJson(json);

  Map<String, dynamic> toJson() => _$ConversationDetailModelToJson(this);
}
