#!/bin/sh
# Write Google Cloud credentials from env var if provided (Railway/Docker deploy)
if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
    echo "$GOOGLE_CREDENTIALS_JSON" > /tmp/gcloud-key.json
    export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcloud-key.json
fi
exec supervisord -n -c /app/supervisord.conf
