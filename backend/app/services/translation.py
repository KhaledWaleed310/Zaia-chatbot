from typing import Optional, Dict, Any, List
import httpx
import json
from ..core.config import settings


# Supported languages with their codes
SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "ru": "Russian",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "tr": "Turkish",
    "pl": "Polish",
    "vi": "Vietnamese",
    "th": "Thai",
    "id": "Indonesian"
}


async def detect_language(text: str) -> str:
    """Detect language of text using DeepSeek."""
    if not text or len(text.strip()) < 3:
        return "en"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a language detection assistant. Respond with only the 2-letter ISO language code (en, es, fr, de, it, pt, nl, ru, zh, ja, ko, ar, hi, tr, pl, vi, th, id). No other text."
                        },
                        {
                            "role": "user",
                            "content": f"Detect the language of this text: {text[:200]}"
                        }
                    ],
                    "max_tokens": 5,
                    "temperature": 0
                },
                timeout=10.0
            )

            result = response.json()
            detected = result["choices"][0]["message"]["content"].strip().lower()[:2]

            if detected in SUPPORTED_LANGUAGES:
                return detected
            return "en"

        except Exception as e:
            print(f"Language detection error: {e}")
            return "en"


async def translate_text(
    text: str,
    target_language: str,
    source_language: Optional[str] = None
) -> str:
    """Translate text to target language using DeepSeek."""
    if not text:
        return text

    if target_language not in SUPPORTED_LANGUAGES:
        target_language = "en"

    # Skip translation if already in target language
    if source_language == target_language:
        return text

    target_name = SUPPORTED_LANGUAGES.get(target_language, "English")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": f"You are a professional translator. Translate the following text to {target_name}. Only output the translation, nothing else. Preserve any markdown formatting."
                        },
                        {
                            "role": "user",
                            "content": text
                        }
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.3
                },
                timeout=30.0
            )

            result = response.json()
            return result["choices"][0]["message"]["content"].strip()

        except Exception as e:
            print(f"Translation error: {e}")
            return text


async def translate_response(
    response: str,
    user_language: str,
    bot_language: str = "en"
) -> str:
    """Translate bot response to user's language if needed."""
    if user_language == bot_language:
        return response

    return await translate_text(response, user_language, bot_language)


async def get_multilingual_system_prompt(
    base_prompt: str,
    target_language: str,
    include_translation_instruction: bool = True
) -> str:
    """Create a system prompt that instructs the bot to respond in the target language."""
    if target_language == "en":
        return base_prompt

    language_name = SUPPORTED_LANGUAGES.get(target_language, "English")

    if include_translation_instruction:
        return f"""{base_prompt}

IMPORTANT: The user is communicating in {language_name}. You MUST respond in {language_name}.
Always use {language_name} for your responses, regardless of the language of the knowledge base."""

    return base_prompt


