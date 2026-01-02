import 'package:flutter/material.dart';

/// BuildContext extensions for convenience
extension ContextExtensions on BuildContext {
  // ============================================
  // THEME
  // ============================================

  /// Get current theme
  ThemeData get theme => Theme.of(this);

  /// Get color scheme
  ColorScheme get colorScheme => theme.colorScheme;

  /// Get text theme
  TextTheme get textTheme => theme.textTheme;

  /// Check if dark mode
  bool get isDarkMode => theme.brightness == Brightness.dark;

  // ============================================
  // MEDIA QUERY
  // ============================================

  /// Get media query data
  MediaQueryData get mediaQuery => MediaQuery.of(this);

  /// Get screen size
  Size get screenSize => mediaQuery.size;

  /// Get screen width
  double get screenWidth => screenSize.width;

  /// Get screen height
  double get screenHeight => screenSize.height;

  /// Get status bar height
  double get statusBarHeight => mediaQuery.padding.top;

  /// Get bottom padding (safe area)
  double get bottomPadding => mediaQuery.padding.bottom;

  /// Check if keyboard is visible
  bool get isKeyboardVisible => mediaQuery.viewInsets.bottom > 0;

  /// Get keyboard height
  double get keyboardHeight => mediaQuery.viewInsets.bottom;

  // ============================================
  // RESPONSIVE BREAKPOINTS
  // ============================================

  /// Check if mobile (< 600px)
  bool get isMobile => screenWidth < 600;

  /// Check if tablet (600px - 1024px)
  bool get isTablet => screenWidth >= 600 && screenWidth < 1024;

  /// Check if desktop (>= 1024px)
  bool get isDesktop => screenWidth >= 1024;

  /// Get responsive padding based on screen size
  double get responsivePadding {
    if (isMobile) return 16.0;
    if (isTablet) return 24.0;
    return 32.0;
  }

  // ============================================
  // NAVIGATION
  // ============================================

  /// Pop current route
  void pop<T>([T? result]) => Navigator.of(this).pop(result);

  /// Check if can pop
  bool get canPop => Navigator.of(this).canPop();

  /// Show snackbar
  ScaffoldFeatureController<SnackBar, SnackBarClosedReason> showSnackBar(
    String message, {
    Duration duration = const Duration(seconds: 3),
    SnackBarAction? action,
    Color? backgroundColor,
  }) {
    return ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: duration,
        action: action,
        backgroundColor: backgroundColor,
      ),
    );
  }

  /// Show success snackbar
  void showSuccessSnackBar(String message) {
    showSnackBar(
      message,
      backgroundColor: Colors.green,
    );
  }

  /// Show error snackbar
  void showErrorSnackBar(String message) {
    showSnackBar(
      message,
      backgroundColor: colorScheme.error,
    );
  }

  /// Hide current snackbar
  void hideSnackBar() {
    ScaffoldMessenger.of(this).hideCurrentSnackBar();
  }

  // ============================================
  // DIALOGS
  // ============================================

  /// Show loading dialog
  void showLoadingDialog({String? message}) {
    showDialog(
      context: this,
      barrierDismissible: false,
      builder: (context) => PopScope(
        canPop: false,
        child: AlertDialog(
          content: Row(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(width: 16),
              Text(message ?? 'Loading...'),
            ],
          ),
        ),
      ),
    );
  }

  /// Show confirmation dialog
  Future<bool> showConfirmationDialog({
    required String title,
    required String message,
    String confirmText = 'Confirm',
    String cancelText = 'Cancel',
    bool isDestructive = false,
  }) async {
    final result = await showDialog<bool>(
      context: this,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(cancelText),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: isDestructive
                ? TextButton.styleFrom(foregroundColor: colorScheme.error)
                : null,
            child: Text(confirmText),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  // ============================================
  // FOCUS
  // ============================================

  /// Unfocus current focus node (hide keyboard)
  void unfocus() {
    FocusScope.of(this).unfocus();
  }

  /// Request focus on a node
  void requestFocus(FocusNode node) {
    FocusScope.of(this).requestFocus(node);
  }
}
