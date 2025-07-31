# ---------- Build stage ----------
FROM node:18-alpine AS builder
WORKDIR /app

# Install deps (cache-friendly)
COPY package*.json ./
RUN npm install

# Build app
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:alpine

# Tools for entrypoint
RUN apk add --no-cache bash curl jq

# Nginx config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Static assets
COPY --from=builder /app/build /usr/share/nginx/html

# Provide a default env.js so first boot never 404s
RUN printf '%s\n' \
  'window.__ENV__ = window.__ENV__ || {};' \
  'window.__ENV__.REACT_APP_KAKAO_MAP_APP_KEY = "";' \
  > /usr/share/nginx/html/env.js

# Entry script
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Normalize line endings in case the file was edited on Windows
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]