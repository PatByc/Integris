import os
import sys
from datetime import date
from decimal import Decimal

import pytest

# Set fake env vars before backend imports (Settings reads at import time)
_FAKE_ENV = {
    "DATABASE_URL": "postgresql://fake:fake@localhost:5432/fake",
    "SUPABASE_URL": "https://fake.supabase.co",
    "SUPABASE_ANON_KEY": "fake-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "fake-service-role-key",
    "JWT_SECRET": "test-jwt-secret-32-characters-min",
    "REDIS_URL": "redis://localhost:6379/0",
}
for k, v in _FAKE_ENV.items():
    os.environ.setdefault(k, v)

ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, os.path.join(ROOT, "workers"))
sys.path.insert(0, os.path.join(ROOT, "backend"))

# Known-valid NIPs (checksum manually verified):
# 5261040828: 5*6+2*5+6*7+1*2+0*3+4*4+0*5+8*6+2*7 = 162, 162%11 = 8 ✓
# 7342867148: 7*6+3*5+4*7+2*2+8*3+6*4+7*5+1*6+4*7 = 206, 206%11 = 8 ✓
VALID_SELLER_NIP = "5261040828"
VALID_BUYER_NIP = "7342867148"


@pytest.fixture
def valid_draft():
    return {
        "seller_name": "Sprzedawca sp. z o.o.",
        "seller_nip": VALID_SELLER_NIP,
        "seller_address": "ul. Testowa 1, 00-001 Warszawa",
        "buyer_name": "Nabywca sp. z o.o.",
        "buyer_nip": VALID_BUYER_NIP,
        "buyer_address": "ul. Kupiecka 2, 00-002 Warszawa",
        "invoice_number": "FV/2025/001",
        "issue_date": date(2025, 10, 1),
        "sale_date": date(2025, 10, 1),
        "payment_due_date": date(2025, 10, 15),
        "payment_method": "przelew",
        "currency": "PLN",
        "net_total": Decimal("100.00"),
        "vat_total": Decimal("23.00"),
        "gross_total": Decimal("123.00"),
        "vat_summary": [{"vat_rate": 23, "net_amount": "100.00", "vat_amount": "23.00"}],
    }


@pytest.fixture
def valid_line_item():
    return {
        "description": "Usługa programistyczna",
        "quantity": Decimal("1"),
        "unit": "szt",
        "unit_price_net": Decimal("100.00"),
        "vat_rate": 23,
        "net_amount": Decimal("100.00"),
        "vat_amount": Decimal("23.00"),
        "gross_amount": Decimal("123.00"),
        "sort_order": 0,
    }
