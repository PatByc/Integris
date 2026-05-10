import base64
import hashlib
import logging
import os
import time
from typing import Optional

import httpx
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

logger = logging.getLogger(__name__)

_BLOCK = 16


class KsefError(Exception):
    pass


class KsefAuthError(KsefError):
    pass


class KsefSubmissionError(KsefError):
    pass


class KsefClient:
    """
    KSeF API v2 client.

    Auth flow:
      1. POST /auth/challenge
      2. POST /auth/ksef-token  (RSA-OAEP-SHA256 encrypt "token|timestampMs")
      3. Poll GET /auth/{ref} until status 200
      4. POST /auth/token/redeem -> accessToken

    Session + invoice flow:
      5. POST /sessions/online  (generate AES-256 key, encrypt with RSA-OAEP)
      6. POST /sessions/online/{ref}/invoices  (AES-256-CBC encrypted payload)
      7. POST /sessions/online/{ref}/close

    KSeF environment config:
      KSEF_API_URL       e.g. https://api-test.ksef.mf.gov.pl/v2
      KSEF_CLIENT_ID     NIP (company tax ID)
      KSEF_CLIENT_SECRET KSeF authorisation token
      KSEF_PUBLIC_KEY_PEM RSA public key from MF (PEM format)
    """

    _AUTH_POLL_INTERVAL = 2
    _AUTH_POLL_MAX = 15

    def __init__(
        self,
        api_url: str,
        nip: str,
        token: str,
        public_key_pem: str,
    ) -> None:
        self._base = api_url.rstrip("/")
        self._nip = nip
        self._token = token
        self._public_key_pem = public_key_pem
        self._http = httpx.Client(timeout=30)
        self._access_token: Optional[str] = None
        self._aes_key: Optional[bytes] = None
        self._aes_iv: Optional[bytes] = None
        self._session_ref: Optional[str] = None

    # ------------------------------------------------------------------
    # Crypto helpers
    # ------------------------------------------------------------------

    def _rsa_encrypt(self, plaintext: bytes) -> str:
        public_key = serialization.load_pem_public_key(
            self._public_key_pem.encode(),
            backend=default_backend(),
        )
        encrypted = public_key.encrypt(
            plaintext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        return base64.b64encode(encrypted).decode()

    def _aes_encrypt(self, plaintext: bytes) -> bytes:
        """AES-256-CBC with PKCS7 padding."""
        pad_len = _BLOCK - (len(plaintext) % _BLOCK)
        padded = plaintext + bytes([pad_len] * pad_len)
        cipher = Cipher(
            algorithms.AES(self._aes_key),
            modes.CBC(self._aes_iv),
            backend=default_backend(),
        )
        enc = cipher.encryptor()
        return enc.update(padded) + enc.finalize()

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    def authenticate(self) -> None:
        """Full auth flow → sets self._access_token."""
        challenge_resp = self._http.post(f"{self._base}/auth/challenge")
        challenge_resp.raise_for_status()
        ch = challenge_resp.json()
        challenge = ch["challenge"]
        timestamp_ms = ch["timestampMs"]

        token_payload = f"{self._token}|{timestamp_ms}".encode()
        encrypted_token = self._rsa_encrypt(token_payload)

        init_resp = self._http.post(
            f"{self._base}/auth/ksef-token",
            json={
                "challenge": challenge,
                "contextIdentifier": {"type": "Nip", "value": self._nip},
                "encryptedToken": encrypted_token,
            },
        )
        init_resp.raise_for_status()
        init_data = init_resp.json()
        ref_number = init_data["referenceNumber"]
        op_token = init_data["authenticationToken"]["token"]

        for attempt in range(self._AUTH_POLL_MAX):
            time.sleep(self._AUTH_POLL_INTERVAL)
            poll = self._http.get(
                f"{self._base}/auth/{ref_number}",
                headers={"Authorization": f"Bearer {op_token}"},
            )
            poll.raise_for_status()
            code = poll.json()["status"]["code"]
            if code == 200:
                break
            if code >= 400:
                raise KsefAuthError(f"Auth failed (code={code}): {poll.text}")
        else:
            raise KsefAuthError("Auth timed out after polling")

        redeem = self._http.post(
            f"{self._base}/auth/token/redeem",
            headers={"Authorization": f"Bearer {op_token}"},
        )
        redeem.raise_for_status()
        self._access_token = redeem.json()["accessToken"]["token"]
        logger.debug("KSeF auth complete")

    # ------------------------------------------------------------------
    # Session
    # ------------------------------------------------------------------

    def open_session(self) -> str:
        """Open interactive session, return session referenceNumber."""
        self._aes_key = os.urandom(32)
        self._aes_iv = os.urandom(_BLOCK)

        encrypted_key = self._rsa_encrypt(self._aes_key)
        iv_b64 = base64.b64encode(self._aes_iv).decode()

        resp = self._http.post(
            f"{self._base}/sessions/online",
            headers={"Authorization": f"Bearer {self._access_token}"},
            json={
                "formCode": {
                    "systemCode": "FA (3)",
                    "schemaVersion": "1-0E",
                    "value": "FA",
                },
                "encryption": {
                    "encryptedSymmetricKey": encrypted_key,
                    "initializationVector": iv_b64,
                },
            },
        )
        resp.raise_for_status()
        self._session_ref = resp.json()["referenceNumber"]
        logger.debug("KSeF session opened: %s", self._session_ref)
        return self._session_ref

    def submit_invoice(self, xml_bytes: bytes) -> str:
        """Encrypt and submit invoice, return invoice referenceNumber."""
        if not self._session_ref:
            raise KsefSubmissionError("No open session")

        original_hash = base64.b64encode(hashlib.sha256(xml_bytes).digest()).decode()
        original_size = len(xml_bytes)

        encrypted = self._aes_encrypt(xml_bytes)
        encrypted_hash = base64.b64encode(hashlib.sha256(encrypted).digest()).decode()
        encrypted_size = len(encrypted)
        encrypted_content = base64.b64encode(encrypted).decode()

        resp = self._http.post(
            f"{self._base}/sessions/online/{self._session_ref}/invoices",
            headers={"Authorization": f"Bearer {self._access_token}"},
            json={
                "invoiceHash": original_hash,
                "invoiceSize": original_size,
                "encryptedInvoiceHash": encrypted_hash,
                "encryptedInvoiceSize": encrypted_size,
                "encryptedInvoiceContent": encrypted_content,
            },
        )
        resp.raise_for_status()
        ksef_ref = resp.json()["referenceNumber"]
        logger.debug("Invoice submitted, KSeF ref: %s", ksef_ref)
        return ksef_ref

    def close_session(self) -> None:
        """Close the interactive session."""
        if not self._session_ref:
            return
        try:
            resp = self._http.post(
                f"{self._base}/sessions/online/{self._session_ref}/close",
                headers={"Authorization": f"Bearer {self._access_token}"},
            )
            resp.raise_for_status()
        except Exception as exc:
            logger.warning("Failed to close KSeF session %s: %s", self._session_ref, exc)
        finally:
            self._session_ref = None

    def close(self) -> None:
        self._http.close()
