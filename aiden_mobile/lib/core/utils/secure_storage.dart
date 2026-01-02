import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wrapper for secure storage operations with timeout protection
class SecureStorageService {
  final FlutterSecureStorage _storage;

  // Storage keys
  static const String keyAccessToken = 'access_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUserId = 'user_id';
  static const String keyUserEmail = 'user_email';
  static const String keyUserRole = 'user_role';

  /// Default timeout for storage operations
  static const Duration _defaultTimeout = Duration(seconds: 3);

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  // ============================================
  // PRIVATE HELPERS WITH TIMEOUT
  // ============================================

  /// Execute storage read operation with timeout
  Future<String?> _readWithTimeout(
    String key, {
    Duration? timeout,
  }) async {
    try {
      return await _storage.read(key: key).timeout(
            timeout ?? _defaultTimeout,
            onTimeout: () {
              if (kDebugMode) print('SecureStorage read timed out for key: $key');
              return null;
            },
          );
    } catch (e) {
      if (kDebugMode) print('SecureStorage read failed for key $key: $e');
      return null;
    }
  }

  /// Execute storage write operation with timeout (returns success/failure)
  Future<bool> _writeWithTimeout(
    String key,
    String value, {
    Duration? timeout,
  }) async {
    try {
      await _storage.write(key: key, value: value).timeout(
            timeout ?? _defaultTimeout,
          );
      return true;
    } catch (e) {
      if (kDebugMode) print('SecureStorage write failed for key $key: $e');
      return false;
    }
  }

  /// Execute storage delete operation with timeout (returns success/failure)
  Future<bool> _deleteWithTimeout(
    String key, {
    Duration? timeout,
  }) async {
    try {
      await _storage.delete(key: key).timeout(
            timeout ?? _defaultTimeout,
          );
      return true;
    } catch (e) {
      if (kDebugMode) print('SecureStorage delete failed for key $key: $e');
      return false;
    }
  }

  // ============================================
  // TOKEN OPERATIONS
  // ============================================

  /// Save access token
  Future<bool> saveAccessToken(String token) async {
    return _writeWithTimeout(keyAccessToken, token);
  }

  /// Get access token (returns null on timeout/error)
  Future<String?> getAccessToken() async {
    return _readWithTimeout(keyAccessToken);
  }

  /// Save refresh token
  Future<bool> saveRefreshToken(String token) async {
    return _writeWithTimeout(keyRefreshToken, token);
  }

  /// Get refresh token
  Future<String?> getRefreshToken() async {
    return _readWithTimeout(keyRefreshToken);
  }

  /// Check if user has valid token (safe - returns false on timeout)
  Future<bool> hasToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Clear all tokens
  Future<bool> clearTokens() async {
    final accessResult = await _deleteWithTimeout(keyAccessToken);
    final refreshResult = await _deleteWithTimeout(keyRefreshToken);
    return accessResult && refreshResult;
  }

  // ============================================
  // USER DATA OPERATIONS
  // ============================================

  /// Save user ID
  Future<bool> saveUserId(String userId) async {
    return _writeWithTimeout(keyUserId, userId);
  }

  /// Get user ID
  Future<String?> getUserId() async {
    return _readWithTimeout(keyUserId);
  }

  /// Save user email
  Future<bool> saveUserEmail(String email) async {
    return _writeWithTimeout(keyUserEmail, email);
  }

  /// Get user email
  Future<String?> getUserEmail() async {
    return _readWithTimeout(keyUserEmail);
  }

  /// Save user role
  Future<bool> saveUserRole(String role) async {
    return _writeWithTimeout(keyUserRole, role);
  }

  /// Get user role
  Future<String?> getUserRole() async {
    return _readWithTimeout(keyUserRole);
  }

  // ============================================
  // GENERAL OPERATIONS
  // ============================================

  /// Save a key-value pair
  Future<bool> write(String key, String value) async {
    return _writeWithTimeout(key, value);
  }

  /// Read a value by key
  Future<String?> read(String key) async {
    return _readWithTimeout(key);
  }

  /// Delete a value by key
  Future<bool> delete(String key) async {
    return _deleteWithTimeout(key);
  }

  /// Clear all stored data
  Future<bool> clearAll() async {
    try {
      await _storage.deleteAll().timeout(_defaultTimeout);
      return true;
    } catch (e) {
      if (kDebugMode) print('SecureStorage clearAll failed: $e');
      return false;
    }
  }

  /// Check if a key exists (returns false on timeout/error)
  Future<bool> containsKey(String key) async {
    try {
      return await _storage.containsKey(key: key).timeout(
            _defaultTimeout,
            onTimeout: () => false,
          );
    } catch (e) {
      if (kDebugMode) print('SecureStorage containsKey failed for $key: $e');
      return false;
    }
  }

  /// Get all stored keys (returns empty map on error)
  Future<Map<String, String>> readAll() async {
    try {
      return await _storage.readAll().timeout(
            _defaultTimeout,
            onTimeout: () => <String, String>{},
          );
    } catch (e) {
      if (kDebugMode) print('SecureStorage readAll failed: $e');
      return <String, String>{};
    }
  }
}
