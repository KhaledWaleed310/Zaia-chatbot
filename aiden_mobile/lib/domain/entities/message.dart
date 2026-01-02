import 'package:equatable/equatable.dart';

/// Chat message entity
class Message extends Equatable {
  final String id;
  final String role;
  final String content;
  final DateTime timestamp;
  final List<Source>? sources;
  final bool isStreaming;

  const Message({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.sources,
    this.isStreaming = false,
  });

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';
  bool get hasSources => sources != null && sources!.isNotEmpty;

  Message copyWith({
    String? id,
    String? role,
    String? content,
    DateTime? timestamp,
    List<Source>? sources,
    bool? isStreaming,
  }) {
    return Message(
      id: id ?? this.id,
      role: role ?? this.role,
      content: content ?? this.content,
      timestamp: timestamp ?? this.timestamp,
      sources: sources ?? this.sources,
      isStreaming: isStreaming ?? this.isStreaming,
    );
  }

  @override
  List<Object?> get props => [id, role, content, timestamp, sources, isStreaming];
}

/// Source reference for a message
class Source extends Equatable {
  final String filename;
  final String? content;
  final double? score;

  const Source({
    required this.filename,
    this.content,
    this.score,
  });

  factory Source.fromJson(Map<String, dynamic> json) {
    return Source(
      filename: json['filename'] as String? ?? 'Unknown',
      content: json['content'] as String?,
      score: (json['score'] as num?)?.toDouble(),
    );
  }

  @override
  List<Object?> get props => [filename, content, score];
}

/// Conversation entity
class Conversation extends Equatable {
  final String id;
  final String sessionId;
  final String title;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int messageCount;
  final List<Message>? messages;

  const Conversation({
    required this.id,
    required this.sessionId,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
    this.messageCount = 0,
    this.messages,
  });

  @override
  List<Object?> get props => [
        id,
        sessionId,
        title,
        createdAt,
        updatedAt,
        messageCount,
        messages,
      ];
}
