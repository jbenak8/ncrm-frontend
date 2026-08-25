#!/usr/bin/env bash
# Standalone build: produkční bundle pro publikování v rootu statického hostingu
# (bez nginx proxy). Adresa backendu se zapéká do bundle přes VITE_API_URL.
#
# Použití (z kořene repozitáře):
#   deploy/standalone/build.sh https://ncrm-backend.example.com
#
# Volitelně lze předat i další VITE_* proměnné přes prostředí, např.:
#   VITE_AUTH_MODE=keycloak deploy/standalone/build.sh https://ncrm-backend.example.com
#
# Výstup: adresář dist/ — jeho obsah nahrajte do rootu hostingu.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Použití: $0 <BACKEND_URL>" >&2
  echo "Příklad: $0 https://ncrm-backend.example.com" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."

export VITE_API_URL="$1"

npm ci
npm run build

echo
echo "Hotovo. Obsah adresáře dist/ nahrajte do rootu hostingu."
echo "Backend: $VITE_API_URL (nezapomeňte na CORS pro doménu frontendu)."
