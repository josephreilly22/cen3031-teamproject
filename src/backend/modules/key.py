# Imports
from cryptography.fernet import Fernet
import base64
import hashlib

# Variables
REFERENCE = "EventPlanner8"

# Functions
def generate_key(reference: str = REFERENCE): return base64.urlsafe_b64encode(hashlib.sha256(reference.encode()).digest())
def encrypt(text: str, reference: str = REFERENCE): return Fernet(generate_key(reference)).encrypt(text.encode()).decode()
def decrypt(cipher_text: str, reference: str = REFERENCE): return Fernet(generate_key(reference)).decrypt(cipher_text.encode()).decode()

# Initialize
__all__ = ["encrypt", "decrypt"]