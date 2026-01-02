import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:aiden_mobile/bootstrap.dart';
import 'package:aiden_mobile/app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final result = await bootstrap();

  if (result.success) {
    runApp(const AidenApp());
  } else {
    // Run error recovery app
    runApp(BootstrapErrorApp(
      errorMessage: result.errorMessage ?? 'Unknown error',
      failureType: result.failureType ?? BootstrapFailureType.unknown,
    ));
  }
}

/// Error app shown when bootstrap fails
class BootstrapErrorApp extends StatelessWidget {
  final String errorMessage;
  final BootstrapFailureType failureType;

  const BootstrapErrorApp({
    super.key,
    required this.errorMessage,
    required this.failureType,
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
      home: BootstrapErrorScreen(
        errorMessage: errorMessage,
        failureType: failureType,
      ),
    );
  }
}

/// Error screen with retry and clear data options
class BootstrapErrorScreen extends StatefulWidget {
  final String errorMessage;
  final BootstrapFailureType failureType;

  const BootstrapErrorScreen({
    super.key,
    required this.errorMessage,
    required this.failureType,
  });

  @override
  State<BootstrapErrorScreen> createState() => _BootstrapErrorScreenState();
}

class _BootstrapErrorScreenState extends State<BootstrapErrorScreen> {
  bool _isRetrying = false;
  bool _isClearing = false;

  Future<void> _retry() async {
    setState(() => _isRetrying = true);

    final result = await bootstrap();

    if (result.success && mounted) {
      // Navigate to main app by replacing the entire widget tree
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const AidenApp()),
        (route) => false,
      );
    } else if (mounted) {
      setState(() => _isRetrying = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.errorMessage ?? 'Retry failed'),
          backgroundColor: Colors.red,
        ),
      );
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
      // Clear all app data
      await _clearAllAppData();

      // Retry bootstrap
      final result = await bootstrap();

      if (result.success && mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const AidenApp()),
          (route) => false,
        );
      } else if (mounted) {
        setState(() => _isClearing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.errorMessage ?? 'Failed to restart'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isClearing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error clearing data: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Clear all app data for recovery
  Future<void> _clearAllAppData() async {
    try {
      // Close and delete all Hive boxes
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

      // Clear secure storage
      const storage = FlutterSecureStorage(
        aOptions: AndroidOptions(encryptedSharedPreferences: true),
        iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
      );

      try {
        await storage.deleteAll().timeout(const Duration(seconds: 3));
      } catch (e) {
        if (kDebugMode) print('Error clearing secure storage: $e');
      }

      // Re-initialize Hive for fresh start
      await Hive.initFlutter();
    } catch (e) {
      // Best effort - continue even if some clearing fails
      if (kDebugMode) print('Error during data clear: $e');
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
              // Error icon
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

              // Title
              Text(
                'Unable to Start App',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Error message
              Text(
                widget.errorMessage,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey[600],
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),

              // Retry button
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

              // Clear data button
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

              // Help text
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
