import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:aiden_mobile/bootstrap.dart';
import 'package:aiden_mobile/app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Show loading screen IMMEDIATELY while bootstrap runs
  runApp(const _LoadingApp());

  // Set up error handling
  FlutterError.onError = (details) {
    if (kDebugMode) {
      print('Flutter error: ${details.exception}');
    }
  };

  // Run bootstrap
  try {
    final result = await bootstrap();

    if (result.success) {
      runApp(const AidenApp());
    } else {
      runApp(BootstrapErrorApp(
        errorMessage: result.errorMessage ?? 'Unknown error',
      ));
    }
  } catch (e, stackTrace) {
    if (kDebugMode) {
      print('Main error: $e');
      print('Stack: $stackTrace');
    }
    runApp(BootstrapErrorApp(
      errorMessage: 'App failed to start: $e',
    ));
  }
}

/// Minimal loading app shown immediately during bootstrap
class _LoadingApp extends StatelessWidget {
  const _LoadingApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.blue,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(
                  Icons.smart_toy,
                  size: 60,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'AIDEN',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 48),
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              const Text(
                'Loading...',
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Error app shown when bootstrap fails
class BootstrapErrorApp extends StatelessWidget {
  final String errorMessage;

  const BootstrapErrorApp({
    super.key,
    required this.errorMessage,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AIDEN',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: BootstrapErrorScreen(errorMessage: errorMessage),
    );
  }
}

/// Error screen with retry and clear data options
class BootstrapErrorScreen extends StatefulWidget {
  final String errorMessage;

  const BootstrapErrorScreen({
    super.key,
    required this.errorMessage,
  });

  @override
  State<BootstrapErrorScreen> createState() => _BootstrapErrorScreenState();
}

class _BootstrapErrorScreenState extends State<BootstrapErrorScreen> {
  bool _isRetrying = false;
  bool _isClearing = false;
  String _currentError = '';

  @override
  void initState() {
    super.initState();
    _currentError = widget.errorMessage;
  }

  Future<void> _retry() async {
    setState(() => _isRetrying = true);

    try {
      final result = await bootstrap();

      if (result.success && mounted) {
        runApp(const AidenApp());
      } else if (mounted) {
        setState(() {
          _isRetrying = false;
          _currentError = result.errorMessage ?? 'Retry failed';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isRetrying = false;
          _currentError = 'Retry error: $e';
        });
      }
    }
  }

  Future<void> _clearDataAndRetry() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear App Data?'),
        content: const Text(
          'This will clear all cached data and log you out. '
          'You will need to log in again.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Clear Data'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isClearing = true);

    try {
      await _clearAllAppData();
      final result = await bootstrap();

      if (result.success && mounted) {
        runApp(const AidenApp());
      } else if (mounted) {
        setState(() {
          _isClearing = false;
          _currentError = result.errorMessage ?? 'Failed to restart';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isClearing = false;
          _currentError = 'Error: $e';
        });
      }
    }
  }

  Future<void> _clearAllAppData() async {
    try {
      await Hive.close();
    } catch (e) {
      if (kDebugMode) print('Error closing Hive: $e');
    }

    try {
      await Hive.deleteFromDisk();
    } catch (e) {
      if (kDebugMode) print('Error deleting Hive: $e');
    }

    try {
      const storage = FlutterSecureStorage(
        aOptions: AndroidOptions(encryptedSharedPreferences: true),
        iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
      );
      await storage.deleteAll().timeout(const Duration(seconds: 3));
    } catch (e) {
      if (kDebugMode) print('Error clearing secure storage: $e');
    }

    try {
      await Hive.initFlutter();
    } catch (e) {
      if (kDebugMode) print('Error re-initializing Hive: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.error_outline,
                  size: 64,
                  color: Colors.red.shade400,
                ),
              ),
              const SizedBox(height: 32),
              Text(
                'Unable to Start App',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                _currentError,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isRetrying || _isClearing ? null : _retry,
                  child: _isRetrying
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Retry'),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed:
                      _isRetrying || _isClearing ? null : _clearDataAndRetry,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                  ),
                  child: _isClearing
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.red,
                          ),
                        )
                      : const Text('Clear Data & Retry'),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'If the problem persists, try uninstalling and reinstalling the app.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey[500],
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
