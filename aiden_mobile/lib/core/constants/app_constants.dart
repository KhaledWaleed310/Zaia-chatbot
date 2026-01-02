/// Application-wide constants
class AppConstants {
  AppConstants._();

  // ============================================
  // APP INFO
  // ============================================
  static const String appName = 'AIDEN';
  static const String appVersion = '1.0.0';
  static const String appBuildNumber = '1';

  // ============================================
  // STORAGE KEYS
  // ============================================
  static const String keyAccessToken = 'access_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUserId = 'user_id';
  static const String keyUserEmail = 'user_email';
  static const String keyUserRole = 'user_role';
  static const String keyThemeMode = 'theme_mode';
  static const String keyLocale = 'locale';
  static const String keyOnboardingComplete = 'onboarding_complete';

  // ============================================
  // PAGINATION
  // ============================================
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // ============================================
  // ANIMATION DURATIONS
  // ============================================
  static const Duration animationFast = Duration(milliseconds: 150);
  static const Duration animationNormal = Duration(milliseconds: 300);
  static const Duration animationSlow = Duration(milliseconds: 500);

  // ============================================
  // DEBOUNCE DURATIONS
  // ============================================
  static const Duration debounceShort = Duration(milliseconds: 300);
  static const Duration debounceNormal = Duration(milliseconds: 500);
  static const Duration debounceLong = Duration(milliseconds: 1000);

  // ============================================
  // REFRESH INTERVALS
  // ============================================
  static const Duration refreshShort = Duration(seconds: 30);
  static const Duration refreshNormal = Duration(minutes: 1);
  static const Duration refreshLong = Duration(minutes: 5);

  // ============================================
  // FILE UPLOAD
  // ============================================
  static const int maxFileSizeMb = 10;
  static const int maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
  static const List<String> allowedDocumentExtensions = [
    'pdf',
    'doc',
    'docx',
    'txt',
    'md',
    'csv',
    'xls',
    'xlsx',
  ];
  static const List<String> allowedImageExtensions = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
  ];

  // ============================================
  // MESSAGE LIMITS
  // ============================================
  static const int maxMessageLength = 4000;
  static const int maxSystemPromptLength = 5000;
  static const int maxWelcomeMessageLength = 1000;

  // ============================================
  // UI CONSTANTS
  // ============================================
  static const double borderRadius = 12.0;
  static const double borderRadiusSmall = 8.0;
  static const double borderRadiusLarge = 16.0;
  static const double paddingSmall = 8.0;
  static const double paddingNormal = 16.0;
  static const double paddingLarge = 24.0;
  static const double iconSizeSmall = 16.0;
  static const double iconSizeNormal = 24.0;
  static const double iconSizeLarge = 32.0;

  // ============================================
  // CHART COLORS
  // ============================================
  static const List<int> chartColors = [
    0xFF3B82F6, // Blue
    0xFF10B981, // Green
    0xFFF59E0B, // Amber
    0xFFEF4444, // Red
    0xFF8B5CF6, // Purple
    0xFFEC4899, // Pink
    0xFF06B6D4, // Cyan
    0xFFF97316, // Orange
  ];
}

/// Subscription tiers
enum SubscriptionTier {
  free,
  pro,
  enterprise,
}

/// User roles
enum UserRole {
  user,
  admin,
  superAdmin,
  marketing,
}

/// Lead status
enum LeadStatus {
  newLead,
  contacted,
  qualified,
  converted,
  lost,
}

/// Handoff status
enum HandoffStatus {
  pending,
  assigned,
  active,
  resolved,
  abandoned,
}

/// Handoff priority
enum HandoffPriority {
  low,
  medium,
  high,
  urgent,
}

/// Booking status
enum BookingStatus {
  pending,
  confirmed,
  cancelled,
  completed,
}

/// Sentiment type
enum SentimentType {
  positive,
  neutral,
  negative,
}

/// Knowledge level
enum KnowledgeLevel {
  fact,
  pattern,
  strategy,
  principle,
}
