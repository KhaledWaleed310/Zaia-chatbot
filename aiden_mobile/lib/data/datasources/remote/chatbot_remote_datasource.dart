import 'dart:io';

import 'package:dio/dio.dart';

import 'package:aiden_mobile/core/api/api_client.dart';
import 'package:aiden_mobile/core/api/api_endpoints.dart';
import 'package:aiden_mobile/core/api/api_exceptions.dart';
import 'package:aiden_mobile/data/models/chatbot/chatbot_model.dart';

/// Remote datasource for chatbot operations
abstract class ChatbotRemoteDatasource {
  /// Get all chatbots for the current user
  Future<List<ChatbotModel>> getChatbots();

  /// Get a specific chatbot by ID
  Future<ChatbotModel> getChatbot(String botId);

  /// Create a new chatbot
  Future<ChatbotModel> createChatbot(ChatbotCreateRequest request);

  /// Update a chatbot
  Future<ChatbotModel> updateChatbot(String botId, ChatbotUpdateRequest request);

  /// Delete a chatbot
  Future<void> deleteChatbot(String botId);

  /// Get embed code for a chatbot
  Future<EmbedCodeModel> getEmbedCode(String botId);

  /// Get documents for a chatbot
  Future<List<DocumentModel>> getDocuments(String botId);

  /// Upload a document
  Future<DocumentModel> uploadDocument(String botId, File file);

  /// Delete a document
  Future<void> deleteDocument(String botId, String documentId);
}

/// Implementation of ChatbotRemoteDatasource
class ChatbotRemoteDatasourceImpl implements ChatbotRemoteDatasource {
  final ApiClient apiClient;

  ChatbotRemoteDatasourceImpl({required this.apiClient});

  @override
  Future<List<ChatbotModel>> getChatbots() async {
    try {
      final response = await apiClient.get(ApiEndpoints.chatbots);
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => ChatbotModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<ChatbotModel> getChatbot(String botId) async {
    try {
      final response = await apiClient.get(ApiEndpoints.chatbot(botId));
      return ChatbotModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<ChatbotModel> createChatbot(ChatbotCreateRequest request) async {
    try {
      final response = await apiClient.post(
        ApiEndpoints.chatbots,
        data: request.toJson(),
      );
      return ChatbotModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<ChatbotModel> updateChatbot(
    String botId,
    ChatbotUpdateRequest request,
  ) async {
    try {
      final response = await apiClient.patch(
        ApiEndpoints.chatbot(botId),
        data: request.toJson(),
      );
      return ChatbotModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<void> deleteChatbot(String botId) async {
    try {
      await apiClient.delete(ApiEndpoints.chatbot(botId));
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<EmbedCodeModel> getEmbedCode(String botId) async {
    try {
      final response = await apiClient.get(ApiEndpoints.chatbotEmbed(botId));
      return EmbedCodeModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<List<DocumentModel>> getDocuments(String botId) async {
    try {
      final response =
          await apiClient.get(ApiEndpoints.chatbotDocuments(botId));
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => DocumentModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<DocumentModel> uploadDocument(String botId, File file) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          file.path,
          filename: file.path.split('/').last,
        ),
      });

      final response = await apiClient.post(
        ApiEndpoints.chatbotDocuments(botId),
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );
      return DocumentModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<void> deleteDocument(String botId, String documentId) async {
    try {
      await apiClient.delete(ApiEndpoints.chatbotDocument(botId, documentId));
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  ApiException _handleError(DioException error) {
    if (error.response != null) {
      final statusCode = error.response!.statusCode;
      final data = error.response!.data;
      String message = 'An error occurred';

      if (data is Map<String, dynamic>) {
        message = data['detail'] as String? ?? message;
      }

      switch (statusCode) {
        case 400:
          return BadRequestException(message);
        case 401:
          return UnauthorizedException(message);
        case 403:
          return ForbiddenException(message);
        case 404:
          return NotFoundException(message);
        case 409:
          return ConflictException(message);
        case 422:
          return ValidationException(message);
        case 429:
          return RateLimitException(message);
        case 500:
        case 502:
        case 503:
          return ServerException(message);
        default:
          return ApiException(message, statusCode: statusCode);
      }
    }

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return TimeoutException('Request timed out');
    }

    if (error.type == DioExceptionType.connectionError) {
      return NetworkException('No internet connection');
    }

    return ApiException('An unexpected error occurred');
  }
}
