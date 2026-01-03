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

  const BootstrapResult.success()
      : success = true,
        errorMessage = null;

  const BootstrapResult.failure(String message)
      : success = false,
        errorMessage = message;
}

/// Bootstrap function with timeout protection
Future<BootstrapResult> bootstrap() async {
  try {
    // Run bootstrap with overall timeout
    return await _runBootstrap().timeout(
      const Duration(seconds: 15),
      onTimeout: () {
        if (kDebugMode) print('Bootstrap timed out after 15 seconds');
        return const BootstrapResult.failure(
          'App initialization timed out. Please try again.',
        );
      },
    );
  } catch (e, stackTrace) {
    if (kDebugMode) {
      print('Bootstrap error: $e');
      print('Stack trace: $stackTrace');
    }
    return BootstrapResult.failure('Initialization error: $e');
  }
}

/// Internal bootstrap implementation
Future<BootstrapResult> _runBootstrap() async {
  // Step 1: Set orientations (non-critical)
  try {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  } catch (e) {
    if (kDebugMode) print('Orientation error (non-critical): $e');
  }

  // Step 2: Initialize Hive
  try {
    await Hive.initFlutter().timeout(
      const Duration(seconds: 5),
      onTimeout: () {
        throw TimeoutException('Hive initialization timed out');
      },
    );
  } catch (e) {
    if (kDebugMode) print('Hive init error: $e');
    return BootstrapResult.failure('Storage initialization failed');
  }

  // Step 3: Open Hive boxes
  try {
    await _openHiveBoxes();
  } catch (e) {
    if (kDebugMode) print('Hive boxes error: $e');
    // Try recovery
    try {
      await _recoverHiveBoxes();
    } catch (e2) {
      if (kDebugMode) print('Hive recovery failed: $e2');
      return BootstrapResult.failure('Storage access failed');
    }
  }

  // Step 4: Configure dependencies
  try {
    await configureDependencies().timeout(
      const Duration(seconds: 5),
      onTimeout: () {
        throw TimeoutException('Dependency injection timed out');
      },
    );
  } catch (e) {
    if (kDebugMode) print('DI error: $e');
    return BootstrapResult.failure('Service initialization failed');
  }

  // Step 5: Setup BLoC observer (debug only)
  if (kDebugMode) {
    Bloc.observer = AppBlocObserver();
  }

  return const BootstrapResult.success();
}

/// Open Hive boxes
Future<void> _openHiveBoxes() async {
  final boxNames = ['cache', 'settings', 'chatbots', 'conversations'];

  for (final name in boxNames) {
    if (!Hive.isBoxOpen(name)) {
      await Hive.openBox<dynamic>(name).timeout(
        const Duration(seconds: 2),
        onTimeout: () {
          throw TimeoutException('Opening box $name timed out');
        },
      );
    }
  }
}

/// Recover from corrupted Hive boxes
Future<void> _recoverHiveBoxes() async {
  final boxNames = ['cache', 'settings', 'chatbots', 'conversations'];

  // Close all boxes
  try {
    await Hive.close();
  } catch (e) {
    if (kDebugMode) print('Error closing Hive: $e');
  }

  // Delete corrupted boxes
  for (final name in boxNames) {
    try {
      await Hive.deleteBoxFromDisk(name);
    } catch (e) {
      if (kDebugMode) print('Error deleting box $name: $e');
    }
  }

  // Re-open fresh boxes
  for (final name in boxNames) {
    await Hive.openBox<dynamic>(name);
  }
}

/// BLoC observer for debugging
class AppBlocObserver extends BlocObserver {
  @override
  void onCreate(BlocBase<dynamic> bloc) {
    super.onCreate(bloc);
    if (kDebugMode) print('BLoC created: ${bloc.runtimeType}');
  }

  @override
  void onChange(BlocBase<dynamic> bloc, Change<dynamic> change) {
    super.onChange(bloc, change);
    if (kDebugMode) print('BLoC change: ${bloc.runtimeType}');
  }

  @override
  void onError(BlocBase<dynamic> bloc, Object error, StackTrace stackTrace) {
    if (kDebugMode) print('BLoC error: ${bloc.runtimeType} - $error');
    super.onError(bloc, error, stackTrace);
  }

  @override
  void onClose(BlocBase<dynamic> bloc) {
    super.onClose(bloc);
    if (kDebugMode) print('BLoC closed: ${bloc.runtimeType}');
  }
}
