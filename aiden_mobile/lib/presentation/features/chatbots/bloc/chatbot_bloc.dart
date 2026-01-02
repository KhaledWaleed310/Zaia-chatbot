import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:aiden_mobile/domain/repositories/chatbot_repository.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_event.dart';
import 'package:aiden_mobile/presentation/features/chatbots/bloc/chatbot_state.dart';

/// BLoC for chatbot management
class ChatbotBloc extends Bloc<ChatbotEvent, ChatbotState> {
  final ChatbotRepository chatbotRepository;

  ChatbotBloc({required this.chatbotRepository}) : super(ChatbotState.initial()) {
    on<ChatbotLoadAll>(_onLoadAll);
    on<ChatbotLoadOne>(_onLoadOne);
    on<ChatbotCreate>(_onCreate);
    on<ChatbotUpdate>(_onUpdate);
    on<ChatbotDelete>(_onDelete);
    on<ChatbotLoadDocuments>(_onLoadDocuments);
    on<ChatbotUploadDocument>(_onUploadDocument);
    on<ChatbotDeleteDocument>(_onDeleteDocument);
    on<ChatbotSelect>(_onSelect);
    on<ChatbotClearError>(_onClearError);
    on<ChatbotClearSuccess>(_onClearSuccess);
  }

  Future<void> _onLoadAll(
    ChatbotLoadAll event,
    Emitter<ChatbotState> emit,
  ) async {
    emit(state.copyWith(status: ChatbotStatus.loading, clearError: true));

    final result = await chatbotRepository.getChatbots(
      forceRefresh: event.forceRefresh,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatbotStatus.error,
        errorMessage: failure.message,
      )),
      (chatbots) => emit(state.copyWith(
        status: ChatbotStatus.loaded,
        chatbots: chatbots,
      )),
    );
  }

  Future<void> _onLoadOne(
    ChatbotLoadOne event,
    Emitter<ChatbotState> emit,
  ) async {
    emit(state.copyWith(status: ChatbotStatus.loading, clearError: true));

    final result = await chatbotRepository.getChatbot(event.botId);

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatbotStatus.error,
        errorMessage: failure.message,
      )),
      (chatbot) => emit(state.copyWith(
        status: ChatbotStatus.loaded,
        selectedChatbot: chatbot,
      )),
    );
  }

  Future<void> _onCreate(
    ChatbotCreate event,
    Emitter<ChatbotState> emit,
  ) async {
    emit(state.copyWith(status: ChatbotStatus.creating, clearError: true));

    final result = await chatbotRepository.createChatbot(
      name: event.name,
      systemPrompt: event.systemPrompt,
      welcomeMessage: event.welcomeMessage,
      primaryColor: event.primaryColor,
      textColor: event.textColor,
      position: event.position,
      isPersonal: event.isPersonal,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatbotStatus.error,
        errorMessage: failure.message,
      )),
      (chatbot) {
        final updatedList = [...state.chatbots, chatbot];
        emit(state.copyWith(
          status: ChatbotStatus.created,
          chatbots: updatedList,
          selectedChatbot: chatbot,
          successMessage: 'Chatbot created successfully',
        ));
      },
    );
  }

  Future<void> _onUpdate(
    ChatbotUpdate event,
    Emitter<ChatbotState> emit,
  ) async {
    emit(state.copyWith(status: ChatbotStatus.updating, clearError: true));

    final result = await chatbotRepository.updateChatbot(
      botId: event.botId,
      name: event.name,
      systemPrompt: event.systemPrompt,
      welcomeMessage: event.welcomeMessage,
      primaryColor: event.primaryColor,
      textColor: event.textColor,
      position: event.position,
      isPublic: event.isPublic,
      sharePassword: event.sharePassword,
      isPersonal: event.isPersonal,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatbotStatus.error,
        errorMessage: failure.message,
      )),
      (chatbot) {
        final updatedList = state.chatbots
            .map((c) => c.id == chatbot.id ? chatbot : c)
            .toList();
        emit(state.copyWith(
          status: ChatbotStatus.updated,
          chatbots: updatedList,
          selectedChatbot: chatbot,
          successMessage: 'Chatbot updated successfully',
        ));
      },
    );
  }

  Future<void> _onDelete(
    ChatbotDelete event,
    Emitter<ChatbotState> emit,
  ) async {
    emit(state.copyWith(status: ChatbotStatus.deleting, clearError: true));

    final result = await chatbotRepository.deleteChatbot(event.botId);

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatbotStatus.error,
        errorMessage: failure.message,
      )),
      (_) {
        final updatedList =
            state.chatbots.where((c) => c.id != event.botId).toList();
        emit(state.copyWith(
          status: ChatbotStatus.deleted,
          chatbots: updatedList,
          clearSelectedChatbot:
              state.selectedChatbot?.id == event.botId ? true : false,
          successMessage: 'Chatbot deleted successfully',
        ));
      },
    );
  }

  Future<void> _onLoadDocuments(
    ChatbotLoadDocuments event,
    Emitter<ChatbotState> emit,
  ) async {
    emit(state.copyWith(isLoadingDocuments: true, clearError: true));

    final result = await chatbotRepository.getDocuments(event.botId);

    result.fold(
      (failure) => emit(state.copyWith(
        isLoadingDocuments: false,
        status: ChatbotStatus.error,
        errorMessage: failure.message,
      )),
      (documents) => emit(state.copyWith(
        isLoadingDocuments: false,
        documents: documents,
      )),
    );
  }

  Future<void> _onUploadDocument(
    ChatbotUploadDocument event,
    Emitter<ChatbotState> emit,
  ) async {
    emit(state.copyWith(
      status: ChatbotStatus.uploadingDocument,
      clearError: true,
    ));

    final result = await chatbotRepository.uploadDocument(
      event.botId,
      event.file,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatbotStatus.error,
        errorMessage: failure.message,
      )),
      (document) {
        final updatedDocs = [...state.documents, document];
        emit(state.copyWith(
          status: ChatbotStatus.documentUploaded,
          documents: updatedDocs,
          successMessage: 'Document uploaded successfully',
        ));
      },
    );
  }

  Future<void> _onDeleteDocument(
    ChatbotDeleteDocument event,
    Emitter<ChatbotState> emit,
  ) async {
    emit(state.copyWith(
      status: ChatbotStatus.deletingDocument,
      clearError: true,
    ));

    final result = await chatbotRepository.deleteDocument(
      event.botId,
      event.documentId,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: ChatbotStatus.error,
        errorMessage: failure.message,
      )),
      (_) {
        final updatedDocs = state.documents
            .where((d) => d.id != event.documentId)
            .toList();
        emit(state.copyWith(
          status: ChatbotStatus.documentDeleted,
          documents: updatedDocs,
          successMessage: 'Document deleted successfully',
        ));
      },
    );
  }

  void _onSelect(
    ChatbotSelect event,
    Emitter<ChatbotState> emit,
  ) {
    if (event.botId == null) {
      emit(state.copyWith(clearSelectedChatbot: true, documents: []));
    } else {
      final chatbot = state.chatbots.firstWhere(
        (c) => c.id == event.botId,
        orElse: () => state.selectedChatbot!,
      );
      emit(state.copyWith(selectedChatbot: chatbot));
    }
  }

  void _onClearError(
    ChatbotClearError event,
    Emitter<ChatbotState> emit,
  ) {
    emit(state.copyWith(clearError: true));
  }

  void _onClearSuccess(
    ChatbotClearSuccess event,
    Emitter<ChatbotState> emit,
  ) {
    emit(state.copyWith(clearSuccess: true));
  }
}
