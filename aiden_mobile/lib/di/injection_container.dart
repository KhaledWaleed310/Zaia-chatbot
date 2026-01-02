import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get_it/get_it.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'package:aiden_mobile/core/api/api_client.dart';
import 'package:aiden_mobile/core/utils/secure_storage.dart';
import 'package:aiden_mobile/core/websocket/websocket_client.dart';
import 'package:aiden_mobile/data/datasources/local/auth_local_datasource.dart';
import 'package:aiden_mobile/data/datasources/local/chatbot_local_datasource.dart';
import 'package:aiden_mobile/data/datasources/remote/auth_remote_datasource.dart';
import 'package:aiden_mobile/data/datasources/remote/chatbot_remote_datasource.dart';
import 'package:aiden_mobile/data/datasources/remote/chat_remote_datasource.dart';
import 'package:aiden_mobile/data/repositories/auth_repository_impl.dart';
import 'package:aiden_mobile/data/repositories/chatbot_repository_impl.dart';
import 'package:aiden_mobile/data/repositories/chat_repository_impl.dart';
import 'package:aiden_mobile/domain/repositories/auth_repository.dart';
import 'package:aiden_mobile/domain/repositories/chatbot_repository.dart';
import 'package:aiden_mobile/domain/repositories/chat_repository.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_bloc.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_bloc.dart';
import 'package:aiden_mobile/presentation/features/chat/bloc/chat_bloc.dart';

/// Global service locator instance
final GetIt getIt = GetIt.instance;

/// Configure all dependencies
Future<void> configureDependencies() async {
  // ============================================
  // EXTERNAL SERVICES
  // ============================================

  // Secure Storage
  getIt.registerLazySingleton<FlutterSecureStorage>(
    () => const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
    ),
  );

  // Connectivity
  getIt.registerLazySingleton<Connectivity>(() => Connectivity());

  // Hive boxes
  getIt.registerLazySingleton<Box<dynamic>>(
    () => Hive.box<dynamic>('cache'),
    instanceName: 'cacheBox',
  );
  getIt.registerLazySingleton<Box<dynamic>>(
    () => Hive.box<dynamic>('settings'),
    instanceName: 'settingsBox',
  );
  getIt.registerLazySingleton<Box<dynamic>>(
    () => Hive.box<dynamic>('chatbots'),
    instanceName: 'chatbotsBox',
  );
  getIt.registerLazySingleton<Box<dynamic>>(
    () => Hive.box<dynamic>('conversations'),
    instanceName: 'conversationsBox',
  );

  // ============================================
  // CORE SERVICES
  // ============================================

  // Secure Storage Service
  getIt.registerLazySingleton<SecureStorageService>(
    () => SecureStorageService(storage: getIt<FlutterSecureStorage>()),
  );

  // API Client
  getIt.registerLazySingleton<ApiClient>(
    () => ApiClient(secureStorage: getIt<FlutterSecureStorage>()),
  );

  // WebSocket Client
  getIt.registerLazySingleton<WebSocketClient>(
    () => WebSocketClient(secureStorage: getIt<SecureStorageService>()),
  );

  // ============================================
  // AUTH FEATURE
  // ============================================

  // Remote data source
  getIt.registerLazySingleton<AuthRemoteDatasource>(
    () => AuthRemoteDatasourceImpl(apiClient: getIt<ApiClient>()),
  );

  // Local data source
  getIt.registerLazySingleton<AuthLocalDatasource>(
    () => AuthLocalDatasourceImpl(
      secureStorage: getIt<SecureStorageService>(),
      cacheBox: getIt<Box<dynamic>>(instanceName: 'cacheBox'),
    ),
  );

  // Repository
  getIt.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDatasource: getIt<AuthRemoteDatasource>(),
      localDatasource: getIt<AuthLocalDatasource>(),
      connectivity: getIt<Connectivity>(),
    ),
  );

  // BLoC
  getIt.registerFactory<AuthBloc>(
    () => AuthBloc(authRepository: getIt<AuthRepository>()),
  );

  // ============================================
  // CHATBOT FEATURE
  // ============================================

  // Remote data source
  getIt.registerLazySingleton<ChatbotRemoteDatasource>(
    () => ChatbotRemoteDatasourceImpl(apiClient: getIt<ApiClient>()),
  );

  // Local data source
  getIt.registerLazySingleton<ChatbotLocalDatasource>(
    () => ChatbotLocalDatasourceImpl(
      chatbotsBox: getIt<Box<dynamic>>(instanceName: 'chatbotsBox'),
    ),
  );

  // Repository
  getIt.registerLazySingleton<ChatbotRepository>(
    () => ChatbotRepositoryImpl(
      remoteDatasource: getIt<ChatbotRemoteDatasource>(),
      localDatasource: getIt<ChatbotLocalDatasource>(),
      connectivity: getIt<Connectivity>(),
    ),
  );

  // BLoC
  getIt.registerFactory<ChatbotBloc>(
    () => ChatbotBloc(chatbotRepository: getIt<ChatbotRepository>()),
  );

  // ============================================
  // CHAT FEATURE
  // ============================================

  // Remote data source
  getIt.registerLazySingleton<ChatRemoteDatasource>(
    () => ChatRemoteDatasourceImpl(apiClient: getIt<ApiClient>()),
  );

  // Repository
  getIt.registerLazySingleton<ChatRepository>(
    () => ChatRepositoryImpl(remoteDatasource: getIt<ChatRemoteDatasource>()),
  );

  // BLoC
  getIt.registerFactory<ChatBloc>(
    () => ChatBloc(chatRepository: getIt<ChatRepository>()),
  );
}

/// Reset all dependencies (useful for testing)
Future<void> resetDependencies() async {
  await getIt.reset();
}
