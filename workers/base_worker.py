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
