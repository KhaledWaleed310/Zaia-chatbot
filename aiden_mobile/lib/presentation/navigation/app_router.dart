import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'package:aiden_mobile/di/injection_container.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_bloc.dart';
import 'package:aiden_mobile/presentation/features/auth/bloc/auth_state.dart';
import 'package:aiden_mobile/presentation/features/auth/screens/forgot_password_screen.dart';
import 'package:aiden_mobile/presentation/features/auth/screens/login_screen.dart';
import 'package:aiden_mobile/presentation/features/auth/screens/register_screen.dart';
import 'package:aiden_mobile/presentation/features/auth/screens/verify_email_screen.dart';
import 'package:aiden_mobile/presentation/features/analytics/screens/analytics_screen.dart';
import 'package:aiden_mobile/presentation/features/booking/screens/bookings_screen.dart';
import 'package:aiden_mobile/presentation/features/chat/bloc/chat_bloc.dart';
import 'package:aiden_mobile/presentation/features/chat/screens/chat_screen.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_bloc.dart';
import 'package:aiden_mobile/presentation/features/chatbots/screens/chatbot_create_screen.dart';
import 'package:aiden_mobile/presentation/features/chatbots/screens/chatbot_detail_screen.dart';
import 'package:aiden_mobile/presentation/features/chatbots/screens/chatbot_list_screen.dart';
import 'package:aiden_mobile/presentation/features/dashboard/screens/dashboard_screen.dart';
import 'package:aiden_mobile/presentation/features/documents/screens/document_list_screen.dart';
import 'package:aiden_mobile/presentation/features/handoff/screens/handoff_list_screen.dart';
import 'package:aiden_mobile/presentation/features/leads/screens/leads_screen.dart';
import 'package:aiden_mobile/presentation/features/learning/screens/learning_screen.dart';
import 'package:aiden_mobile/presentation/features/settings/screens/settings_screen.dart';

/// App routes constants
class AppRoutes {
  AppRoutes._();

  // Auth routes
  static const String splash = '/splash';
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';
  static const String verifyEmail = '/verify-email';

  // Main routes
  static const String dashboard = '/dashboard';
  static const String chatbots = '/chatbots';
  static const String chatbotCreate = '/chatbots/create';
  static String chatbotDetail(String botId) => '/chatbots/$botId';
  static String chatbotSettings(String botId) => '/chatbots/$botId/settings';
  static String chatbotDocuments(String botId) => '/chatbots/$botId/documents';
  static String chatbotChat(String botId) => '/chatbots/$botId/chat';
  static String chatbotAnalytics(String botId) => '/chatbots/$botId/analytics';
  static String chatbotLeads(String botId) => '/chatbots/$botId/leads';
  static String chatbotHandoff(String botId) => '/chatbots/$botId/handoff';
  static String chatbotBookings(String botId) => '/chatbots/$botId/bookings';
  static String chatbotLearning(String botId) => '/chatbots/$botId/learning';

  // Live chat routes
  static const String liveChat = '/live-chat';
  static String liveChatSession(String botId, String handoffId) =>
      '/live-chat/$botId/$handoffId';

  // Settings routes
  static const String settings = '/settings';
  static const String settingsApiKeys = '/settings/api-keys';
  static const String settingsAppearance = '/settings/appearance';
  static const String settingsGdpr = '/settings/gdpr';
}

/// Global navigator key
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

