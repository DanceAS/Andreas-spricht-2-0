#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f .env ]]; then
  python3 - <<'PY'
from pathlib import Path
import secrets
p = Path('.env')
p.write_text('WP_ADMIN_USER=prototype_editor\n' + ''.join(f'{key}={secrets.token_hex(24)}\n' for key in ['WP_DB_PASSWORD', 'WP_DB_ROOT_PASSWORD', 'WP_ADMIN_PASSWORD']))
p.chmod(0o600)
PY
fi
# This managed workspace uses a restrictive umask. Grant container users read-only
# access to prototype source and disposable image copies, never to .env.
find theme content -type d -exec chmod 755 {} +
find theme content -type f -exec chmod 644 {} +
chmod 644 uploads.ini
mkdir -p .local-assets
chmod 755 .local-assets
cp ../bordeaux/assets/andreas-scharrer-original.jpg ../bordeaux/assets/andreas-scharrer-8.jpg .local-assets/
chmod 644 .local-assets/*.jpg
docker compose up -d --wait wordpress
# Wait for the image entrypoint to copy WordPress and create wp-config.php.
for attempt in {1..30}; do
  if docker compose exec -T wordpress test -f /var/www/html/wp-config.php; then break; fi
  if [[ "$attempt" == 30 ]]; then echo 'WordPress bootstrap timed out' >&2; exit 1; fi
  sleep 1
done
docker compose run --rm -T cli sh -c '
  if ! wp core is-installed; then
    wp core install --url=http://127.0.0.1:8890 --title="Andreas spricht · lokaler Prototyp" --admin_user="$WP_ADMIN_USER" --admin_password="$WP_ADMIN_PASSWORD" --admin_email=prototype@example.invalid --skip-email
  fi
  wp eval-file /prototype/seed.php
'
echo 'Lokaler Prototyp: http://127.0.0.1:8890'
echo 'Editor: http://127.0.0.1:8890/wp-admin/ — Zugangsdaten ausschließlich in wordpress/.env'
