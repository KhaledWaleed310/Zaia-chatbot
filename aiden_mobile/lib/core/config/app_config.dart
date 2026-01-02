import 'package:flutter/foundation.dart';

/// Application configuration for different environments
class AppConfig {
  AppConfig._();

  /// Current environment
  static const Environment environment = kDebugMode
      ? Environment.development
      : Environment.production;

  /// Base API URL
  static String get apiBaseUrl {
    switch (environment) {
      case Environment.development:
        return 'http://10.0.2.2:8000/api/v1'; // Android emulator localhost
      case Environment.staging:
        return 'https://aidenlink.cloud/api/v1';
      case Environment.production:
        return 'https://aidenlink.cloud/api/v1';
    }
  }

  /// WebSocket URL for handoff
  static String get wsBaseUrl {
    switch (environment) {
      case Environment.development:
        return 'ws://10.0.2.2:8000/api/v1';
      case Environment.staging:
        return 'wss://aidenlink.cloud/ws/v1';
      case Environment.production:
        return 'wss://aidenlink.cloud/ws/v1';
    }
  }

  /// iOS simulator uses different localhost
  static String get iosApiBaseUrl {
    switch (environment) {
      case Environment.development:
        return 'http://localhost:8000/api/v1';
      case Environment.staging:
        return 'https://aidenlink.cloud/api/v1';
      case Environment.production:
        return 'https://aidenlink.cloud/api/v1';
    }
  }

  /// Request timeout duration
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);

  /// WebSocket reconnection settings
  static const int maxReconnectAttempts = 5;
  static const Duration reconnectDelay = Duration(seconds: 2);
  static const Duration pingInterval = Duration(seconds: 30);

  /// Cache settings
  static const Duration defaultCacheTtl = Duration(hours: 1);
  static const Duration chatbotCacheTtl = Duration(hours: 24);
  static const Duration analyticsCacheTtl = Duration(minutes: 15);

  /// Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  /// File upload limits
  static const int maxFileSizeMb = 10;
  static const List<String> allowedFileTypes = [
    'pdf',
    'doc',
    'docx',
    'txt',
    'md',
    'csv',
    'xls',
    'xlsx',
  ];

  /// App info
  static const String appName = 'AIDEN';
  static const String appVersion = '1.0.0';
  static const String supportEmail = 'support@aiden.app';
}

/// Environment types
enum Environment {
  development,
  staging,
  production,
}
