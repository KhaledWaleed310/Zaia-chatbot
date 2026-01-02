import 'package:flutter/material.dart';

/// Button variants
enum AppButtonVariant {
  primary,
  secondary,
  outlined,
  text,
  danger,
}

/// Button sizes
enum AppButtonSize {
  small,
  medium,
  large,
}

/// Custom button widget
class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final bool isLoading;
  final bool isExpanded;
  final IconData? icon;
  final IconData? trailingIcon;

  const AppButton({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isExpanded = true,
    this.icon,
    this.trailingIcon,
  });

  /// Primary button
  const AppButton.primary({
    super.key,
    required this.text,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isExpanded = true,
    this.icon,
    this.trailingIcon,
  }) : variant = AppButtonVariant.primary;

  /// Secondary button
  const AppButton.secondary({
    super.key,
    required this.text,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isExpanded = true,
    this.icon,
    this.trailingIcon,
  }) : variant = AppButtonVariant.secondary;

  /// Outlined button
  const AppButton.outlined({
    super.key,
    required this.text,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isExpanded = true,
    this.icon,
    this.trailingIcon,
  }) : variant = AppButtonVariant.outlined;

  /// Text button
  const AppButton.text({
    super.key,
    required this.text,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isExpanded = false,
    this.icon,
    this.trailingIcon,
  }) : variant = AppButtonVariant.text;

  /// Danger button
  const AppButton.danger({
    super.key,
    required this.text,
    this.onPressed,
    this.size = AppButtonSize.medium,
    this.isLoading = false,
    this.isExpanded = true,
    this.icon,
    this.trailingIcon,
  }) : variant = AppButtonVariant.danger;

  @override
  Widget build(BuildContext context) {
    final buttonChild = _buildChild(context);

    Widget button;
    switch (variant) {
      case AppButtonVariant.primary:
        button = ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getPrimaryStyle(context),
          child: buttonChild,
        );
        break;
      case AppButtonVariant.secondary:
        button = ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getSecondaryStyle(context),
          child: buttonChild,
        );
        break;
      case AppButtonVariant.outlined:
        button = OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getOutlinedStyle(context),
          child: buttonChild,
        );
        break;
      case AppButtonVariant.text:
        button = TextButton(
          onPressed: isLoading ? null : onPressed,
          style: _getTextStyle(context),
          child: buttonChild,
        );
        break;
      case AppButtonVariant.danger:
        button = ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getDangerStyle(context),
          child: buttonChild,
        );
        break;
    }

    if (isExpanded) {
      return SizedBox(
        width: double.infinity,
        height: _getHeight(),
        child: button,
      );
    }

    return button;
  }

  Widget _buildChild(BuildContext context) {
    if (isLoading) {
      return SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(
            variant == AppButtonVariant.outlined ||
                    variant == AppButtonVariant.text
                ? Theme.of(context).colorScheme.primary
                : Colors.white,
          ),
        ),
      );
    }

    if (icon != null || trailingIcon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: _getIconSize()),
            const SizedBox(width: 8),
          ],
          Text(text),
          if (trailingIcon != null) ...[
            const SizedBox(width: 8),
            Icon(trailingIcon, size: _getIconSize()),
          ],
        ],
      );
    }

    return Text(text);
  }

  double _getHeight() {
    switch (size) {
      case AppButtonSize.small:
        return 40;
      case AppButtonSize.medium:
        return 48;
      case AppButtonSize.large:
        return 56;
    }
  }

  double _getIconSize() {
    switch (size) {
      case AppButtonSize.small:
        return 16;
      case AppButtonSize.medium:
        return 20;
      case AppButtonSize.large:
        return 24;
    }
  }

  EdgeInsets _getPadding() {
    switch (size) {
      case AppButtonSize.small:
        return const EdgeInsets.symmetric(horizontal: 16, vertical: 8);
      case AppButtonSize.medium:
        return const EdgeInsets.symmetric(horizontal: 24, vertical: 12);
      case AppButtonSize.large:
        return const EdgeInsets.symmetric(horizontal: 32, vertical: 16);
    }
  }

  ButtonStyle _getPrimaryStyle(BuildContext context) {
    return ElevatedButton.styleFrom(
      padding: _getPadding(),
      backgroundColor: Theme.of(context).colorScheme.primary,
      foregroundColor: Theme.of(context).colorScheme.onPrimary,
    );
  }

  ButtonStyle _getSecondaryStyle(BuildContext context) {
    return ElevatedButton.styleFrom(
      padding: _getPadding(),
      backgroundColor: Theme.of(context).colorScheme.secondary,
      foregroundColor: Theme.of(context).colorScheme.onSecondary,
    );
  }

  ButtonStyle _getOutlinedStyle(BuildContext context) {
    return OutlinedButton.styleFrom(
      padding: _getPadding(),
    );
  }

  ButtonStyle _getTextStyle(BuildContext context) {
    return TextButton.styleFrom(
      padding: _getPadding(),
    );
  }

  ButtonStyle _getDangerStyle(BuildContext context) {
    return ElevatedButton.styleFrom(
      padding: _getPadding(),
      backgroundColor: Theme.of(context).colorScheme.error,
      foregroundColor: Theme.of(context).colorScheme.onError,
    );
  }
}
