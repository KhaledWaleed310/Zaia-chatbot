import 'package:flutter/material.dart';

/// Supported locales
const List<Locale> supportedLocales = [
  Locale('en'), // English
  Locale('ar'), // Arabic
];

/// Default locale
const Locale defaultLocale = Locale('en');

/// Check if locale is RTL
bool isRtlLocale(Locale locale) {
  return locale.languageCode == 'ar';
}

/// Get text direction for locale
TextDirection getTextDirection(Locale locale) {
  return isRtlLocale(locale) ? TextDirection.rtl : TextDirection.ltr;
}

/// Locale extension for convenience
extension LocaleExtension on Locale {
  bool get isRtl => isRtlLocale(this);
  TextDirection get textDirection => getTextDirection(this);

  String get displayName {
    switch (languageCode) {
      case 'en':
        return 'English';
      case 'ar':
        return 'العربية';
      default:
        return languageCode;
    }
  }

  String get nativeDisplayName {
    switch (languageCode) {
      case 'en':
        return 'English';
      case 'ar':
        return 'العربية';
      default:
        return languageCode;
    }
  }
}

/// Context extension for accessing locale
extension LocalizationContext on BuildContext {
  Locale get locale => Localizations.localeOf(this);
  bool get isRtl => locale.isRtl;
  TextDirection get textDirection => locale.textDirection;
}
