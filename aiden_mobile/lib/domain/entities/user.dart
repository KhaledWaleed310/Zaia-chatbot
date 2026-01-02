import 'package:equatable/equatable.dart';

/// User domain entity
class User extends Equatable {
  final String id;
  final String email;
  final String? name;
  final String role;
  final bool isVerified;
  final bool isActive;
  final String subscriptionTier;
  final String? companyName;
  final String? companySize;
  final String? industry;
  final String? country;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? lastLogin;

  const User({
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

  /// Empty user instance
  static final empty = User(
    id: '',
    email: '',
    role: 'user',
    isVerified: false,
    isActive: false,
    subscriptionTier: 'free',
    createdAt: DateTime.fromMillisecondsSinceEpoch(0),
  );

  /// Check if user is empty
  bool get isEmpty => id.isEmpty;
  bool get isNotEmpty => id.isNotEmpty;

  @override
  List<Object?> get props => [
        id,
        email,
        name,
        role,
        isVerified,
        isActive,
        subscriptionTier,
        companyName,
        companySize,
        industry,
        country,
        createdAt,
        updatedAt,
        lastLogin,
      ];

  User copyWith({
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
    return User(
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
