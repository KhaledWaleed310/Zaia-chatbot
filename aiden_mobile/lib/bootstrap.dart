import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:aiden_mobile/di/injection_container.dart';

/// Bootstrap result indicating success or failure
class BootstrapResult {
  final bool success;
  final String? errorMessage;
  final BootstrapFailureType? failureType;

  const BootstrapResult._({
    required this.success,
    this.errorMessage,
    this.failureType,
  });

  const BootstrapResult.success()
      : success = true,
        errorMessage = null,
        failureType = null;

  const BootstrapResult.failure({
    required String errorMessage,
    required BootstrapFailureType failureType,
  })  : success = false,
        errorMessage = errorMessage,
        failureType = failureType;
}

/// Types of bootstrap failures
enum BootstrapFailureType {
  hiveInit,
  hiveBoxes,
  dependencyInjection,
  timeout,
  unknown,
}

/// Bootstrap configuration
class BootstrapConfig {
  static const Duration totalTimeout = Duration(seconds: 10);
  static const Duration hiveInitTimeout = Duration(seconds: 5);
  static const Duration hiveBoxTimeout = Duration(seconds: 3);
  static const Duration diTimeout = Duration(seconds: 3);
}

/// Bootstrap function with timeout protection
/// Returns BootstrapResult indicating success or failure
Future<BootstrapResult> bootstrap() async {
  try {
    return await _performBootstrap().timeout(
      BootstrapConfig.totalTimeout,
      onTimeout: () => const BootstrapResult.failure(
        errorMessage: 'App initialization timed out. Please try again.',
        failureType: BootstrapFailureType.timeout,
      ),
    );
  } catch (e) {
    if (kDebugMode) print('Bootstrap error: $e');
    return BootstrapResult.failure(
      errorMessage: 'Initialization failed: ${e.toString()}',
      failureType: BootstrapFailureType.unknown,
    );
  }
}

/// Internal bootstrap implementation
Future<BootstrapResult> _performBootstrap() async {
  // Step 1: Set preferred orientations (fast, unlikely to fail)
  try {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  } catch (e) {
    // Non-critical, continue
    if (kDebugMode) print('Orientation setting failed: $e');
  }

  // Step 2: Initialize Hive with timeout
  try {
    await Hive.initFlutter().timeout(
      BootstrapConfig.hiveInitTimeout,
      onTimeout: () => throw TimeoutException('Hive init timeout'),
    );
  } on TimeoutException {
    return const BootstrapResult.failure(
      errorMessage: 'Storage initialization timed out.',
      failureType: BootstrapFailureType.hiveInit,
    );
  } catch (e) {
    if (kDebugMode) print('Hive init error: $e');
    return BootstrapResult.failure(
      errorMessage: 'Storage initialization failed: $e',
      failureType: BootstrapFailureType.hiveInit,
    );
  }

  // Step 3: Open Hive boxes with timeout and error recovery
  try {
    await _openHiveBoxesSafely().timeout(
      BootstrapConfig.hiveBoxTimeout,
      onTimeout: () => throw TimeoutException('Hive boxes timeout'),
    );
  } on TimeoutException {
    if (kDebugMode) print('Hive boxes timed out, attempting recovery...');
    // Try to recover by deleting and recreating boxes
    final recovered = await _recoverHiveBoxes();
    if (!recovered) {
      return const BootstrapResult.failure(
        errorMessage: 'Storage access timed out. Data may be corrupted.',
        failureType: BootstrapFailureType.hiveBoxes,
      );
    }
  } catch (e) {
    if (kDebugMode) print('Hive boxes error: $e, attempting recovery...');
    // Try recovery
    final recovered = await _recoverHiveBoxes();
    if (!recovered) {
      return BootstrapResult.failure(
        errorMessage: 'Storage access failed: $e',
        failureType: BootstrapFailureType.hiveBoxes,
      );
    }
  }

  // Step 4: Initialize dependency injection with timeout
  try {
    await configureDependencies().timeout(
      BootstrapConfig.diTimeout,
      onTimeout: () => throw TimeoutException('DI timeout'),
    );
  } on TimeoutException {
    return const BootstrapResult.failure(
      errorMessage: 'Service initialization timed out.',
      failureType: BootstrapFailureType.dependencyInjection,
    );
  } catch (e) {
    if (kDebugMode) print('DI error: $e');
    return BootstrapResult.failure(
      errorMessage: 'Service initialization failed: $e',
      failureType: BootstrapFailureType.dependencyInjection,
    );
  }

  // Step 5: Set up BLoC observer for debugging
  if (kDebugMode) {
    Bloc.observer = AppBlocObserver();
  }

  return const BootstrapResult.success();
}

/// Open Hive boxes with individual error handling
Future<void> _openHiveBoxesSafely() async {
  final boxNames = ['cache', 'settings', 'chatbots', 'conversations'];

  for (final boxName in boxNames) {
    try {
      if (!Hive.isBoxOpen(boxName)) {
        await Hive.openBox<dynamic>(boxName);
      }
    } catch (e) {
      if (kDebugMode) print('Error opening box $boxName: $e');
      // Delete corrupted box and try again
      try {
        await Hive.deleteBoxFromDisk(boxName);
        await Hive.openBox<dynamic>(boxName);
      } catch (e2) {
        if (kDebugMode) print('Failed to recover box $boxName: $e2');
        rethrow;
      }
    }
  }
}

/// Attempt to recover from Hive box corruption
Future<bool> _recoverHiveBoxes() async {
  try {
    final boxNames = ['cache', 'settings', 'chatbots', 'conversations'];

    // Close all open boxes first
    try {
      await Hive.close();
    } catch (e) {
      if (kDebugMode) print('Error closing Hive: $e');
    }

    // Delete all boxes
    for (final boxName in boxNames) {
      try {
        await Hive.deleteBoxFromDisk(boxName);
      } catch (e) {
        if (kDebugMode) print('Error deleting box $boxName: $e');
      }
    }

    // Re-open fresh boxes
    for (final boxName in boxNames) {
      await Hive.openBox<dynamic>(boxName);
    }

    if (kDebugMode) print('Hive recovery successful');
    return true;
  } catch (e) {
    if (kDebugMode) print('Hive recovery failed: $e');
    return false;
  }
}

/// BLoC observer for debugging state changes
class AppBlocObserver extends BlocObserver {
  @override
  void onCreate(BlocBase<dynamic> bloc) {
    super.onCreate(bloc);
    if (kDebugMode) {
      print('onCreate -- ${bloc.runtimeType}');
    }
  }

  @override
  void onChange(BlocBase<dynamic> bloc, Change<dynamic> change) {
    super.onChange(bloc, change);
    if (kDebugMode) {
      print('onChange -- ${bloc.runtimeType}, $change');
    }
  }

  @override
  void onError(BlocBase<dynamic> bloc, Object error, StackTrace stackTrace) {
    if (kDebugMode) {
      print('onError -- ${bloc.runtimeType}, $error');
    }
    super.onError(bloc, error, stackTrace);
  }

  @override
  void onClose(BlocBase<dynamic> bloc) {
    super.onClose(bloc);
    if (kDebugMode) {
      print('onClose -- ${bloc.runtimeType}');
    }
  }
}
