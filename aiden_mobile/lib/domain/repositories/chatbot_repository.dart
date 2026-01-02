import 'dart:io';

import 'package:dartz/dartz.dart';

import 'package:aiden_mobile/core/error/failures.dart';
import 'package:aiden_mobile/domain/entities/chatbot.dart';

/// Repository interface for chatbot operations
abstract class ChatbotRepository {
  /// Get all chatbots for the current user
  Future<Either<Failure, List<Chatbot>>> getChatbots({bool forceRefresh = false});

  /// Get a specific chatbot by ID
  Future<Either<Failure, Chatbot>> getChatbot(String botId);

  /// Create a new chatbot
  Future<Either<Failure, Chatbot>> createChatbot({
    required String name,
    String? systemPrompt,
    String? welcomeMessage,
    String? primaryColor,
    String? textColor,
    String? position,
    bool? isPersonal,
  });

  /// Update a chatbot
  Future<Either<Failure, Chatbot>> updateChatbot({
    required String botId,
    String? name,
    String? systemPrompt,
    String? welcomeMessage,
    String? primaryColor,
    String? textColor,
    String? position,
    bool? isPublic,
    String? sharePassword,
    bool? isPersonal,
  });

  /// Delete a chatbot
  Future<Either<Failure, void>> deleteChatbot(String botId);

  /// Get documents for a chatbot
  Future<Either<Failure, List<Document>>> getDocuments(String botId);

  /// Upload a document to a chatbot
  Future<Either<Failure, Document>> uploadDocument(String botId, File file);

  /// Delete a document from a chatbot
  Future<Either<Failure, void>> deleteDocument(String botId, String documentId);
}
