import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'package:aiden_mobile/core/config/themes.dart';
import 'package:aiden_mobile/core/localization/app_localizations.dart';
import 'package:aiden_mobile/presentation/navigation/app_router.dart';

/// Main application widget
class AidenApp extends StatefulWidget {
  const AidenApp({super.key});

  @override
  State<AidenApp> createState() => _AidenAppState();

  /// Access app state from anywhere in the widget tree
  static _AidenAppState of(BuildContext context) {
    return context.findAncestorStateOfType<_AidenAppState>()!;
  }
}

class _AidenAppState extends State<AidenApp> {
  /// Current locale
  Locale _locale = defaultLocale;

  /// Current theme mode
  ThemeMode _themeMode = ThemeMode.system;

  /// Router instance
  late final _router = createAppRouter();

  /// Get current locale
  Locale get locale => _locale;

  /// Get current theme mode
  ThemeMode get themeMode => _themeMode;

  /// Change app locale
  void setLocale(Locale locale) {
    if (supportedLocales.contains(locale)) {
      setState(() {
        _locale = locale;
      });
    }
  }

  /// Change theme mode
  void setThemeMode(ThemeMode mode) {
    setState(() {
      _themeMode = mode;
    });
  }

  /// Toggle between light and dark theme
  void toggleTheme() {
    setState(() {
      if (_themeMode == ThemeMode.dark) {
        _themeMode = ThemeMode.light;
      } else {
        _themeMode = ThemeMode.dark;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isRtl = _locale.isRtl;

    return MaterialApp.router(
      // App info
      title: 'AIDEN',
      debugShowCheckedModeBanner: false,

      // Theming
      theme: AppThemes.lightTheme(isRtl: isRtl),
      darkTheme: AppThemes.darkTheme(isRtl: isRtl),
      themeMode: _themeMode,

      // Localization
      locale: _locale,
      supportedLocales: supportedLocales,
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      // Routing
      routerConfig: _router,

      // Text direction for RTL languages
      builder: (context, child) {
        return Directionality(
          textDirection: _locale.textDirection,
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}

/// Extension for easy access to app state
extension AppStateExtension on BuildContext {
  /// Get app state
  _AidenAppState get appState => AidenApp.of(this);

  /// Change locale
  void setLocale(Locale locale) => appState.setLocale(locale);

  /// Change theme mode
  void setThemeMode(ThemeMode mode) => appState.setThemeMode(mode);

  /// Toggle theme
  void toggleTheme() => appState.toggleTheme();

  /// Current theme mode
  ThemeMode get currentThemeMode => appState.themeMode;

  /// Current locale
  Locale get currentLocale => appState.locale;
}
