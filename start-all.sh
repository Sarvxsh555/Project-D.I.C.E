#!/usr/bin/env bash
# Starts every DICE microservice + all 3 frontends locally in the background.
# Logs go to ./logs/<service>.log. Safe to re-run (kills anything already on the port first).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

MVN="${MVN:-mvn}"
command -v "$MVN" >/dev/null 2>&1 || MVN="$HOME/.m2/wrapper/dists/apache-maven-3.9.9/3477a4f1/bin/mvn"

LOG_DIR="$(pwd)/logs"
mkdir -p "$LOG_DIR"

kill_port() {
  local port="$1"
  local pid
  pid=$(ss -ltnp 2>/dev/null | grep ":$port " | grep -oP 'pid=\K[0-9]+' | head -1)
  if [ -n "${pid:-}" ]; then
    kill "$pid" 2>/dev/null
    sleep 1
  fi
}

wait_port() {
  local port="$1"
  local tries=60
  until ss -ltn 2>/dev/null | grep -q ":$port "; do
    tries=$((tries - 1))
    if [ "$tries" -le 0 ]; then
      echo "  !! timed out waiting for port $port"
      return 1
    fi
    sleep 2
  done
}

run_java() {
  local name="$1" dir="$2" port="$3"
  echo "-> $name (:$port)"
  kill_port "$port"
  ( cd "$dir" && "$MVN" -q -o spring-boot:run > "$LOG_DIR/$name.log" 2>&1 & disown )
}

run_node() {
  local name="$1" dir="$2" port="$3" entry="$4"
  echo "-> $name (:$port)"
  kill_port "$port"
  ( cd "$dir" && nohup node "$entry" > "$LOG_DIR/$name.log" 2>&1 & disown )
}

run_tsx() {
  local name="$1" dir="$2" port="$3" entry="$4"
  echo "-> $name (:$port)"
  kill_port "$port"
  ( cd "$dir" && nohup npx tsx "$entry" > "$LOG_DIR/$name.log" 2>&1 & disown )
}

run_vite() {
  local name="$1" dir="$2" port="$3"
  echo "-> $name (:$port)"
  kill_port "$port"
  ( cd "$dir" && nohup npm run dev > "$LOG_DIR/$name.log" 2>&1 & disown )
}

echo "== Postgres + Redis (docker compose) =="
docker compose up -d postgres redis

echo "== Compiling Java services =="
for svc in backend quotation-service deal-engine governance-engine inventory-engine fulfillment-engine; do
  echo "-> compiling $svc"
  ( cd "$svc" && "$MVN" -q -o compile ) || { echo "!! $svc failed to compile"; exit 1; }
done

echo "== Starting Java services =="
run_java backend            backend             8080
run_java quotation-service  quotation-service   8082
run_java deal-engine        deal-engine         8083
run_java governance-engine  governance-engine   8084
run_java inventory-engine   inventory-engine    8087
run_java fulfillment-engine fulfillment-engine  8088

echo "== Starting Node services =="
run_node approval-engine       approval-engine       8085 src/index.js
run_node negotiation-engine    negotiation-engine    8086 src/index.js
run_node recommendation-engine recommendation-engine 8089 src/index.js
run_node deal-health-engine    deal-health-engine    8090 src/index.js
run_node billing-engine        billing-engine        8091 src/index.js
run_node oeeg                  oeeg                  8092 src/index.js
run_node monitor-service       monitor-service       8094 src/index.js

echo "== Starting TypeScript services =="
run_tsx data-service data-service 8093 src/server.ts
run_tsx gateway      gateway      8000 src/server.ts

echo "== Waiting for backend services to bind their ports =="
for port in 8080 8082 8083 8084 8085 8086 8087 8088 8089 8090 8091 8092 8093 8094 8000; do
  wait_port "$port" && echo "  ok :$port" || echo "  !! :$port did not come up — check logs/*.log"
done

echo "== Starting frontends =="
run_vite frontend           frontend           5173
run_vite monitor-dashboard  monitor-dashboard  5175
run_vite oeeg-dashboard     oeeg-dashboard     5174

echo "== Waiting for frontends =="
for port in 5173 5174 5175; do
  wait_port "$port" && echo "  ok :$port" || echo "  !! :$port did not come up — check logs/*.log"
done

cat <<'EOF'

============================================================
 DICE is up. Logs: ./logs/<service>.log

 Dashboards:
   Main app (customer / sales / admin portal): http://localhost:5173
   OEEG dashboard (Odoo event emulator):       http://localhost:5174
   Monitor dashboard (ops/health):             http://localhost:5175

 Gateway API:                                  http://localhost:8000
============================================================
EOF
