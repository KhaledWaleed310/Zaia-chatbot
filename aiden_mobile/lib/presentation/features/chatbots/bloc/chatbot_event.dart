import 'dart:io';

import 'package:equatable/equatable.dart';

/// Base class for chatbot events
abstract class ChatbotEvent extends Equatable {
  const ChatbotEvent();

  @override
  List<Object?> get props => [];
}

/// Load all chatbots
class ChatbotLoadAll extends ChatbotEvent {
  final bool forceRefresh;

  const ChatbotLoadAll({this.forceRefresh = false});

  @override
  List<Object?> get props => [forceRefresh];
}

/// Load a single chatbot
class ChatbotLoadOne extends ChatbotEvent {
  final String botId;

  const ChatbotLoadOne({required this.botId});

  @override
  List<Object?> get props => [botId];
}

/// Create a new chatbot
class ChatbotCreate extends ChatbotEvent {
  final String name;
  final String? systemPrompt;
  final String? welcomeMessage;
  final String? primaryColor;
  final String? textColor;
  final String? position;
  final bool? isPersonal;

  const ChatbotCreate({
    required this.name,
    this.systemPrompt,
    this.welcomeMessage,
    this.primaryColor,
    this.textColor,
    this.position,
    this.isPersonal,
  });

  @override
  List<Object?> get props => [
        name,
        systemPrompt,
        welcomeMessage,
        primaryColor,
        textColor,
        position,
        isPersonal,
      ];
}

/// Update a chatbot
class ChatbotUpdate extends ChatbotEvent {
  final String botId;
  final String? name;
  final String? systemPrompt;
  final String? welcomeMessage;
  final String? primaryColor;
  final String? textColor;
  final String? position;
  final bool? isPublic;
  final String? sharePassword;
  final bool? isPersonal;

  const ChatbotUpdate({
    required this.botId,
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

  @override
  List<Object?> get props => [
        botId,
        name,
        systemPrompt,
        welcomeMessage,
        primaryColor,
        textColor,
        position,
        isPublic,
        sharePassword,
        isPersonal,
      ];
}

/// Delete a chatbot
class ChatbotDelete extends ChatbotEvent {
  final String botId;

  const ChatbotDelete({required this.botId});

  @override
  List<Object?> get props => [botId];
}

/// Load documents for a chatbot
class ChatbotLoadDocuments extends ChatbotEvent {
  final String botId;

  const ChatbotLoadDocuments({required this.botId});

  @override
  List<Object?> get props => [botId];
}

/// Upload a document
class ChatbotUploadDocument extends ChatbotEvent {
  final String botId;
  final File file;

  const ChatbotUploadDocument({
    required this.botId,
    required this.file,
  });

  @override
  List<Object?> get props => [botId, file];
}

/// Delete a document
class ChatbotDeleteDocument extends ChatbotEvent {
  final String botId;
  final String documentId;

  const ChatbotDeleteDocument({
    required this.botId,
    required this.documentId,
  });

  @override
  List<Object?> get props => [botId, documentId];
}

/// Select a chatbot
class ChatbotSelect extends ChatbotEvent {
  final String? botId;

  const ChatbotSelect({this.botId});

  @override
  List<Object?> get props => [botId];
}

/// Clear error state
class ChatbotClearError extends ChatbotEvent {
  const ChatbotClearError();
}

/// Clear success message
class ChatbotClearSuccess extends ChatbotEvent {
  const ChatbotClearSuccess();
}
