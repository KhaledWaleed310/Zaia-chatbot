/// API endpoint constants
class ApiEndpoints {
  ApiEndpoints._();

  // ============================================
  // AUTHENTICATION
  // ============================================
  static const String authLogin = '/auth/login';
  static const String authRegister = '/auth/register';
  static const String authMe = '/auth/me';
  static const String authVerifyEmail = '/auth/verify-email';
  static const String authResendVerification = '/auth/resend-verification';
  static const String authForgotPassword = '/auth/forgot-password';
  static const String authResetPassword = '/auth/reset-password';

  // ============================================
  // CHATBOTS
  // ============================================
  static const String chatbots = '/chatbots';
  static String chatbot(String botId) => '/chatbots/$botId';
  static String chatbotEmbed(String botId) => '/chatbots/$botId/embed';
  static String chatbotDocuments(String botId) => '/chatbots/$botId/documents';
  static String chatbotDocument(String botId, String docId) =>
      '/chatbots/$botId/documents/$docId';
  static String chatbotShareConfig(String botId) =>
      '/chatbots/share/$botId/config';
  static String chatbotShareVerify(String botId) =>
      '/chatbots/share/$botId/verify';
  static String chatbotShareCheckAccess(String botId) =>
      '/chatbots/share/$botId/check-access';

  // ============================================
  // CHAT
  // ============================================
  static String chatMessage(String botId) => '/chat/$botId/message';
  static String chatMessageStream(String botId) => '/chat/$botId/message/stream';
  static String chatConfig(String botId) => '/chat/$botId/config';
  static String chatAnalytics(String botId) => '/chat/$botId/analytics';
  static String chatConversations(String botId) => '/chat/$botId/conversations';
  static String chatConversation(String botId, String sessionId) =>
      '/chat/$botId/conversations/$sessionId';

  // ============================================
  // ANALYTICS
  // ============================================
  static String analyticsUnanswered(String botId) =>
      '/analytics/$botId/unanswered-questions';
  static String analyticsUnansweredQuestion(String botId, String questionId) =>
      '/analytics/$botId/unanswered-questions/$questionId';
  static String analyticsUnansweredSummary(String botId) =>
      '/analytics/$botId/unanswered-summary';
  static String analyticsSentimentSummary(String botId) =>
      '/analytics/$botId/sentiment/summary';
  static String analyticsSentimentTimeline(String botId) =>
      '/analytics/$botId/sentiment/timeline';
  static String analyticsQualitySummary(String botId) =>
      '/analytics/$botId/quality/summary';
  static String analyticsQualityResponses(String botId) =>
      '/analytics/$botId/quality/responses';
  static String analyticsUsageRealtime(String botId) =>
      '/analytics/$botId/usage/realtime';
  static String analyticsUsageHeatmap(String botId) =>
      '/analytics/$botId/usage/heatmap';
  static String analyticsUsagePeakHours(String botId) =>
      '/analytics/$botId/usage/peak-hours';
  static String analyticsTopics(String botId) => '/analytics/$botId/topics';
  static String analyticsTopicsCluster(String botId) =>
      '/analytics/$botId/topics/cluster';
  static String analyticsDashboard(String botId) => '/analytics/$botId/dashboard';

  // ============================================
  // LEADS
  // ============================================
  static String leads(String botId) => '/leads/$botId';
  static String lead(String botId, String leadId) => '/leads/$botId/$leadId';
  static String leadsStats(String botId) => '/leads/$botId/stats';
  static String leadsExport(String botId) => '/leads/$botId/export';
  static String leadsFormConfig(String botId) => '/leads/$botId/form-config';
  static String leadsPublicFormConfig(String botId) =>
      '/leads/$botId/public-form-config';
  static String leadsSubmit(String botId) => '/leads/$botId/submit';

  // ============================================
  // HANDOFF / LIVE CHAT
  // ============================================
  static String handoffs(String botId) => '/handoff/$botId';
  static String handoff(String botId, String handoffId) =>
      '/handoff/$botId/$handoffId';
  static String handoffStats(String botId) => '/handoff/$botId/stats';
  static String handoffConfig(String botId) => '/handoff/$botId/config';
  static String handoffPublicConfig(String botId) =>
      '/handoff/$botId/public-config';
  static String handoffDirect(String botId, String handoffId) =>
      '/handoff/$botId/direct/$handoffId';
  static String handoffMessage(String botId, String handoffId) =>
      '/handoff/$botId/$handoffId/message';
  static const String handoffAgentsPresence = '/handoff/agents/presence';
  static const String handoffAgentsStatus = '/handoff/agents/status';
  static String handoffRequest(String botId) => '/handoff/$botId/request';
  static String handoffSession(String botId, String sessionId) =>
      '/handoff/$botId/session/$sessionId';
  static String handoffSessionMessage(String botId, String sessionId) =>
      '/handoff/$botId/session/$sessionId/message';

