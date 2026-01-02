import 'dart:async';
import 'dart:math' as math;

import 'package:web_socket_channel/web_socket_channel.dart';

import 'package:aiden_mobile/core/config/app_config.dart';
import 'package:aiden_mobile/core/utils/secure_storage.dart';
import 'package:aiden_mobile/core/websocket/websocket_events.dart';

/// WebSocket client for real-time handoff chat
class WebSocketClient {
  final SecureStorageService _secureStorage;

  WebSocketChannel? _channel;
  final _messageController = StreamController<WebSocketMessage>.broadcast();
  final _stateController =
      StreamController<WebSocketConnectionState>.broadcast();

  Timer? _pingTimer;
  Timer? _reconnectTimer;

  bool _isConnected = false;
  int _reconnectAttempts = 0;
  String? _currentUrl;
  String? _currentBotId;
  String? _currentHandoffId;
  bool _isVisitor = false;

  WebSocketClient({required SecureStorageService secureStorage})
      : _secureStorage = secureStorage;

  /// Stream of incoming messages
  Stream<WebSocketMessage> get messages => _messageController.stream;

  /// Stream of connection state changes
  Stream<WebSocketConnectionState> get connectionState =>
      _stateController.stream;

  /// Current connection status
  bool get isConnected => _isConnected;

  /// Current connection state
  WebSocketConnectionState get state {
    if (_isConnected) return WebSocketConnectionState.connected;
    if (_reconnectAttempts > 0) return WebSocketConnectionState.reconnecting;
    return WebSocketConnectionState.disconnected;
  }

  /// Connect to handoff WebSocket (agent side)
  Future<void> connectAgent({
    required String botId,
    required String handoffId,
  }) async {
    _currentBotId = botId;
    _currentHandoffId = handoffId;
    _isVisitor = false;

    final token = await _secureStorage.getAccessToken();
    _currentUrl =
        '${AppConfig.wsBaseUrl}/handoff/$botId/$handoffId/ws?token=$token';

    await _establishConnection();
  }

  /// Connect to handoff WebSocket (visitor side)
  Future<void> connectVisitor({
    required String botId,
    required String sessionId,
  }) async {
    _currentBotId = botId;
    _currentHandoffId = sessionId;
    _isVisitor = true;

    _currentUrl =
        '${AppConfig.wsBaseUrl}/handoff/$botId/session/$sessionId/ws';

    await _establishConnection();
  }

  /// Establish WebSocket connection
  Future<void> _establishConnection() async {
    if (_currentUrl == null) return;

    _stateController.add(WebSocketConnectionState.connecting);

    try {
      _channel = WebSocketChannel.connect(Uri.parse(_currentUrl!));

      // Wait for connection to establish
      await _channel!.ready;

      _isConnected = true;
      _reconnectAttempts = 0;
      _stateController.add(WebSocketConnectionState.connected);

      _startPingTimer();
      _listenToMessages();
    } catch (e) {
      _handleConnectionError(e);
    }
  }

  /// Listen to incoming messages
  void _listenToMessages() {
    _channel?.stream.listen(
      _handleMessage,
      onError: _handleError,
      onDone: _handleDone,
      cancelOnError: false,
    );
  }

  /// Handle incoming message
  void _handleMessage(dynamic data) {
    try {
      final message = WebSocketMessage.fromRawJson(data as String);

      // Handle pong messages internally
      if (message.type == WebSocketMessageType.pong) {
        return;
      }

      _messageController.add(message);
    } catch (e) {
      // Try to parse as simple text message
      _messageController.add(
        WebSocketMessage(
          type: WebSocketMessageType.message,
          data: {'content': data.toString()},
        ),
      );
    }
  }

  /// Handle stream error
  void _handleError(dynamic error) {
    _isConnected = false;
    _stateController.add(WebSocketConnectionState.reconnecting);
    _messageController.addError(error);
    _attemptReconnect();
  }

  /// Handle stream done (connection closed)
  void _handleDone() {
    _isConnected = false;
    _stopPingTimer();
    _attemptReconnect();
  }

  /// Handle connection error
  void _handleConnectionError(dynamic error) {
    _isConnected = false;
    _stateController.add(WebSocketConnectionState.failed);
    _messageController.addError(error);
    _attemptReconnect();
  }

  /// Attempt to reconnect with exponential backoff
  void _attemptReconnect() {
    if (_reconnectAttempts >= AppConfig.maxReconnectAttempts) {
      _stateController.add(WebSocketConnectionState.failed);
      _messageController.addError(const WebSocketReconnectFailed());
      return;
    }

    _reconnectTimer?.cancel();

    // Exponential backoff with jitter
    final delay = Duration(
      milliseconds: math.min(
        AppConfig.reconnectDelay.inMilliseconds *
            math.pow(2, _reconnectAttempts).toInt(),
        30000, // Max 30 seconds
      ),
    );

    _stateController.add(WebSocketConnectionState.reconnecting);

    _reconnectTimer = Timer(delay, () {
      _reconnectAttempts++;
      _establishConnection();
    });
  }

  /// Start ping timer for connection health
  void _startPingTimer() {
    _stopPingTimer();
    _pingTimer = Timer.periodic(AppConfig.pingInterval, (_) {
      send(WebSocketMessage.ping());
    });
  }

  /// Stop ping timer
  void _stopPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = null;
  }

  /// Send a message
  void send(WebSocketMessage message) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(message.toRawJson());
    }
  }

  /// Send a chat message
  void sendMessage(String content, {String? senderName}) {
    send(WebSocketMessage.chatMessage(
      content: content,
      senderName: senderName,
    ));
  }

  /// Send typing indicator
  void sendTyping({String? senderName}) {
    send(WebSocketMessage.typing(senderName: senderName));
  }

  /// Send stop typing indicator
  void sendStopTyping() {
    send(WebSocketMessage.stopTyping());
  }

  /// Disconnect from WebSocket
  Future<void> disconnect() async {
    _stopPingTimer();
    _reconnectTimer?.cancel();
    _reconnectAttempts = 0;
    _currentUrl = null;

    await _channel?.sink.close();
    _channel = null;
    _isConnected = false;

    _stateController.add(WebSocketConnectionState.disconnected);
  }

  /// Reconnect to the same endpoint
  Future<void> reconnect() async {
    if (_currentBotId == null || _currentHandoffId == null) return;

    await disconnect();

    if (_isVisitor) {
      await connectVisitor(
        botId: _currentBotId!,
        sessionId: _currentHandoffId!,
      );
    } else {
      await connectAgent(
        botId: _currentBotId!,
        handoffId: _currentHandoffId!,
      );
    }
  }

  /// Dispose resources
  void dispose() {
    disconnect();
    _messageController.close();
    _stateController.close();
  }
}
