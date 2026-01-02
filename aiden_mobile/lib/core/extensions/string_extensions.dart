/// String extensions for convenience
extension StringExtensions on String {
  /// Capitalize first letter
  String get capitalize {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }

  /// Capitalize each word
  String get titleCase {
    if (isEmpty) return this;
    return split(' ').map((word) => word.capitalize).join(' ');
  }

  /// Check if string is a valid email
  bool get isValidEmail {
    final emailRegex = RegExp(
      r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
    );
    return emailRegex.hasMatch(this);
  }

  /// Check if string is a valid URL
  bool get isValidUrl {
    final urlRegex = RegExp(
      r'^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$',
    );
    return urlRegex.hasMatch(this);
  }

  /// Check if string is a valid hex color
  bool get isValidHexColor {
    final hexRegex = RegExp(r'^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$');
    return hexRegex.hasMatch(this);
  }

  /// Check if string contains only digits
  bool get isNumeric {
    return RegExp(r'^[0-9]+$').hasMatch(this);
  }

  /// Truncate string with ellipsis
  String truncate(int maxLength, {String suffix = '...'}) {
    if (length <= maxLength) return this;
    return '${substring(0, maxLength - suffix.length)}$suffix';
  }

  /// Remove all whitespace
  String get removeWhitespace {
    return replaceAll(RegExp(r'\s+'), '');
  }

  /// Convert to slug (URL-friendly string)
  String get toSlug {
    return toLowerCase()
        .replaceAll(RegExp(r'[^\w\s-]'), '')
        .replaceAll(RegExp(r'[\s_-]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }

  /// Mask string (e.g., for credit cards, emails)
  String mask({int visibleChars = 4, String maskChar = '*'}) {
    if (length <= visibleChars) return this;
    final visible = substring(length - visibleChars);
    final masked = maskChar * (length - visibleChars);
    return '$masked$visible';
  }

  /// Mask email address
  String get maskEmail {
    final parts = split('@');
    if (parts.length != 2) return this;
    final name = parts[0];
    final domain = parts[1];
    if (name.length <= 2) return this;
    return '${name.substring(0, 2)}${'*' * (name.length - 2)}@$domain';
  }

  /// Check if null or empty
  bool get isNullOrEmpty => isEmpty;

  /// Check if not null or empty
  bool get isNotNullOrEmpty => isNotEmpty;

  /// Convert to int or null
  int? toIntOrNull() => int.tryParse(this);

  /// Convert to double or null
  double? toDoubleOrNull() => double.tryParse(this);

  /// Get initials (e.g., "John Doe" -> "JD")
  String get initials {
    final words = trim().split(RegExp(r'\s+'));
    if (words.isEmpty) return '';
    if (words.length == 1) {
      return words[0].isNotEmpty ? words[0][0].toUpperCase() : '';
    }
    return '${words[0][0]}${words[words.length - 1][0]}'.toUpperCase();
  }

  /// Format as currency (basic)
  String formatAsCurrency({String symbol = '\$', int decimals = 2}) {
    final number = double.tryParse(this);
    if (number == null) return this;
    return '$symbol${number.toStringAsFixed(decimals)}';
  }
}

/// Nullable string extensions
extension NullableStringExtensions on String? {
  /// Check if null or empty
  bool get isNullOrEmpty => this == null || this!.isEmpty;

  /// Check if not null or empty
  bool get isNotNullOrEmpty => this != null && this!.isNotEmpty;

  /// Return the string or a default value
  String orDefault([String defaultValue = '']) => this ?? defaultValue;
}
