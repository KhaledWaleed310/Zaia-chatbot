import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dartz/dartz.dart';

import 'package:aiden_mobile/core/api/api_exceptions.dart';
import 'package:aiden_mobile/core/error/failures.dart';
import 'package:aiden_mobile/data/datasources/local/auth_local_datasource.dart';
import 'package:aiden_mobile/data/datasources/remote/auth_remote_datasource.dart';
import 'package:aiden_mobile/data/models/auth/user_model.dart';
import 'package:aiden_mobile/domain/entities/user.dart';
import 'package:aiden_mobile/domain/repositories/auth_repository.dart';

/// Implementation of AuthRepository
class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDatasource _remoteDatasource;
  final AuthLocalDatasource _localDatasource;
  final Connectivity _connectivity;

  AuthRepositoryImpl({
    required AuthRemoteDatasource remoteDatasource,
    required AuthLocalDatasource localDatasource,
    required Connectivity connectivity,
  })  : _remoteDatasource = remoteDatasource,
        _localDatasource = localDatasource,
        _connectivity = connectivity;

  /// Check network connectivity
  Future<bool> _isConnected() async {
    final result = await _connectivity.checkConnectivity();
    return result.isNotEmpty && !result.contains(ConnectivityResult.none);
  }

  /// Convert UserModel to User entity
  User _toEntity(UserModel model) {
    return User(
      id: model.id,
      email: model.email,
      name: model.name,
      role: model.role,
      isVerified: model.isVerified,
      isActive: model.isActive,
      subscriptionTier: model.subscriptionTier,
      companyName: model.companyName,
      companySize: model.companySize,
      industry: model.industry,
      country: model.country,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      lastLogin: model.lastLogin,
    );
  }

  @override
  Future<Either<Failure, User>> login({
    required String email,
    required String password,
  }) async {
    if (!await _isConnected()) {
      return const Left(NetworkFailure());
    }

    try {
      final request = LoginRequest(email: email, password: password);
      final response = await _remoteDatasource.login(request);

      // Save token
      await _localDatasource.saveToken(response.accessToken);

      // Cache user
      await _localDatasource.cacheUser(response.user);

      return Right(_toEntity(response.user));
    } on UnauthorizedException {
      return const Left(AuthFailure('Invalid email or password'));
    } on ValidationException catch (e) {
      return Left(ValidationFailure(message: e.message, errors: e.errors));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, User>> register({
    required String email,
    required String password,
    String? name,
    String? companyName,
    String? companySize,
    String? industry,
    String? useCase,
    String? country,
    String? referralSource,
    bool marketingConsent = false,
  }) async {
    if (!await _isConnected()) {
      return const Left(NetworkFailure());
    }

    try {
      final request = RegisterRequest(
        email: email,
        password: password,
        name: name,
        companyName: companyName,
        companySize: companySize,
        industry: industry,
        useCase: useCase,
        country: country,
        referralSource: referralSource,
        marketingConsent: marketingConsent,
      );

      final response = await _remoteDatasource.register(request);

      // Cache user (but don't save token yet - need to verify email)
      await _localDatasource.cacheUser(response.user);

      return Right(_toEntity(response.user));
    } on ValidationException catch (e) {
      return Left(ValidationFailure(message: e.message, errors: e.errors));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, User>> getCurrentUser() async {
    // Try to get from cache first if offline
    if (!await _isConnected()) {
      final cachedUser = await _localDatasource.getCachedUser();
      if (cachedUser != null) {
        return Right(_toEntity(cachedUser));
      }
      return const Left(NetworkFailure());
    }

    try {
      final user = await _remoteDatasource.getCurrentUser();

      // Update cache
      await _localDatasource.cacheUser(user);

      return Right(_toEntity(user));
    } on UnauthorizedException {
      // Clear tokens and cache
      await _localDatasource.clearTokens();
      await _localDatasource.clearCachedUser();
      return const Left(AuthFailure('Session expired'));
    } on ApiException catch (e) {
      // Try to return cached user on error
      final cachedUser = await _localDatasource.getCachedUser();
      if (cachedUser != null) {
        return Right(_toEntity(cachedUser));
      }
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<bool> isLoggedIn() async {
    return _localDatasource.isLoggedIn();
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await _localDatasource.clearTokens();
      await _localDatasource.clearCachedUser();
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, String>> verifyEmail(String token) async {
    if (!await _isConnected()) {
      return const Left(NetworkFailure());
    }

    try {
      final request = VerifyEmailRequest(token: token);
      final response = await _remoteDatasource.verifyEmail(request);
      return Right(response.message);
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, String>> resendVerification(String email) async {
    if (!await _isConnected()) {
      return const Left(NetworkFailure());
    }

    try {
      final response = await _remoteDatasource.resendVerification(email);
      return Right(response.message);
    } on RateLimitException catch (e) {
      return Left(RateLimitFailure(
        message: e.message,
        retryAfter: e.retryAfter,
      ));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, String>> forgotPassword(String email) async {
    if (!await _isConnected()) {
      return const Left(NetworkFailure());
    }

    try {
      final request = ForgotPasswordRequest(email: email);
      final response = await _remoteDatasource.forgotPassword(request);
      return Right(response.message);
    } on RateLimitException catch (e) {
      return Left(RateLimitFailure(
        message: e.message,
        retryAfter: e.retryAfter,
      ));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, String>> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    if (!await _isConnected()) {
      return const Left(NetworkFailure());
    }

    try {
      final request = ResetPasswordRequest(
        token: token,
        newPassword: newPassword,
      );
      final response = await _remoteDatasource.resetPassword(request);
      return Right(response.message);
    } on ValidationException catch (e) {
      return Left(ValidationFailure(message: e.message, errors: e.errors));
    } on ApiException catch (e) {
      return Left(ServerFailure(e.message));
    } catch (e) {
      return Left(UnknownFailure(e.toString()));
    }
  }

  @override
  Future<String?> getRememberedEmail() async {
    return _localDatasource.getRememberedEmail();
  }

  @override
  Future<void> saveRememberedEmail(String email) async {
    await _localDatasource.saveRememberedEmail(email);
  }

  @override
  Future<void> clearRememberedEmail() async {
    await _localDatasource.clearRememberedEmail();
  }
}