  // WebSocket endpoints
  static String handoffWs(String botId, String handoffId) =>
      '/handoff/$botId/$handoffId/ws';
  static String handoffSessionWs(String botId, String sessionId) =>
      '/handoff/$botId/session/$sessionId/ws';

  // ============================================
  // BOOKINGS
  // ============================================
  static String bookings(String botId) => '/bookings/$botId';
  static String booking(String botId, String bookingId) =>
      '/bookings/$botId/$bookingId';
  static String bookingsCalendar(String botId) => '/bookings/$botId/calendar';
  static String bookingsCheckAvailability(String botId) =>
      '/bookings/$botId/check-availability';
  static String bookingConfig(String botId) => '/handoff/$botId/booking-config';
  static String bookingConfigToggle(String botId) =>
      '/handoff/$botId/booking-config/toggle';

  // ============================================
  // LEARNING (AIDEN)
  // ============================================
  static String learningFeedback(String botId) => '/learning/$botId/feedback';
  static String learningPatterns(String botId) => '/learning/$botId/patterns';
  static String learningKnowledge(String botId) => '/learning/$botId/knowledge';
  static String learningCrystallize(String botId) =>
      '/learning/$botId/crystallize';
  static String learningInsights(String botId) => '/learning/$botId/insights';
  static String learningExperiments(String botId) =>
      '/learning/$botId/experiments';
  static String learningStats(String botId) => '/learning/$botId/stats';

  // ============================================
  // FEEDBACK & TRAINING
  // ============================================
  static String feedbackSubmit(String botId) => '/feedback/$botId/submit';
  static String feedback(String botId) => '/feedback/$botId';
  static String feedbackStats(String botId) => '/feedback/$botId/stats';
  static String feedbackTraining(String botId) => '/feedback/$botId/training';
  static String feedbackTrainingPair(String botId, String pairId) =>
      '/feedback/$botId/training/$pairId';
  static String feedbackTrainingExport(String botId) =>
      '/feedback/$botId/training/export';

  // ============================================
  // INTEGRATIONS
  // ============================================
  static String integrationAuthUrl(String provider) =>
      '/integrations/$provider/auth-url';
  static String integrationCallback(String provider) =>
      '/integrations/$provider/callback';
  static String chatbotIntegrations(String botId) =>
      '/integrations/chatbots/$botId';
  static String chatbotIntegration(String botId, String provider) =>
      '/integrations/chatbots/$botId/$provider';
  static String chatbotIntegrationBrowse(String botId, String provider) =>
      '/integrations/chatbots/$botId/$provider/browse';
  static String chatbotIntegrationImport(String botId, String provider) =>
      '/integrations/chatbots/$botId/$provider/import';
  static String chatbotIntegrationStatus(String botId, String provider) =>
      '/integrations/chatbots/$botId/$provider/status';

  // ============================================
  // MESSENGER
  // ============================================
  static const String messengerAuthUrl = '/messenger/auth-url';
  static const String messengerCallback = '/messenger/callback';
  static String messengerPages(String botId) => '/messenger/$botId/pages';
  static String messengerConnect(String botId) => '/messenger/$botId/connect';
  static String messengerConfig(String botId) => '/messenger/$botId/config';
  static String messengerDisconnect(String botId) =>
      '/messenger/$botId/disconnect';
  static String messengerToggle(String botId) => '/messenger/$botId/toggle';

  // ============================================
  // API KEYS
  // ============================================
  static const String apiKeys = '/api-keys';
  static String apiKey(String keyId) => '/api-keys/$keyId';
  static String apiKeyRevoke(String keyId) => '/api-keys/$keyId/revoke';
  static String apiKeyUsage(String keyId) => '/api-keys/$keyId/usage';

  // ============================================
  // TRANSLATION
  // ============================================
  static const String translationLanguages = '/translation/languages';
  static const String translationDetect = '/translation/detect';
  static const String translationTranslate = '/translation/translate';
  static String translationWidget(String language) =>
      '/translation/widget/$language';
  static String translationChatbotConfig(String botId) =>
      '/translation/chatbots/$botId/config';
  static String translationChatbotPublicConfig(String botId) =>
      '/translation/chatbots/$botId/public-config';

  // ============================================
  // GREETING
  // ============================================
  static String greeting(String botId) => '/greeting/$botId';

  // ============================================
  // GDPR
  // ============================================
  static const String gdprExport = '/gdpr/export';
  static const String gdprDeleteRequest = '/gdpr/delete-request';
  static const String gdprDeleteImmediate = '/gdpr/delete-immediate';
  static const String gdprConsent = '/gdpr/consent';
  static const String gdprConsentStatus = '/gdpr/consent-status';
  static const String gdprCancelDeletion = '/gdpr/cancel-deletion';

  // ============================================
  // USER
  // ============================================
  static const String usersMe = '/users/me';
  static const String usersMeUsage = '/users/me/usage';

  // ============================================
  // HEALTH
  // ============================================
  static const String health = '/health';
}
