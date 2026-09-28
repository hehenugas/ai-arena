# syntax=docker/dockerfile:1

# ==============================================================================
# AI Arena — one image, one container, 19 processes
# ==============================================================================
#   docker compose up -d --build     → http://localhost:8080/
#
# Stage `build`   : npm ci + npm run build for every model listed in
#                   aggregator/models.json (the same file the dashboard reads,
#                   so the image always builds what the dashboard advertises).
# Stage runtime   : caddy:2-alpine + supervisor + busybox httpd. supervisord runs
#                   one static server per model on ports 5101-5118 (the ports
#                   PORT_RULES.md documents) plus Caddy as the only router on
#                   :8080. Only :8080 is published.
#
# The static server programs and their ports are generated from the same
# models.list that was built, so they cannot drift from models.json.
# ==============================================================================

ARG NODE_IMAGE=node:24-bookworm-slim
ARG CADDY_IMAGE=caddy:2-alpine


# ------------------------------------------------------------------------------
# Build every model
# ------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build

WORKDIR /src
COPY . .

RUN set -eux; \
    node -e 'const m=require("/src/aggregator/models.json");require("fs").writeFileSync("/src/models.list", m.map(x=>x.id+":"+x.port).join("\n")+"\n");console.log("models to build: "+m.length)'; \
    while IFS=: read -r id port <&3; do \
      echo "=== build $id (port $port)"; \
      test -f "/src/$id/package.json"; \
      ( cd "/src/$id" && npm ci --no-audit --no-fund && npm run build ); \
    done 3< /src/models.list; \
    mkdir -p /out/models; \
    while IFS=: read -r id port <&3; do \
      test -f "/src/$id/dist/index.html"; \
      mkdir -p "/out/models/$id"; \
      cp -a "/src/$id/dist/." "/out/models/$id/"; \
    done 3< /src/models.list; \
    du -sh /out/models


# ------------------------------------------------------------------------------
# Serve: Caddy + one static server per model, all under supervisord
# ------------------------------------------------------------------------------
FROM ${CADDY_IMAGE}

RUN apk add --no-cache supervisor busybox-extras

# Installed at /etc/supervisord.conf on purpose: that is the first path
# supervisorctl searches, so `supervisorctl status` inside the container works
# without arguments. Alpine ships its own /etc/supervisord.conf pointing at
# /run/supervisord.sock, and it would win otherwise.
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY aggregator /srv/aggregator
COPY --from=build /out/models /srv/models
COPY --from=build /src/models.list /srv/models.list

# One static file server per model. priority=10 keeps them ahead of Caddy
# (default priority 999) so the routes are listening before the router starts.
RUN set -eux; \
    mkdir -p /etc/supervisor.d; \
    : > /etc/supervisor.d/models.conf; \
    while IFS=: read -r id port <&3; do \
      { \
        echo; \
        echo "[program:static-$id]"; \
        echo "command=/usr/sbin/httpd -f -p 127.0.0.1:$port -h /srv/models/$id"; \
        echo "priority=10"; \
        echo "autostart=true"; \
        echo "autorestart=true"; \
        echo "startsecs=1"; \
        echo "stopasgroup=true"; \
        echo "killasgroup=true"; \
        echo "stdout_logfile=/dev/null"; \
        echo "redirect_stderr=true"; \
      } >> /etc/supervisor.d/models.conf; \
    done 3< /srv/models.list; \
    rm /srv/models.list; \
    echo "static servers generated: $(grep -c '^\[program:' /etc/supervisor.d/models.conf)"

EXPOSE 8080

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
