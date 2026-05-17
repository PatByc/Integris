#!/bin/sh
# Write Google Cloud credentials from env var if provided (Railway/Docker deploy)
if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
    python3 -c "
import os, json
raw = os.environ['GOOGLE_CREDENTIALS_JSON']
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    data = json.loads(raw.replace('\n', '\\n'))
with open('/tmp/gcloud-key.json', 'w') as f:
    json.dump(data, f)
"
    export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcloud-key.json
fi
exec supervisord -n -c /app/supervisord.conf
