import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dartz/dartz.dart';

import 'package:aiden_mobile/core/api/api_exceptions.dart';
import 'package:aiden_mobile/core/error/failures.dart';
import 'package:aiden_mobile/data/datasources/local/chatbot_local_datasource.dart';
import 'package:aiden_mobile/data/datasources/remote/chatbot_remote_datasource.dart';
import 'package:aiden_mobile/data/models/chatbot/chatbot_model.dart';
import 'package:aiden_mobile/domain/entities/chatbot.dart';
import 'package:aiden_mobile/domain/repositories/chatbot_repository.dart';

/// Implementation of ChatbotRepository
class ChatbotRepositoryImpl implements ChatbotRepository {
  final ChatbotRemoteDatasource remoteDatasource;
  final ChatbotLocalDatasource localDatasource;
  final Connectivity connectivity;

  ChatbotRepositoryImpl({
    required this.remoteDatasource,
    required this.localDatasource,
    required this.connectivity,
  });

  Future<bool> _isConnected() async {
    final result = await connectivity.checkConnectivity();
    return !result.contains(ConnectivityResult.none);
  }

  @override
  Future<Either<Failure, List<Chatbot>>> getChatbots({
    bool forceRefresh = false,
  }) async {
    try {
      // Check cache validity if not forcing refresh
      if (!forceRefresh) {
        final isCacheValid = await localDatasource.isCacheValid();
        if (isCacheValid) {
          final cachedChatbots = await localDatasource.getChatbots();
          if (cachedChatbots.isNotEmpty) {
            return Right(cachedChatbots.map(_mapModelToEntity).toList());
          }
        }
      }

      // Check connectivity
      if (!await _isConnected()) {
        // Return cached data if offline
        final cachedChatbots = await localDatasource.getChatbots();
        if (cachedChatbots.isNotEmpty) {
          return Right(cachedChatbots.map(_mapModelToEntity).toList());
        }
        return const Left(NetworkFailure('No internet connection'));
      }

      // Fetch from remote
      final chatbots = await remoteDatasource.getChatbots();

      // Cache the results
      await localDatasource.cacheChatbots(chatbots);

      return Right(chatbots.map(_mapModelToEntity).toList());
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, Chatbot>> getChatbot(String botId) async {
    try {
      // Try cache first
      final cachedChatbot = await localDatasource.getChatbot(botId);

      if (!await _isConnected()) {
        if (cachedChatbot != null) {
          return Right(_mapModelToEntity(cachedChatbot));
        }
        return const Left(NetworkFailure('No internet connection'));
      }

      // Fetch from remote
      final chatbot = await remoteDatasource.getChatbot(botId);

      // Update cache
      await localDatasource.cacheChatbot(chatbot);

      return Right(_mapModelToEntity(chatbot));
    } on NotFoundException {
      return const Left(NotFoundFailure('Chatbot not found'));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, Chatbot>> createChatbot({
    required String name,
    String? systemPrompt,
    String? welcomeMessage,
    String? primaryColor,
    String? textColor,
    String? position,
    bool? isPersonal,
  }) async {
    try {
      if (!await _isConnected()) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final request = ChatbotCreateRequest(
        name: name,
        systemPrompt: systemPrompt,
        welcomeMessage: welcomeMessage,
        primaryColor: primaryColor,
        textColor: textColor,
        position: position,
        isPersonal: isPersonal,
      );

      final chatbot = await remoteDatasource.createChatbot(request);

      // Cache the new chatbot
      await localDatasource.cacheChatbot(chatbot);

      // Refresh the list
      final allChatbots = await localDatasource.getChatbots();
      final updatedList = [...allChatbots, chatbot];
      await localDatasource.cacheChatbots(updatedList);

      return Right(_mapModelToEntity(chatbot));
    } on ValidationException catch (e) {
      return Left(ValidationFailure(e.message));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
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
  }) async {
    try {
      if (!await _isConnected()) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final request = ChatbotUpdateRequest(
        name: name,
        systemPrompt: systemPrompt,
        welcomeMessage: welcomeMessage,
        primaryColor: primaryColor,
        textColor: textColor,
        position: position,
        isPublic: isPublic,
        sharePassword: sharePassword,
        isPersonal: isPersonal,
      );

      final chatbot = await remoteDatasource.updateChatbot(botId, request);

      // Update cache
      await localDatasource.cacheChatbot(chatbot);

      return Right(_mapModelToEntity(chatbot));
    } on NotFoundException {
      return const Left(NotFoundFailure('Chatbot not found'));
    } on ValidationException catch (e) {
      return Left(ValidationFailure(e.message));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> deleteChatbot(String botId) async {
    try {
      if (!await _isConnected()) {
        return const Left(NetworkFailure('No internet connection'));
      }

      await remoteDatasource.deleteChatbot(botId);

      // Remove from cache
      await localDatasource.removeChatbot(botId);

      return const Right(null);
    } on NotFoundException {
      return const Left(NotFoundFailure('Chatbot not found'));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<Document>>> getDocuments(String botId) async {
    try {
      // Try cache first
      final cachedDocs = await localDatasource.getDocuments(botId);

      if (!await _isConnected()) {
        return Right(cachedDocs.map(_mapDocumentModelToEntity).toList());
      }

      // Fetch from remote
      final documents = await remoteDatasource.getDocuments(botId);

      // Cache the results
      await localDatasource.cacheDocuments(botId, documents);

      return Right(documents.map(_mapDocumentModelToEntity).toList());
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, Document>> uploadDocument(
    String botId,
    File file,
  ) async {
    try {
      if (!await _isConnected()) {
        return const Left(NetworkFailure('No internet connection'));
      }

      final document = await remoteDatasource.uploadDocument(botId, file);

      // Update cached documents
      final documents = await remoteDatasource.getDocuments(botId);
      await localDatasource.cacheDocuments(botId, documents);

      return Right(_mapDocumentModelToEntity(document));
    } on ValidationException catch (e) {
      return Left(ValidationFailure(e.message));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> deleteDocument(
    String botId,
    String documentId,
  ) async {
    try {
      if (!await _isConnected()) {
        return const Left(NetworkFailure('No internet connection'));
      }

      await remoteDatasource.deleteDocument(botId, documentId);

      // Update cached documents
      final documents = await remoteDatasource.getDocuments(botId);
      await localDatasource.cacheDocuments(botId, documents);

      return const Right(null);
    } on NotFoundException {
      return const Left(NotFoundFailure('Document not found'));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  /// Map ChatbotModel to Chatbot entity
  Chatbot _mapModelToEntity(ChatbotModel model) {
    return Chatbot(
      id: model.id,
      tenantId: model.tenantId,
      name: model.name,
      systemPrompt: model.systemPrompt,
      welcomeMessage: model.welcomeMessage,
      primaryColor: model.primaryColor,
      textColor: model.textColor,
      position: model.position,
      isPersonal: model.isPersonal,
      isPublic: model.isPublic,
      hasPassword: model.hasPassword,
      shareLink: model.shareLink,
      documentCount: model.documentCount,
      totalMessages: model.totalMessages,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }

  /// Map DocumentModel to Document entity
  Document _mapDocumentModelToEntity(DocumentModel model) {
    return Document(
      id: model.id,
      filename: model.filename,
      contentType: model.contentType,
      size: model.size,
      status: DocumentStatus.fromString(model.status),
      chunksCount: model.chunksCount,
      createdAt: model.createdAt,
    );
  }
}
