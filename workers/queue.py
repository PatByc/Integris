import json
import os

import redis as redis_lib

OCR_QUEUE = "ocr_jobs"
EXTRACTION_QUEUE = "extraction_jobs"
XML_QUEUE = "xml_jobs"
KSEF_QUEUE = "ksef_submission_jobs"


def enqueue_extraction_job(document_id) -> None:
    r = redis_lib.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
    r.rpush(EXTRACTION_QUEUE, json.dumps({"document_id": str(document_id)}))


def enqueue_xml_job(document_id) -> None:
    r = redis_lib.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
    r.rpush(XML_QUEUE, json.dumps({"document_id": str(document_id)}))


def enqueue_ksef_submission_job(document_id) -> None:
    r = redis_lib.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
    r.rpush(KSEF_QUEUE, json.dumps({"document_id": str(document_id)}))
