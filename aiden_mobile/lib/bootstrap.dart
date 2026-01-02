import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:aiden_mobile/di/injection_container.dart';

/// Bootstrap function to initialize all app dependencies
Future<void> bootstrap() async {
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialize Hive for local storage
  await Hive.initFlutter();

  // Open Hive boxes
  await _openHiveBoxes();

  // Initialize dependency injection
  await configureDependencies();

  // Set up BLoC observer for debugging
  if (kDebugMode) {
    Bloc.observer = AppBlocObserver();
  }
}

/// Open all required Hive boxes
Future<void> _openHiveBoxes() async {
  await Hive.openBox<dynamic>('cache');
  await Hive.openBox<dynamic>('settings');
  await Hive.openBox<dynamic>('chatbots');
  await Hive.openBox<dynamic>('conversations');
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
