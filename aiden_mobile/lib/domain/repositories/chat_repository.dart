import 'package:dartz/dartz.dart';

import 'package:aiden_mobile/core/error/failures.dart';
import 'package:aiden_mobile/domain/entities/message.dart';

/// Repository interface for chat operations
abstract class ChatRepository {
  /// Send a message and get response
  Future<Either<Failure, Message>> sendMessage(
    String botId,
    String message,
    String? sessionId,
  );

  /// Send a message with streaming response
  Stream<Either<Failure, String>> sendMessageStream(
    String botId,
    String message,
    String? sessionId,
  );

  /// Get conversation list
  Future<Either<Failure, List<Conversation>>> getConversations(String botId);

  /// Get conversation detail with messages
  Future<Either<Failure, Conversation>> getConversation(
    String botId,
    String sessionId,
  );

  /// Delete a conversation
  Future<Either<Failure, void>> deleteConversation(
    String botId,
    String sessionId,
  );
}
