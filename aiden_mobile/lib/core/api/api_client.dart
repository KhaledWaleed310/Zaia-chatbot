import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:aiden_mobile/core/config/app_config.dart';
import 'package:aiden_mobile/core/api/api_exceptions.dart';
import 'package:aiden_mobile/core/api/interceptors/auth_interceptor.dart';
import 'package:aiden_mobile/core/api/interceptors/error_interceptor.dart';
import 'package:aiden_mobile/core/api/interceptors/retry_interceptor.dart';

/// Main API client for making HTTP requests
class ApiClient {
  late final Dio _dio;
  final FlutterSecureStorage _secureStorage;

  ApiClient({required FlutterSecureStorage secureStorage})
      : _secureStorage = secureStorage {
    _dio = Dio(_createBaseOptions());
    _setupInterceptors();
  }

  /// Get the underlying Dio instance for advanced usage
  Dio get dio => _dio;

  /// Create base Dio options
  BaseOptions _createBaseOptions() {
    return BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      sendTimeout: AppConfig.sendTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      validateStatus: (status) => status != null && status < 500,
    );
  }

  /// Set up interceptors
  void _setupInterceptors() {
    _dio.interceptors.addAll([
      AuthInterceptor(secureStorage: _secureStorage),
      ErrorInterceptor(),
      RetryInterceptor(dio: _dio),
      if (kDebugMode) _createLoggingInterceptor(),
    ]);
  }

  /// Create logging interceptor for debug mode
  Interceptor _createLoggingInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) {
        debugPrint('>>> ${options.method} ${options.uri}');
        if (options.data != null) {
          debugPrint('>>> Data: ${options.data}');
        }
        handler.next(options);
      },
      onResponse: (response, handler) {
        debugPrint('<<< ${response.statusCode} ${response.requestOptions.uri}');
        handler.next(response);
      },
      onError: (error, handler) {
        debugPrint('!!! Error: ${error.message}');
        handler.next(error);
      },
    );
  }

  /// GET request
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// POST request
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// PATCH request
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.patch<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// PUT request
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// DELETE request
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Stream POST request for SSE (Server-Sent Events) - Chat streaming
  Stream<String> streamPost(
    String path, {
    required Map<String, dynamic> data,
    CancelToken? cancelToken,
  }) async* {
    try {
      final response = await _dio.post<ResponseBody>(
        path,
        data: data,
        options: Options(
          responseType: ResponseType.stream,
          headers: {'Accept': 'text/event-stream'},
        ),
        cancelToken: cancelToken,
      );

      final stream = response.data?.stream;
      if (stream == null) return;

      await for (final chunk in stream) {
        yield utf8.decode(chunk);
      }
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Upload file with progress tracking
  Future<Response<T>> uploadFile<T>(
    String path, {
    required File file,
    required String fileName,
    String fieldName = 'file',
    Map<String, dynamic>? additionalData,
    void Function(int sent, int total)? onProgress,
    CancelToken? cancelToken,
  }) async {
    try {
      final formData = FormData.fromMap({
        fieldName: await MultipartFile.fromFile(
          file.path,
          filename: fileName,
        ),
        if (additionalData != null) ...additionalData,
      });

      return await _dio.post<T>(
        path,
        data: formData,
        onSendProgress: onProgress,
        cancelToken: cancelToken,
        options: Options(
          headers: {'Content-Type': 'multipart/form-data'},
        ),
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Upload multiple files
  Future<Response<T>> uploadFiles<T>(
    String path, {
    required List<File> files,
    required List<String> fileNames,
    String fieldName = 'files',
    Map<String, dynamic>? additionalData,
    void Function(int sent, int total)? onProgress,
    CancelToken? cancelToken,
  }) async {
    try {
      final multipartFiles = <MultipartFile>[];
      for (var i = 0; i < files.length; i++) {
        multipartFiles.add(
          await MultipartFile.fromFile(
            files[i].path,
            filename: fileNames[i],
          ),
        );
      }

      final formData = FormData.fromMap({
        fieldName: multipartFiles,
        if (additionalData != null) ...additionalData,
      });

      return await _dio.post<T>(
        path,
        data: formData,
        onSendProgress: onProgress,
        cancelToken: cancelToken,
        options: Options(
          headers: {'Content-Type': 'multipart/form-data'},
        ),
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Download file
  Future<Response<dynamic>> downloadFile(
    String path,
    String savePath, {
    Map<String, dynamic>? queryParameters,
    void Function(int received, int total)? onProgress,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.download(
        path,
        savePath,
        queryParameters: queryParameters,
        onReceiveProgress: onProgress,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// Handle Dio errors and extract ApiException
  ApiException _handleDioError(DioException e) {
    if (e.error is ApiException) {
      return e.error as ApiException;
    }

    return ServerException(
      message: e.message ?? 'An error occurred',
      statusCode: e.response?.statusCode,
    );
  }

  /// Cancel all pending requests
  void cancelAllRequests() {
    _dio.close(force: true);
  }
}
