import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import 'package:aiden_mobile/core/api/api_client.dart';
import 'package:aiden_mobile/core/api/api_endpoints.dart';
import 'package:aiden_mobile/core/api/api_exceptions.dart';
import 'package:aiden_mobile/data/models/chat/chat_model.dart';

/// Remote datasource for chat operations
abstract class ChatRemoteDatasource {
  /// Send a message and get response (non-streaming)
  Future<ChatResponseModel> sendMessage(
    String botId,
    String message,
    String? sessionId,
  );

  /// Send a message with streaming response
  Stream<String> sendMessageStream(
    String botId,
    String message,
    String? sessionId,
  );

  /// Get conversation list
  Future<List<ConversationListItemModel>> getConversations(String botId);

  /// Get conversation detail
  Future<ConversationDetailModel> getConversation(
    String botId,
    String sessionId,
  );

  /// Delete a conversation
  Future<void> deleteConversation(String botId, String sessionId);
}

/// Implementation of ChatRemoteDatasource
class ChatRemoteDatasourceImpl implements ChatRemoteDatasource {
  final ApiClient apiClient;

  ChatRemoteDatasourceImpl({required this.apiClient});

  @override
  Future<ChatResponseModel> sendMessage(
    String botId,
    String message,
    String? sessionId,
  ) async {
    try {
      final response = await apiClient.post(
        ApiEndpoints.chatMessage(botId),
        data: {
          'message': message,
          if (sessionId != null) 'session_id': sessionId,
        },
      );
      return ChatResponseModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Stream<String> sendMessageStream(
    String botId,
    String message,
    String? sessionId,
  ) async* {
    // Streaming not implemented - use regular sendMessage instead
    // This is a placeholder that yields the full response at once
    try {
      final response = await sendMessage(botId, message, sessionId);
      yield response.response;
    } catch (e) {
      rethrow;
    }
  }

  @override
  Future<List<ConversationListItemModel>> getConversations(String botId) async {
    try {
      final response = await apiClient.get(ApiEndpoints.chatConversations(botId));
      final data = response.data as Map<String, dynamic>;
      final conversations = data['conversations'] as List<dynamic>;
      return conversations
          .map((json) =>
              ConversationListItemModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<ConversationDetailModel> getConversation(
    String botId,
    String sessionId,
  ) async {
    try {
      final response = await apiClient.get(
        ApiEndpoints.chatConversation(botId, sessionId),
      );
      return ConversationDetailModel.fromJson(
          response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  @override
  Future<void> deleteConversation(String botId, String sessionId) async {
    try {
      await apiClient.delete(ApiEndpoints.chatConversation(botId, sessionId));
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
          return ServerException(message: message, statusCode: 400);
        case 401:
          return UnauthorizedException(message: message);
        case 403:
          return ForbiddenException(message: message);
        case 404:
          return NotFoundException(message: message);
        case 429:
          return RateLimitException(message: message);
        default:
          return ApiException(message: message, statusCode: statusCode);
      }
    }

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return TimeoutException(message: 'Request timed out');
    }

    return ApiException(message: 'An unexpected error occurred');
  }
}
