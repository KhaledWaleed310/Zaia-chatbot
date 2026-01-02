import 'dart:convert';

import 'package:hive/hive.dart';

import 'package:aiden_mobile/core/api/api_exceptions.dart';
import 'package:aiden_mobile/core/utils/secure_storage.dart';
import 'package:aiden_mobile/data/models/auth/user_model.dart';

/// Local data source for authentication
abstract class AuthLocalDatasource {
  /// Save access token
  Future<void> saveToken(String token);

  /// Get access token
  Future<String?> getToken();

  /// Clear tokens (logout)
  Future<void> clearTokens();

  /// Check if user is logged in
  Future<bool> isLoggedIn();

  /// Cache user data
  Future<void> cacheUser(UserModel user);

  /// Get cached user
  Future<UserModel?> getCachedUser();

  /// Clear cached user
  Future<void> clearCachedUser();

  /// Save user email for remember me
  Future<void> saveRememberedEmail(String email);

  /// Get remembered email
  Future<String?> getRememberedEmail();

  /// Clear remembered email
  Future<void> clearRememberedEmail();
}

/// Implementation of AuthLocalDatasource
class AuthLocalDatasourceImpl implements AuthLocalDatasource {
  final SecureStorageService _secureStorage;
  final Box<dynamic> _cacheBox;

  static const String _userCacheKey = 'cached_user';
  static const String _rememberedEmailKey = 'remembered_email';

  AuthLocalDatasourceImpl({
    required SecureStorageService secureStorage,
    required Box<dynamic> cacheBox,
  })  : _secureStorage = secureStorage,
        _cacheBox = cacheBox;

  @override
  Future<void> saveToken(String token) async {
    try {
      await _secureStorage.saveAccessToken(token);
    } catch (e) {
      throw CacheException(message: 'Failed to save token: $e');
    }
  }

  @override
  Future<String?> getToken() async {
    try {
      return await _secureStorage.getAccessToken();
    } catch (e) {
      throw CacheException(message: 'Failed to get token: $e');
    }
  }

  @override
  Future<void> clearTokens() async {
    try {
      await _secureStorage.clearTokens();
    } catch (e) {
      throw CacheException(message: 'Failed to clear tokens: $e');
    }
  }

  @override
  Future<bool> isLoggedIn() async {
    try {
      final token = await _secureStorage.getAccessToken();
      return token != null && token.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  @override
  Future<void> cacheUser(UserModel user) async {
    try {
      final userJson = jsonEncode(user.toJson());
      await _cacheBox.put(_userCacheKey, userJson);

      // Also save user info in secure storage
      await _secureStorage.saveUserId(user.id);
      await _secureStorage.saveUserEmail(user.email);
      await _secureStorage.saveUserRole(user.role);
    } catch (e) {
      throw CacheException(message: 'Failed to cache user: $e');
    }
  }

  @override
  Future<UserModel?> getCachedUser() async {
    try {
      final userJson = _cacheBox.get(_userCacheKey) as String?;
      if (userJson == null) return null;

      final userMap = jsonDecode(userJson) as Map<String, dynamic>;
      return UserModel.fromJson(userMap);
    } catch (e) {
      return null;
    }
  }

  @override
  Future<void> clearCachedUser() async {
    try {
      await _cacheBox.delete(_userCacheKey);
      await _secureStorage.delete(SecureStorageService.keyUserId);
      await _secureStorage.delete(SecureStorageService.keyUserEmail);
      await _secureStorage.delete(SecureStorageService.keyUserRole);
    } catch (e) {
      throw CacheException(message: 'Failed to clear cached user: $e');
    }
  }

  @override
  Future<void> saveRememberedEmail(String email) async {
    try {
      await _cacheBox.put(_rememberedEmailKey, email);
    } catch (e) {
      throw CacheException(message: 'Failed to save email: $e');
    }
  }

  @override
  Future<String?> getRememberedEmail() async {
    try {
      return _cacheBox.get(_rememberedEmailKey) as String?;
    } catch (e) {
      return null;
    }
  }

  @override
  Future<void> clearRememberedEmail() async {
    try {
      await _cacheBox.delete(_rememberedEmailKey);
    } catch (e) {
      throw CacheException(message: 'Failed to clear email: $e');
    }
  }
}
