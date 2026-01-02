import 'package:json_annotation/json_annotation.dart';

part 'chatbot_model.g.dart';

/// Chatbot model from API
@JsonSerializable()
class ChatbotModel {
  final String id;
  @JsonKey(name: 'tenant_id')
  final String tenantId;
  final String name;
  @JsonKey(name: 'system_prompt')
  final String? systemPrompt;
  @JsonKey(name: 'welcome_message')
  final String? welcomeMessage;
  @JsonKey(name: 'primary_color')
  final String? primaryColor;
  @JsonKey(name: 'text_color')
  final String? textColor;
  final String? position;
  @JsonKey(name: 'is_personal')
  final bool isPersonal;
  @JsonKey(name: 'is_public')
  final bool isPublic;
  @JsonKey(name: 'has_password')
  final bool hasPassword;
  @JsonKey(name: 'share_link')
  final String? shareLink;
  @JsonKey(name: 'document_count')
  final int documentCount;
  @JsonKey(name: 'total_messages')
  final int totalMessages;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  const ChatbotModel({
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

  factory ChatbotModel.fromJson(Map<String, dynamic> json) =>
      _$ChatbotModelFromJson(json);

  Map<String, dynamic> toJson() => _$ChatbotModelToJson(this);
}

/// Request to create a chatbot
@JsonSerializable()
class ChatbotCreateRequest {
  final String name;
  @JsonKey(name: 'system_prompt')
  final String? systemPrompt;
  @JsonKey(name: 'welcome_message')
  final String? welcomeMessage;
  @JsonKey(name: 'primary_color')
  final String? primaryColor;
  @JsonKey(name: 'text_color')
  final String? textColor;
  final String? position;
  @JsonKey(name: 'is_personal')
  final bool? isPersonal;

  const ChatbotCreateRequest({
    required this.name,
    this.systemPrompt,
    this.welcomeMessage,
    this.primaryColor,
    this.textColor,
    this.position,
    this.isPersonal,
  });

  factory ChatbotCreateRequest.fromJson(Map<String, dynamic> json) =>
      _$ChatbotCreateRequestFromJson(json);

  Map<String, dynamic> toJson() => _$ChatbotCreateRequestToJson(this);
}

/// Request to update a chatbot
@JsonSerializable()
class ChatbotUpdateRequest {
  final String? name;
  @JsonKey(name: 'system_prompt')
  final String? systemPrompt;
  @JsonKey(name: 'welcome_message')
  final String? welcomeMessage;
  @JsonKey(name: 'primary_color')
  final String? primaryColor;
  @JsonKey(name: 'text_color')
  final String? textColor;
  final String? position;
  @JsonKey(name: 'is_public')
  final bool? isPublic;
  @JsonKey(name: 'share_password')
  final String? sharePassword;
  @JsonKey(name: 'is_personal')
  final bool? isPersonal;

  const ChatbotUpdateRequest({
    this.name,
    this.systemPrompt,
    this.welcomeMessage,
    this.primaryColor,
    this.textColor,
    this.position,
    this.isPublic,
    this.sharePassword,
    this.isPersonal,
  });

  factory ChatbotUpdateRequest.fromJson(Map<String, dynamic> json) =>
      _$ChatbotUpdateRequestFromJson(json);

  Map<String, dynamic> toJson() => _$ChatbotUpdateRequestToJson(this);
}

/// Document model
@JsonSerializable()
class DocumentModel {
  final String id;
  final String filename;
  @JsonKey(name: 'content_type')
  final String contentType;
  final int size;
  final String status;
  @JsonKey(name: 'chunks_count')
  final int chunksCount;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;

  const DocumentModel({
    required this.id,
    required this.filename,
    required this.contentType,
    required this.size,
    required this.status,
    this.chunksCount = 0,
    required this.createdAt,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) =>
      _$DocumentModelFromJson(json);

  Map<String, dynamic> toJson() => _$DocumentModelToJson(this);

  /// Check if document is processing
  bool get isProcessing => status == 'processing';

  /// Check if document is ready
  bool get isReady => status == 'processed';

  /// Check if document failed
  bool get isFailed => status == 'failed';

  /// Get formatted file size
  String get formattedSize {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

/// Embed code response
@JsonSerializable()
class EmbedCodeModel {
  @JsonKey(name: 'script_tag')
  final String scriptTag;
  @JsonKey(name: 'div_tag')
  final String divTag;
  @JsonKey(name: 'full_snippet')
  final String fullSnippet;

  const EmbedCodeModel({
    required this.scriptTag,
    required this.divTag,
    required this.fullSnippet,
  });

  factory EmbedCodeModel.fromJson(Map<String, dynamic> json) =>
      _$EmbedCodeModelFromJson(json);

  Map<String, dynamic> toJson() => _$EmbedCodeModelToJson(this);
}
