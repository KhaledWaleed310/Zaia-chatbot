import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';

import 'package:aiden_mobile/domain/entities/message.dart';
import 'package:aiden_mobile/domain/repositories/chat_repository.dart';
import 'package:aiden_mobile/presentation/features/chat/bloc/chat_event.dart';
import 'package:aiden_mobile/presentation/features/chat/bloc/chat_state.dart';

/// BLoC for chat functionality
class ChatBloc extends Bloc<ChatEvent, ChatState> {
  final ChatRepository chatRepository;
  final Uuid _uuid = const Uuid();
  StreamSubscription<dynamic>? _streamSubscription;

  ChatBloc({required this.chatRepository}) : super(ChatState.initial()) {
    on<ChatInitialize>(_onInitialize);
    on<ChatSendMessage>(_onSendMessage);
    on<ChatLoadConversations>(_onLoadConversations);
    on<ChatSelectConversation>(_onSelectConversation);
    on<ChatNewConversation>(_onNewConversation);
    on<ChatDeleteConversation>(_onDeleteConversation);
    on<ChatClearError>(_onClearError);
  }

  @override
  Future<void> close() {
    _streamSubscription?.cancel();
    return super.close();
  }

  Future<void> _onInitialize(
    ChatInitialize event,
    Emitter<ChatState> emit,
  ) async {
    emit(state.copyWith(
      status: ChatStatus.loading,
      botId: event.botId,
      sessionId: event.sessionId,
      messages: [],
    ));

    if (event.sessionId != null) {
      final result = await chatRepository.getConversation(
        event.botId,
        event.sessionId!,
      );

      result.fold(
        (failure) => emit(state.copyWith(
          status: ChatStatus.error,
          errorMessage: failure.message,
        )),
        (conversation) => emit(state.copyWith(
          status: ChatStatus.loaded,
          messages: conversation.messages ?? [],
        )),
      );
    } else {
      emit(state.copyWith(status: ChatStatus.loaded));
    }
  }

  Future<void> _onSendMessage(
    ChatSendMessage event,
    Emitter<ChatState> emit,
  ) async {
    if (state.botId == null) return;

    // Add user message
    final userMessage = Message(
      id: _uuid.v4(),
      role: 'user',
      content: event.message,
      timestamp: DateTime.now(),
    );

    emit(state.copyWith(
      status: ChatStatus.sending,
      messages: [...state.messages, userMessage],
      clearError: true,
    ));

    // Add placeholder for assistant response
    final assistantId = _uuid.v4();
    final assistantMessage = Message(
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: DateTime.now(),
      isStreaming: true,
    );

    emit(state.copyWith(
      status: ChatStatus.streaming,
      messages: [...state.messages, assistantMessage],
      streamingContent: '',
    ));

    // Stream response
    String fullContent = '';
    String? newSessionId = state.sessionId;

    await _streamSubscription?.cancel();

    try {
      await for (final result in chatRepository.sendMessageStream(
        state.botId!,
        event.message,
        state.sessionId,
      )) {
        result.fold(
          (failure) {
            emit(state.copyWith(
              status: ChatStatus.error,
              errorMessage: failure.message,
            ));
          },
          (chunk) {
            fullContent += chunk;

            // Update the assistant message with new content
            final updatedMessages = state.messages.map((m) {
              if (m.id == assistantId) {
                return m.copyWith(content: fullContent);
              }
              return m;
            }).toList();

            emit(state.copyWith(
              messages: updatedMessages,
              streamingContent: fullContent,
            ));
          },
        );
      }

      // Finalize the message
      final finalMessages = state.messages.map((m) {
        if (m.id == assistantId) {
          return m.copyWith(
            content: fullContent,
            isStreaming: false,
          );
        }
        return m;
      }).toList();

      emit(state.copyWith(
        status: ChatStatus.loaded,
        messages: finalMessages,
        sessionId: newSessionId,
        streamingContent: '',
      ));
    } catch (e) {
      emit(state.copyWith(
        status: ChatStatus.error,
        errorMessage: e.toString(),
      ));
    }
  }

  Future<void> _onLoadConversations(
    ChatLoadConversations event,
    Emitter<ChatState> emit,
  ) async {
    emit(state.copyWith(status: ChatStatus.loading));

    final result = await chatRepository.getConversations(event.botId);

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatStatus.error,
        errorMessage: failure.message,
      )),
      (conversations) => emit(state.copyWith(
        status: ChatStatus.loaded,
        conversations: conversations,
      )),
    );
  }

  Future<void> _onSelectConversation(
    ChatSelectConversation event,
    Emitter<ChatState> emit,
  ) async {
    if (state.botId == null) return;

    emit(state.copyWith(
      status: ChatStatus.loading,
      sessionId: event.sessionId,
    ));

    final result = await chatRepository.getConversation(
      state.botId!,
      event.sessionId,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatStatus.error,
        errorMessage: failure.message,
      )),
      (conversation) => emit(state.copyWith(
        status: ChatStatus.loaded,
        messages: conversation.messages ?? [],
      )),
    );
  }

  void _onNewConversation(
    ChatNewConversation event,
    Emitter<ChatState> emit,
  ) {
    emit(state.copyWith(
      status: ChatStatus.loaded,
      clearSessionId: true,
      messages: [],
    ));
  }

  Future<void> _onDeleteConversation(
    ChatDeleteConversation event,
    Emitter<ChatState> emit,
  ) async {
    if (state.botId == null) return;

    final result = await chatRepository.deleteConversation(
      state.botId!,
      event.sessionId,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatStatus.error,
        errorMessage: failure.message,
      )),
      (_) {
        final updatedConversations = state.conversations
            .where((c) => c.sessionId != event.sessionId)
            .toList();

        emit(state.copyWith(
          conversations: updatedConversations,
          clearSessionId: state.sessionId == event.sessionId,
          messages: state.sessionId == event.sessionId ? [] : null,
        ));
      },
    );
  }

  void _onClearError(
    ChatClearError event,
    Emitter<ChatState> emit,
  ) {
    emit(state.copyWith(clearError: true));
  }
}
