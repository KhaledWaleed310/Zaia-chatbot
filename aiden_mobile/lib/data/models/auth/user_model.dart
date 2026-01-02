import 'package:json_annotation/json_annotation.dart';

part 'user_model.g.dart';

/// User model from API
@JsonSerializable()
class UserModel {
  final String id;
  final String email;
  final String? name;
  final String role;
  @JsonKey(name: 'is_verified')
  final bool isVerified;
  @JsonKey(name: 'is_active')
  final bool isActive;
  @JsonKey(name: 'subscription_tier')
  final String subscriptionTier;
  @JsonKey(name: 'company_name')
  final String? companyName;
  @JsonKey(name: 'company_size')
  final String? companySize;
  final String? industry;
  final String? country;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;
  @JsonKey(name: 'last_login')
  final DateTime? lastLogin;

  const UserModel({
    required this.id,
    required this.email,
    this.name,
    required this.role,
    required this.isVerified,
    required this.isActive,
    required this.subscriptionTier,
    this.companyName,
    this.companySize,
    this.industry,
    this.country,
    required this.createdAt,
    this.updatedAt,
    this.lastLogin,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  Map<String, dynamic> toJson() => _$UserModelToJson(this);

  /// Check if user is admin
  bool get isAdmin => role == 'admin' || role == 'super_admin';

  /// Check if user is super admin
  bool get isSuperAdmin => role == 'super_admin';

  /// Check if user has marketing access
  bool get isMarketing => role == 'marketing' || isAdmin;

  /// Get display name
  String get displayName => name ?? email.split('@').first;

  /// Get initials for avatar
  String get initials {
    if (name != null && name!.isNotEmpty) {
      final parts = name!.trim().split(' ');
      if (parts.length >= 2) {
        return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
      }
      return name![0].toUpperCase();
    }
    return email[0].toUpperCase();
  }

  /// Copy with method
  UserModel copyWith({
    String? id,
    String? email,
    String? name,
    String? role,
    bool? isVerified,
    bool? isActive,
    String? subscriptionTier,
    String? companyName,
    String? companySize,
    String? industry,
    String? country,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? lastLogin,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      role: role ?? this.role,
      isVerified: isVerified ?? this.isVerified,
      isActive: isActive ?? this.isActive,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      companyName: companyName ?? this.companyName,
      companySize: companySize ?? this.companySize,
      industry: industry ?? this.industry,
      country: country ?? this.country,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastLogin: lastLogin ?? this.lastLogin,
    );
  }
}

/// Login request model
@JsonSerializable()
class LoginRequest {
  final String email;
  final String password;

  const LoginRequest({
    required this.email,
    required this.password,
  });

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);

  Map<String, dynamic> toJson() => _$LoginRequestToJson(this);
}

/// Login response model
@JsonSerializable()
class LoginResponse {
  @JsonKey(name: 'access_token')
  final String accessToken;
  @JsonKey(name: 'token_type')
  final String tokenType;
  final UserModel user;

  const LoginResponse({
    required this.accessToken,
    required this.tokenType,
    required this.user,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) =>
      _$LoginResponseFromJson(json);

  Map<String, dynamic> toJson() => _$LoginResponseToJson(this);
}

/// Register request model
@JsonSerializable()
class RegisterRequest {
  final String email;
  final String password;
  final String? name;
  @JsonKey(name: 'company_name')
  final String? companyName;
  @JsonKey(name: 'company_size')
  final String? companySize;
  final String? industry;
  @JsonKey(name: 'use_case')
  final String? useCase;
  final String? country;
  @JsonKey(name: 'referral_source')
  final String? referralSource;
  @JsonKey(name: 'marketing_consent')
  final bool marketingConsent;

  const RegisterRequest({
    required this.email,
    required this.password,
    this.name,
    this.companyName,
    this.companySize,
    this.industry,
    this.useCase,
    this.country,
    this.referralSource,
    this.marketingConsent = false,
  });

  factory RegisterRequest.fromJson(Map<String, dynamic> json) =>
      _$RegisterRequestFromJson(json);

  Map<String, dynamic> toJson() => _$RegisterRequestToJson(this);
}

/// Register response model
@JsonSerializable()
class RegisterResponse {
  final String message;
  final UserModel user;

  const RegisterResponse({
    required this.message,
    required this.user,
  });

  factory RegisterResponse.fromJson(Map<String, dynamic> json) =>
      _$RegisterResponseFromJson(json);

  Map<String, dynamic> toJson() => _$RegisterResponseToJson(this);
}

/// Forgot password request
@JsonSerializable()
class ForgotPasswordRequest {
  final String email;

  const ForgotPasswordRequest({required this.email});

  factory ForgotPasswordRequest.fromJson(Map<String, dynamic> json) =>
      _$ForgotPasswordRequestFromJson(json);

  Map<String, dynamic> toJson() => _$ForgotPasswordRequestToJson(this);
}

/// Reset password request
@JsonSerializable()
class ResetPasswordRequest {
  final String token;
  @JsonKey(name: 'new_password')
  final String newPassword;

  const ResetPasswordRequest({
    required this.token,
    required this.newPassword,
  });

  factory ResetPasswordRequest.fromJson(Map<String, dynamic> json) =>
      _$ResetPasswordRequestFromJson(json);

  Map<String, dynamic> toJson() => _$ResetPasswordRequestToJson(this);
}

/// Verify email request
@JsonSerializable()
class VerifyEmailRequest {
  final String token;

  const VerifyEmailRequest({required this.token});

  factory VerifyEmailRequest.fromJson(Map<String, dynamic> json) =>
      _$VerifyEmailRequestFromJson(json);

  Map<String, dynamic> toJson() => _$VerifyEmailRequestToJson(this);
}

/// Generic message response
@JsonSerializable()
class MessageResponse {
  final String message;

  const MessageResponse({required this.message});

  factory MessageResponse.fromJson(Map<String, dynamic> json) =>
      _$MessageResponseFromJson(json);

  Map<String, dynamic> toJson() => _$MessageResponseToJson(this);
}
