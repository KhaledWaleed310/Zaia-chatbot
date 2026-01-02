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
    try {
      final response = await apiClient.postStream(
        ApiEndpoints.chatMessageStream(botId),
        data: {
          'message': message,
          if (sessionId != null) 'session_id': sessionId,
        },
      );

      await for (final chunk in response.stream.transform(utf8.decoder)) {
        // Parse SSE format
        final lines = chunk.split('\n');
        for (final line in lines) {
          if (line.startsWith('data: ')) {
            final data = line.substring(6);
            if (data == '[DONE]') {
              return;
            }
            try {
              final json = jsonDecode(data) as Map<String, dynamic>;
              if (json.containsKey('content')) {
                yield json['content'] as String;
              } else if (json.containsKey('token')) {
                yield json['token'] as String;
              }
            } catch (e) {
              // If not JSON, yield as plain text
              yield data;
            }
          }
        }
      }
    } on DioException catch (e) {
      throw _handleError(e);
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
          return BadRequestException(message);
        case 401:
          return UnauthorizedException(message);
        case 403:
          return ForbiddenException(message);
        case 404:
          return NotFoundException(message);
        case 429:
          return RateLimitException(message);
        default:
          return ApiException(message, statusCode: statusCode);
      }
    }

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return TimeoutException('Request timed out');
    }

    return ApiException('An unexpected error occurred');
  }
}