/// Create the app router
GoRouter createAppRouter(AuthBloc authBloc) {
  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,
    refreshListenable: GoRouterRefreshStream(authBloc.stream),
    redirect: (context, state) {
      final authState = authBloc.state;
      final isLoggedIn = authState.isAuthenticated;
      final isOnAuthPage = state.matchedLocation == AppRoutes.login ||
          state.matchedLocation == AppRoutes.register ||
          state.matchedLocation == AppRoutes.forgotPassword ||
          state.matchedLocation == AppRoutes.resetPassword ||
          state.matchedLocation.startsWith(AppRoutes.verifyEmail);
      final isOnSplash = state.matchedLocation == AppRoutes.splash;

      // Still checking auth status
      if (authState.status == AuthStatus.initial ||
          (authState.status == AuthStatus.loading && isOnSplash)) {
        return null;
      }

      // Not logged in - redirect to login
      if (!isLoggedIn && !isOnAuthPage) {
        return AppRoutes.login;
      }

      // Logged in but on auth page - redirect to dashboard
      if (isLoggedIn && isOnAuthPage) {
        return AppRoutes.dashboard;
      }

      // Email verification required
      if (authState.status == AuthStatus.emailVerificationRequired &&
          !state.matchedLocation.startsWith(AppRoutes.verifyEmail)) {
        return '${AppRoutes.verifyEmail}?email=${authState.pendingEmail}';
      }

      return null;
    },
    routes: [
      // ============================================
      // AUTH ROUTES
      // ============================================
      GoRoute(
        path: AppRoutes.splash,
        name: 'splash',
        builder: (context, state) => const _SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        name: 'forgotPassword',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.verifyEmail,
        name: 'verifyEmail',
        builder: (context, state) => VerifyEmailScreen(
          email: state.uri.queryParameters['email'],
          token: state.uri.queryParameters['token'],
        ),
      ),

      // ============================================
      // MAIN APP SHELL WITH BOTTOM NAVIGATION
      // ============================================
      ShellRoute(
        builder: (context, state, child) => _NavigationShell(child: child),
        routes: [
          // Dashboard Tab
          GoRoute(
            path: AppRoutes.dashboard,
            name: 'dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),

          // Chatbots Tab
          GoRoute(
            path: AppRoutes.chatbots,
            name: 'chatbots',
            builder: (context, state) => BlocProvider(
              create: (context) => getIt<ChatbotBloc>(),
              child: const ChatbotListScreen(),
            ),
            routes: [
              GoRoute(
                path: 'create',
                name: 'chatbotCreate',
                builder: (context, state) => BlocProvider(
                  create: (context) => getIt<ChatbotBloc>(),
                  child: const ChatbotCreateScreen(),
                ),
              ),
              GoRoute(
                path: ':botId',
                name: 'chatbotDetail',
                builder: (context, state) {
                  final botId = state.pathParameters['botId']!;
                  return BlocProvider(
                    create: (context) => getIt<ChatbotBloc>(),
                    child: ChatbotDetailScreen(botId: botId),
                  );
                },
                routes: [
                  GoRoute(
                    path: 'settings',
                    name: 'chatbotSettings',
                    builder: (context, state) =>
                        const _PlaceholderScreen(title: 'Settings'),
                  ),
                  GoRoute(
                    path: 'documents',
                    name: 'chatbotDocuments',
                    builder: (context, state) {
                      final botId = state.pathParameters['botId']!;
                      return BlocProvider(
                        create: (context) => getIt<ChatbotBloc>(),
                        child: DocumentListScreen(botId: botId),
                      );
                    },
                  ),
                  GoRoute(
                    path: 'chat',
                    name: 'chatbotChat',
                    builder: (context, state) {
                      final botId = state.pathParameters['botId']!;
                      return BlocProvider(
                        create: (context) => getIt<ChatBloc>(),
                        child: ChatScreen(botId: botId),
                      );
                    },
                  ),
                  GoRoute(
                    path: 'analytics',
                    name: 'chatbotAnalytics',
                    builder: (context, state) {
                      final botId = state.pathParameters['botId']!;
                      return AnalyticsScreen(botId: botId);
                    },
                  ),
                  GoRoute(
                    path: 'leads',
                    name: 'chatbotLeads',
                    builder: (context, state) {
                      final botId = state.pathParameters['botId']!;
                      return LeadsScreen(botId: botId);
                    },
                  ),
                  GoRoute(
                    path: 'handoff',
                    name: 'chatbotHandoff',
                    builder: (context, state) {
                      final botId = state.pathParameters['botId']!;
                      return HandoffListScreen(botId: botId);
                    },
                  ),
                  GoRoute(
                    path: 'bookings',
                    name: 'chatbotBookings',
                    builder: (context, state) {
                      final botId = state.pathParameters['botId']!;
                      return BookingsScreen(botId: botId);
                    },
                  ),
                  GoRoute(
                    path: 'learning',
                    name: 'chatbotLearning',
                    builder: (context, state) {
                      final botId = state.pathParameters['botId']!;
                      return LearningScreen(botId: botId);
                    },
                  ),
                ],
              ),
            ],
          ),

          // Live Chat Tab
          GoRoute(
            path: AppRoutes.liveChat,
            name: 'liveChat',
            builder: (context, state) =>
                const _PlaceholderScreen(title: 'Live Chat Queue'),
            routes: [
              GoRoute(
                path: ':botId/:handoffId',
                name: 'liveChatSession',
                builder: (context, state) {
                  final botId = state.pathParameters['botId']!;
                  final handoffId = state.pathParameters['handoffId']!;
                  return LiveChatScreen(
                    botId: botId,
                    handoffId: handoffId,
                  );
                },
              ),
            ],
          ),

          // Settings Tab
          GoRoute(
            path: AppRoutes.settings,
            name: 'settings',
            builder: (context, state) => const SettingsScreen(),
            routes: [
              GoRoute(
                path: 'api-keys',
                name: 'settingsApiKeys',
                builder: (context, state) => const ApiKeysScreen(),
              ),
              GoRoute(
                path: 'appearance',
                name: 'settingsAppearance',
                builder: (context, state) => const AppearanceScreen(),
              ),
              GoRoute(
                path: 'gdpr',
                name: 'settingsGdpr',
                builder: (context, state) => const GdprScreen(),
              ),
            ],
          ),
        ],
      ),
    ],

    // Error page
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Page not found',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(state.error?.message ?? 'Unknown error'),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go(AppRoutes.dashboard),
              child: const Text('Go to Dashboard'),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Splash screen - checks auth status
class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Check auth status after a brief delay
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) {
        context.read<AuthBloc>().add(const AuthCheckStatus());
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.smart_toy,
                size: 60,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'AIDEN',
              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 48),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}

/// Navigation shell with bottom navigation bar
class _NavigationShell extends StatelessWidget {
  final Widget child;

  const _NavigationShell({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _calculateIndex(context),
        onDestinationSelected: (index) => _onNavTap(context, index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.smart_toy_outlined),
            selectedIcon: Icon(Icons.smart_toy),
            label: 'Chatbots',
          ),
          NavigationDestination(
            icon: Icon(Icons.headset_mic_outlined),
            selectedIcon: Icon(Icons.headset_mic),
            label: 'Live Chat',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }

  int _calculateIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/settings')) return 3;
    if (location.startsWith('/live-chat')) return 2;
    if (location.startsWith('/chatbots')) return 1;
    return 0; // Dashboard
  }

  void _onNavTap(BuildContext context, int index) {
    final routes = [
      AppRoutes.dashboard,
      AppRoutes.chatbots,
      AppRoutes.liveChat,
      AppRoutes.settings,
    ];
    context.go(routes[index]);
  }
}

/// Temporary placeholder screen for development
class _PlaceholderScreen extends StatelessWidget {
  final String title;

  const _PlaceholderScreen({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          // Logout button
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              context.read<AuthBloc>().add(const AuthLogoutRequested());
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.construction,
              size: 64,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Coming soon...',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

/// GoRouter refresh stream helper
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
