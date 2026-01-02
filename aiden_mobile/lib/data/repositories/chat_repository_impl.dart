import 'package:dartz/dartz.dart';
import 'package:uuid/uuid.dart';

import 'package:aiden_mobile/core/api/api_exceptions.dart';
import 'package:aiden_mobile/core/error/failures.dart';
import 'package:aiden_mobile/data/datasources/remote/chat_remote_datasource.dart';
import 'package:aiden_mobile/domain/entities/message.dart';
import 'package:aiden_mobile/domain/repositories/chat_repository.dart';

/// Implementation of ChatRepository
class ChatRepositoryImpl implements ChatRepository {
  final ChatRemoteDatasource remoteDatasource;
  final Uuid _uuid = const Uuid();

  ChatRepositoryImpl({required this.remoteDatasource});

  @override
  Future<Either<Failure, Message>> sendMessage(
    String botId,
    String message,
    String? sessionId,
  ) async {
    try {
      final response = await remoteDatasource.sendMessage(
        botId,
        message,
        sessionId,
      );

      final sources = response.sources
          .map((s) => Source.fromJson(s))
          .toList();

      return Right(Message(
        id: _uuid.v4(),
        role: 'assistant',
        content: response.response,
        timestamp: DateTime.now(),
        sources: sources,
      ));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Stream<Either<Failure, String>> sendMessageStream(
    String botId,
    String message,
    String? sessionId,
  ) async* {
    try {
      await for (final chunk in remoteDatasource.sendMessageStream(
        botId,
        message,
        sessionId,
      )) {
        yield Right(chunk);
      }
    } on ApiException catch (e) {
      yield Left(ServerFailure(e.message));
    } catch (e) {
      yield Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<Conversation>>> getConversations(
    String botId,
  ) async {
    try {
      final conversations = await remoteDatasource.getConversations(botId);
      return Right(conversations
          .map((c) => Conversation(
                id: c.id,
                sessionId: c.sessionId,
                title: c.title ?? 'New Conversation',
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                messageCount: c.messageCount,
              ))
          .toList());
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, Conversation>> getConversation(
    String botId,
    String sessionId,
  ) async {
    try {
      final detail = await remoteDatasource.getConversation(botId, sessionId);

      final messages = detail.messages.map((m) {
        final sources = (m['sources'] as List<dynamic>?)
            ?.map((s) => Source.fromJson(s as Map<String, dynamic>))
            .toList();

        return Message(
          id: _uuid.v4(),
          role: m['role'] as String,
          content: m['content'] as String,
          timestamp: DateTime.parse(m['timestamp'] as String),
          sources: sources,
        );
      }).toList();

      return Right(Conversation(
        id: detail.id,
        sessionId: detail.sessionId,
        title: detail.title ?? 'New Conversation',
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
        messageCount: messages.length,
        messages: messages,
      ));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> deleteConversation(
    String botId,
    String sessionId,
  ) async {
    try {
      await remoteDatasource.deleteConversation(botId, sessionId);
      return const Right(null);
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }
}
