import 'dart:convert';

/// WebSocket message types
enum WebSocketMessageType {
  /// New chat message
  message,

  /// User is typing
  typing,

  /// User stopped typing
  stopTyping,

  /// Ping for connection health
  ping,

  /// Pong response
  pong,

  /// Agent joined the chat
  agentJoined,

  /// Agent left the chat
  agentLeft,

  /// Visitor connected
  visitorConnected,

  /// Visitor disconnected
  visitorDisconnected,

  /// Handoff status changed
  statusChange,

  /// Error occurred
  error,

  /// Connection established
  connected,

  /// Unknown message type
  unknown,
}

/// WebSocket message model
class WebSocketMessage {
  final WebSocketMessageType type;
  final Map<String, dynamic>? data;
  final String? senderId;
  final String? senderName;
  final DateTime timestamp;

  WebSocketMessage({
    required this.type,
    this.data,
    this.senderId,
    this.senderName,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  /// Create a message from JSON
  factory WebSocketMessage.fromJson(Map<String, dynamic> json) {
    return WebSocketMessage(
      type: _parseMessageType(json['type'] as String? ?? 'unknown'),
      data: json['data'] as Map<String, dynamic>?,
      senderId: json['sender_id'] as String?,
      senderName: json['sender_name'] as String?,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : DateTime.now(),
    );
  }

  /// Parse from raw JSON string
  factory WebSocketMessage.fromRawJson(String rawJson) {
    final json = jsonDecode(rawJson) as Map<String, dynamic>;
    return WebSocketMessage.fromJson(json);
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'type': type.name,
      if (data != null) 'data': data,
      if (senderId != null) 'sender_id': senderId,
      if (senderName != null) 'sender_name': senderName,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  /// Convert to raw JSON string
  String toRawJson() => jsonEncode(toJson());

  /// Parse message type from string
  static WebSocketMessageType _parseMessageType(String type) {
    switch (type.toLowerCase()) {
      case 'message':
        return WebSocketMessageType.message;
      case 'typing':
        return WebSocketMessageType.typing;
      case 'stop_typing':
      case 'stoptyping':
        return WebSocketMessageType.stopTyping;
      case 'ping':
        return WebSocketMessageType.ping;
      case 'pong':
        return WebSocketMessageType.pong;
      case 'agent_joined':
      case 'agentjoined':
        return WebSocketMessageType.agentJoined;
      case 'agent_left':
      case 'agentleft':
        return WebSocketMessageType.agentLeft;
      case 'visitor_connected':
      case 'visitorconnected':
        return WebSocketMessageType.visitorConnected;
      case 'visitor_disconnected':
      case 'visitordisconnected':
        return WebSocketMessageType.visitorDisconnected;
      case 'status_change':
      case 'statuschange':
        return WebSocketMessageType.statusChange;
      case 'error':
        return WebSocketMessageType.error;
      case 'connected':
        return WebSocketMessageType.connected;
      default:
        return WebSocketMessageType.unknown;
    }
  }

  /// Create a ping message
  factory WebSocketMessage.ping() {
    return WebSocketMessage(type: WebSocketMessageType.ping);
  }

  /// Create a pong message
  factory WebSocketMessage.pong() {
    return WebSocketMessage(type: WebSocketMessageType.pong);
  }

  /// Create a chat message
  factory WebSocketMessage.chatMessage({
    required String content,
    String? senderId,
    String? senderName,
  }) {
    return WebSocketMessage(
      type: WebSocketMessageType.message,
      data: {'content': content},
      senderId: senderId,
      senderName: senderName,
    );
  }

  /// Create a typing indicator message
  factory WebSocketMessage.typing({String? senderId, String? senderName}) {
    return WebSocketMessage(
      type: WebSocketMessageType.typing,
      senderId: senderId,
      senderName: senderName,
    );
  }

  /// Create a stop typing message
  factory WebSocketMessage.stopTyping({String? senderId}) {
    return WebSocketMessage(
      type: WebSocketMessageType.stopTyping,
      senderId: senderId,
    );
  }

  /// Get message content if it's a chat message
  String? get messageContent {
    if (type == WebSocketMessageType.message && data != null) {
      return data!['content'] as String?;
    }
    return null;
  }

  @override
  String toString() {
    return 'WebSocketMessage(type: $type, senderId: $senderId, data: $data)';
  }
}

/// WebSocket connection state
enum WebSocketConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  failed,
}

/// Exception for WebSocket reconnection failures
class WebSocketReconnectFailed implements Exception {
  final String message;

  const WebSocketReconnectFailed([this.message = 'WebSocket reconnection failed']);

  @override
  String toString() => 'WebSocketReconnectFailed: $message';
}
