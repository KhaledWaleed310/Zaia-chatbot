import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Wrapper for secure storage operations
class SecureStorageService {
  final FlutterSecureStorage _storage;

  // Storage keys
  static const String keyAccessToken = 'access_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUserId = 'user_id';
  static const String keyUserEmail = 'user_email';
  static const String keyUserRole = 'user_role';

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
    await _storage.write(key: keyAccessToken, value: token);
  }

  /// Get access token
  Future<String?> getAccessToken() async {
    return _storage.read(key: keyAccessToken);
  }

  /// Save refresh token
  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: keyRefreshToken, value: token);
  }

  /// Get refresh token
  Future<String?> getRefreshToken() async {
    return _storage.read(key: keyRefreshToken);
  }

  /// Check if user has valid token
  Future<bool> hasToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  /// Clear all tokens
  Future<void> clearTokens() async {
    await _storage.delete(key: keyAccessToken);
    await _storage.delete(key: keyRefreshToken);
  }

  // ============================================
  // USER DATA OPERATIONS
  // ============================================

  /// Save user ID
  Future<void> saveUserId(String userId) async {
    await _storage.write(key: keyUserId, value: userId);
  }

  /// Get user ID
  Future<String?> getUserId() async {
    return _storage.read(key: keyUserId);
  }

  /// Save user email
  Future<void> saveUserEmail(String email) async {
    await _storage.write(key: keyUserEmail, value: email);
  }

  /// Get user email
  Future<String?> getUserEmail() async {
    return _storage.read(key: keyUserEmail);
  }

  /// Save user role
  Future<void> saveUserRole(String role) async {
    await _storage.write(key: keyUserRole, value: role);
  }

  /// Get user role
  Future<String?> getUserRole() async {
    return _storage.read(key: keyUserRole);
  }

  // ============================================
  // GENERAL OPERATIONS
  // ============================================

  /// Save a key-value pair
  Future<void> write(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  /// Read a value by key
  Future<String?> read(String key) async {
    return _storage.read(key: key);
  }

  /// Delete a value by key
  Future<void> delete(String key) async {
    await _storage.delete(key: key);
  }

  /// Clear all stored data
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  /// Check if a key exists
  Future<bool> containsKey(String key) async {
    return _storage.containsKey(key: key);
  }

  /// Get all stored keys
  Future<Map<String, String>> readAll() async {
    return _storage.readAll();
  }
}