# UI translations for chat widget
WIDGET_TRANSLATIONS = {
    "en": {
        "send_message": "Send a message...",
        "powered_by": "Powered by",
        "human_request": "Request Human",
        "close": "Close",
        "send": "Send",
        "typing": "Typing...",
        "new_conversation": "New Conversation",
        "offline_message": "We're currently offline. Leave a message!",
        "lead_form_title": "Get in Touch",
        "submit": "Submit",
        "name": "Name",
        "email": "Email",
        "phone": "Phone"
    },
    "es": {
        "send_message": "Enviar un mensaje...",
        "powered_by": "Desarrollado por",
        "human_request": "Solicitar Humano",
        "close": "Cerrar",
        "send": "Enviar",
        "typing": "Escribiendo...",
        "new_conversation": "Nueva Conversación",
        "offline_message": "Estamos desconectados. ¡Deja un mensaje!",
        "lead_form_title": "Contáctanos",
        "submit": "Enviar",
        "name": "Nombre",
        "email": "Correo",
        "phone": "Teléfono"
    },
    "fr": {
        "send_message": "Envoyer un message...",
        "powered_by": "Propulsé par",
        "human_request": "Demander un Humain",
        "close": "Fermer",
        "send": "Envoyer",
        "typing": "En train d'écrire...",
        "new_conversation": "Nouvelle Conversation",
        "offline_message": "Nous sommes hors ligne. Laissez un message!",
        "lead_form_title": "Contactez-nous",
        "submit": "Soumettre",
        "name": "Nom",
        "email": "Email",
        "phone": "Téléphone"
    },
    "de": {
        "send_message": "Nachricht senden...",
        "powered_by": "Bereitgestellt von",
        "human_request": "Mensch anfragen",
        "close": "Schließen",
        "send": "Senden",
        "typing": "Schreibt...",
        "new_conversation": "Neue Konversation",
        "offline_message": "Wir sind offline. Hinterlassen Sie eine Nachricht!",
        "lead_form_title": "Kontaktieren Sie uns",
        "submit": "Absenden",
        "name": "Name",
        "email": "E-Mail",
        "phone": "Telefon"
    },
    "pt": {
        "send_message": "Enviar uma mensagem...",
        "powered_by": "Desenvolvido por",
        "human_request": "Solicitar Humano",
        "close": "Fechar",
        "send": "Enviar",
        "typing": "Digitando...",
        "new_conversation": "Nova Conversa",
        "offline_message": "Estamos offline. Deixe uma mensagem!",
        "lead_form_title": "Entre em Contato",
        "submit": "Enviar",
        "name": "Nome",
        "email": "Email",
        "phone": "Telefone"
    },
    "zh": {
        "send_message": "发送消息...",
        "powered_by": "技术支持",
        "human_request": "请求人工",
        "close": "关闭",
        "send": "发送",
        "typing": "正在输入...",
        "new_conversation": "新对话",
        "offline_message": "我们目前离线。请留言！",
        "lead_form_title": "联系我们",
        "submit": "提交",
        "name": "姓名",
        "email": "邮箱",
        "phone": "电话"
    },
    "ja": {
        "send_message": "メッセージを送信...",
        "powered_by": "提供",
        "human_request": "オペレーターを呼ぶ",
        "close": "閉じる",
        "send": "送信",
        "typing": "入力中...",
        "new_conversation": "新しい会話",
        "offline_message": "現在オフラインです。メッセージを残してください！",
        "lead_form_title": "お問い合わせ",
        "submit": "送信",
        "name": "名前",
        "email": "メール",
        "phone": "電話"
    },
    "ko": {
        "send_message": "메시지 보내기...",
        "powered_by": "제공",
        "human_request": "상담원 연결",
        "close": "닫기",
        "send": "보내기",
        "typing": "입력 중...",
        "new_conversation": "새 대화",
        "offline_message": "현재 오프라인입니다. 메시지를 남겨주세요!",
        "lead_form_title": "문의하기",
        "submit": "제출",
        "name": "이름",
        "email": "이메일",
        "phone": "전화번호"
    },
    "ar": {
        "send_message": "...إرسال رسالة",
        "powered_by": "مدعوم من",
        "human_request": "طلب ممثل",
        "close": "إغلاق",
        "send": "إرسال",
        "typing": "...يكتب",
        "new_conversation": "محادثة جديدة",
        "offline_message": "!نحن غير متصلين حاليًا. اترك رسالة",
        "lead_form_title": "تواصل معنا",
        "submit": "إرسال",
        "name": "الاسم",
        "email": "البريد الإلكتروني",
        "phone": "الهاتف"
    }
}


def get_widget_translations(language: str) -> Dict[str, str]:
    """Get widget UI translations for a language."""
    return WIDGET_TRANSLATIONS.get(language, WIDGET_TRANSLATIONS["en"])


def get_supported_languages() -> List[Dict[str, str]]:
    """Get list of supported languages."""
    return [{"code": k, "name": v} for k, v in SUPPORTED_LANGUAGES.items()]
