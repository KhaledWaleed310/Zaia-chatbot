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
  static const Duration _timeout = Duration(seconds: 3);

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
  // TOKEN OPERATIONS
  // ============================================

  /// Save access token
  Future<void> saveAccessToken(String token) async {
    try {
      await _storage.write(key: keyAccessToken, value: token).timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error saving access token: $e');
      // Swallow error to prevent crashes
    }
  }

  /// Get access token (returns null on timeout/error)
  Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: keyAccessToken).timeout(
        _timeout,
        onTimeout: () => null,
      );
    } catch (e) {
      if (kDebugMode) print('Error getting access token: $e');
      return null;
    }
  }

  /// Save refresh token
  Future<void> saveRefreshToken(String token) async {
    try {
      await _storage.write(key: keyRefreshToken, value: token).timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error saving refresh token: $e');
    }
  }

  /// Get refresh token
  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: keyRefreshToken).timeout(
        _timeout,
        onTimeout: () => null,
      );
    } catch (e) {
      if (kDebugMode) print('Error getting refresh token: $e');
      return null;
    }
  }

  /// Check if user has valid token (safe - returns false on timeout/error)
  Future<bool> hasToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Clear all tokens
  Future<void> clearTokens() async {
    try {
      await _storage.delete(key: keyAccessToken).timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error clearing access token: $e');
    }
    try {
      await _storage.delete(key: keyRefreshToken).timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error clearing refresh token: $e');
    }
  }

  // ============================================
  // USER DATA OPERATIONS
  // ============================================

  /// Save user ID
  Future<void> saveUserId(String userId) async {
    try {
      await _storage.write(key: keyUserId, value: userId).timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error saving user ID: $e');
    }
  }

  /// Get user ID
  Future<String?> getUserId() async {
    try {
      return await _storage.read(key: keyUserId).timeout(
        _timeout,
        onTimeout: () => null,
      );
    } catch (e) {
      if (kDebugMode) print('Error getting user ID: $e');
      return null;
    }
  }

  /// Save user email
  Future<void> saveUserEmail(String email) async {
    try {
      await _storage.write(key: keyUserEmail, value: email).timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error saving user email: $e');
    }
  }

  /// Get user email
  Future<String?> getUserEmail() async {
    try {
      return await _storage.read(key: keyUserEmail).timeout(
        _timeout,
        onTimeout: () => null,
      );
    } catch (e) {
      if (kDebugMode) print('Error getting user email: $e');
      return null;
    }
  }

  /// Save user role
  Future<void> saveUserRole(String role) async {
    try {
      await _storage.write(key: keyUserRole, value: role).timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error saving user role: $e');
    }
  }

  /// Get user role
  Future<String?> getUserRole() async {
    try {
      return await _storage.read(key: keyUserRole).timeout(
        _timeout,
        onTimeout: () => null,
      );
    } catch (e) {
      if (kDebugMode) print('Error getting user role: $e');
      return null;
    }
  }

  // ============================================
  // GENERAL OPERATIONS
  // ============================================

  /// Save a key-value pair
  Future<void> write(String key, String value) async {
    try {
      await _storage.write(key: key, value: value).timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error writing $key: $e');
    }
  }

  /// Read a value by key
  Future<String?> read(String key) async {
    try {
      return await _storage.read(key: key).timeout(
        _timeout,
        onTimeout: () => null,
      );
    } catch (e) {
      if (kDebugMode) print('Error reading $key: $e');
      return null;
    }
  }

  /// Delete a value by key
  Future<void> delete(String key) async {
    try {
      await _storage.delete(key: key).timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error deleting $key: $e');
    }
  }

  /// Clear all stored data
  Future<void> clearAll() async {
    try {
      await _storage.deleteAll().timeout(_timeout);
    } catch (e) {
      if (kDebugMode) print('Error clearing all: $e');
    }
  }

  /// Check if a key exists (returns false on timeout/error)
  Future<bool> containsKey(String key) async {
    try {
      return await _storage.containsKey(key: key).timeout(
        _timeout,
        onTimeout: () => false,
      );
    } catch (e) {
      if (kDebugMode) print('Error checking key $key: $e');
      return false;
    }
  }

  /// Get all stored keys (returns empty map on error)
  Future<Map<String, String>> readAll() async {
    try {
      return await _storage.readAll().timeout(
        _timeout,
        onTimeout: () => <String, String>{},
      );
    } catch (e) {
      if (kDebugMode) print('Error reading all: $e');
      return <String, String>{};
    }
  }
}
