import 'dart:convert';

import 'package:hive_flutter/hive_flutter.dart';

import 'package:aiden_mobile/data/models/chatbot/chatbot_model.dart';

/// Local datasource for chatbot caching
abstract class ChatbotLocalDatasource {
  /// Get all cached chatbots
  Future<List<ChatbotModel>> getChatbots();

  /// Get a cached chatbot by ID
  Future<ChatbotModel?> getChatbot(String botId);

  /// Cache chatbots
  Future<void> cacheChatbots(List<ChatbotModel> chatbots);

  /// Cache a single chatbot
  Future<void> cacheChatbot(ChatbotModel chatbot);

  /// Remove a chatbot from cache
  Future<void> removeChatbot(String botId);

  /// Get cached documents for a chatbot
  Future<List<DocumentModel>> getDocuments(String botId);

  /// Cache documents for a chatbot
  Future<void> cacheDocuments(String botId, List<DocumentModel> documents);

  /// Clear all cached data
  Future<void> clearCache();

  /// Check if cache is valid
  Future<bool> isCacheValid();

  /// Get cache timestamp
  Future<DateTime?> getCacheTimestamp();
}

/// Implementation of ChatbotLocalDatasource
class ChatbotLocalDatasourceImpl implements ChatbotLocalDatasource {
  final Box<dynamic> chatbotsBox;

  static const String _chatbotsKey = 'chatbots';
  static const String _chatbotPrefix = 'chatbot_';
  static const String _documentsPrefix = 'documents_';
  static const String _cacheTimestampKey = 'cache_timestamp';
  static const Duration _cacheValidDuration = Duration(minutes: 30);

  ChatbotLocalDatasourceImpl({required this.chatbotsBox});

  @override
  Future<List<ChatbotModel>> getChatbots() async {
    try {
      final data = chatbotsBox.get(_chatbotsKey);
      if (data == null) return [];

      final List<dynamic> jsonList = jsonDecode(data as String) as List<dynamic>;
      return jsonList
          .map((json) => ChatbotModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  @override
  Future<ChatbotModel?> getChatbot(String botId) async {
    try {
      final data = chatbotsBox.get('$_chatbotPrefix$botId');
      if (data == null) return null;

      final json = jsonDecode(data as String) as Map<String, dynamic>;
      return ChatbotModel.fromJson(json);
    } catch (e) {
      return null;
    }
  }

  @override
  Future<void> cacheChatbots(List<ChatbotModel> chatbots) async {
    final jsonList = chatbots.map((c) => c.toJson()).toList();
    await chatbotsBox.put(_chatbotsKey, jsonEncode(jsonList));
    await chatbotsBox.put(
      _cacheTimestampKey,
      DateTime.now().toIso8601String(),
    );

    // Also cache individual chatbots
    for (final chatbot in chatbots) {
      await cacheChatbot(chatbot);
    }
  }

  @override
  Future<void> cacheChatbot(ChatbotModel chatbot) async {
    await chatbotsBox.put(
      '$_chatbotPrefix${chatbot.id}',
      jsonEncode(chatbot.toJson()),
    );
  }

  @override
  Future<void> removeChatbot(String botId) async {
    await chatbotsBox.delete('$_chatbotPrefix$botId');
    await chatbotsBox.delete('$_documentsPrefix$botId');

    // Update the chatbots list
    final chatbots = await getChatbots();
    final updatedList = chatbots.where((c) => c.id != botId).toList();
    await cacheChatbots(updatedList);
  }

  @override
  Future<List<DocumentModel>> getDocuments(String botId) async {
    try {
      final data = chatbotsBox.get('$_documentsPrefix$botId');
      if (data == null) return [];

      final List<dynamic> jsonList = jsonDecode(data as String) as List<dynamic>;
      return jsonList
          .map((json) => DocumentModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  @override
  Future<void> cacheDocuments(String botId, List<DocumentModel> documents) async {
    final jsonList = documents.map((d) => d.toJson()).toList();
    await chatbotsBox.put('$_documentsPrefix$botId', jsonEncode(jsonList));
  }

  @override
  Future<void> clearCache() async {
    await chatbotsBox.clear();
  }

  @override
  Future<bool> isCacheValid() async {
    final timestamp = await getCacheTimestamp();
    if (timestamp == null) return false;

    final now = DateTime.now();
    return now.difference(timestamp) < _cacheValidDuration;
  }

  @override
  Future<DateTime?> getCacheTimestamp() async {
    try {
      final timestamp = chatbotsBox.get(_cacheTimestampKey) as String?;
      if (timestamp == null) return null;
      return DateTime.parse(timestamp);
    } catch (e) {
      return null;
    }
  }
}
