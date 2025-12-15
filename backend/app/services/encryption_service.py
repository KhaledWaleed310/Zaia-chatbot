"""
Enhanced encryption service for conversation data.
"""
from cryptography.fernet import Fernet
from ..core.config import settings
from ..core.encryption import get_fernet, encrypt_token, decrypt_token
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)


class ConversationEncryption:
    def __init__(self):
        self._fernet = None

    @property
    def fernet(self) -> Fernet:
        if self._fernet is None:
            self._fernet = get_fernet()
        return self._fernet

    def encrypt_message_content(self, content: str) -> str:
        """Encrypt a message content string."""
        if not content:
            return content
        return encrypt_token(content)

    def decrypt_message_content(self, encrypted_content: str) -> str:
        """Decrypt a message content string."""
        if not encrypted_content:
            return encrypted_content
        try:
            return decrypt_token(encrypted_content)
        except Exception as e:
            logger.warning(f"Failed to decrypt content, returning as-is: {e}")
            return encrypted_content  # Return original if decryption fails (migration period)

    def encrypt_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt sensitive fields in a message dict."""
        encrypted = message.copy()
        if "content" in encrypted and encrypted["content"]:
            encrypted["content"] = self.encrypt_message_content(str(encrypted["content"]))
            encrypted["_encrypted"] = True
        return encrypted

    def decrypt_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt sensitive fields in a message dict."""
        if not message.get("_encrypted", False):
            return message  # Not encrypted, return as-is
        decrypted = message.copy()
        if "content" in decrypted:
            decrypted["content"] = self.decrypt_message_content(decrypted["content"])
        return decrypted

    def encrypt_conversation(self, messages: List[Dict]) -> List[Dict]:
        """Encrypt all messages in a conversation."""
        return [self.encrypt_message(msg) for msg in messages]

    def decrypt_conversation(self, messages: List[Dict]) -> List[Dict]:
        """Decrypt all messages in a conversation."""
        return [self.decrypt_message(msg) for msg in messages]


# Singleton instance
encryption_service = ConversationEncryption()
