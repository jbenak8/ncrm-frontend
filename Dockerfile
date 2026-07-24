# ---------------------------------------------------------------------------
# Multi-stage build: Vite build -> nginx (unprivileged, OpenShift-friendly)
#
# Vite env vars (VITE_*) are baked into the bundle at BUILD time, therefore
# they are passed as build args, not runtime env vars:
#
#   docker build \
#     --build-arg VITE_AUTH_MODE=keycloak \
#     --build-arg VITE_KEYCLOAK_URL=https://keycloak.example.com \
#     --build-arg VITE_KEYCLOAK_REALM=ncrm \
#     --build-arg VITE_KEYCLOAK_CLIENT_ID=ncrm-frontend \
#     -t ncrm-frontend .
#
# At RUNTIME the backend URL for the /api and /actuator proxy is configured
# via the BACKEND_URL env var (default http://ncrm-backend:8080):
#
#   docker run -p 3000:8080 -e BACKEND_URL=http://host.docker.internal:8080 ncrm-frontend
# ---------------------------------------------------------------------------

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_AUTH_MODE=db
ARG VITE_KEYCLOAK_URL=""
ARG VITE_KEYCLOAK_REALM=""
ARG VITE_KEYCLOAK_CLIENT_ID=""
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

RUN npm run build

# Unprivileged nginx: runs as non-root and listens on 8080, so the image works
# out of the box on OpenShift (arbitrary UID) as well as plain Docker/Cloud Run.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Non-root user provided by the nginx-unprivileged base image.
USER 101

ENV BACKEND_URL=http://ncrm-backend:8080

# The template is rendered to /etc/nginx/conf.d/default.conf by the official
# entrypoint (envsubst on *.template files in /etc/nginx/templates).
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
