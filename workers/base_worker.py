import json
import logging
import os
import time

import redis

logger = logging.getLogger(__name__)


class BaseWorker:
    """
    Pull-based Redis worker. Subclasses implement handle() for job processing.
    Job format: {"document_id": "<uuid>", ...}
    Retry policy: up to max_retries with exponential backoff before re-queuing to DLQ.

    How queuing works across multiple users:
    Workers are shared across ALL users and companies — you do not run one set of
    workers per user. When any user uploads a document, a job is pushed to the
    relevant Redis queue (e.g. "ocr_queue"). The worker process sits in a blocking
    loop calling blpop(), which pops the next job regardless of which user or company
    it belongs to. Multi-tenant isolation is handled at the data level: every job
    carries a document_id, and the worker fetches the document from the DB (which
    includes company_id) before doing any work.

    Scaling: you run one set of 7 worker processes for the entire app. If a queue
    is backing up under load (e.g. 50 invoices waiting for OCR), start a second
    ocr_worker process — both will compete for jobs from the same queue. That is a
    capacity decision based on throughput, not on user count.
    """

    MAX_RETRIES = 3
    BACKOFF_SECONDS = [5, 30, 120]

    def __init__(self, queue_name: str) -> None:
        self.queue_name = queue_name
        self.dlq_name = f"{queue_name}:dlq"
        self.redis: redis.Redis = redis.from_url(
            os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
            decode_responses=True,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def enqueue(self, job: dict) -> None:
        self.redis.rpush(self.queue_name, json.dumps(job))

    def run(self) -> None:
        logger.info("Worker started: queue=%s", self.queue_name)
        while True:
            try:
                self._process_next()
            except Exception:
                logger.exception("Unhandled error in worker loop")
                time.sleep(1)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _process_next(self) -> None:
        result = self.redis.blpop(self.queue_name, timeout=5)
        if result is None:
            return
        _, raw = result
        job: dict = json.loads(raw)
        attempt = job.get("_attempt", 1)
        try:
            self.handle(job)
        except Exception as exc:
            logger.error(
                "Job failed (attempt %d/%d): %s — %s",
                attempt,
                self.MAX_RETRIES,
                job,
                exc,
                exc_info=True,
            )
            if attempt < self.MAX_RETRIES:
                delay = self.BACKOFF_SECONDS[min(attempt - 1, len(self.BACKOFF_SECONDS) - 1)]
                time.sleep(delay)
                job["_attempt"] = attempt + 1
                self.redis.rpush(self.queue_name, json.dumps(job))
            else:
                logger.error("Job exhausted retries, sending to DLQ: %s", job)
                self.redis.rpush(self.dlq_name, json.dumps(job))

    def handle(self, job: dict) -> None:
        raise NotImplementedError(f"{self.__class__.__name__} must implement handle()")
