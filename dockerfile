# Build de produção — assets estáticos servidos por nginx
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
ARG VITE_SIMCAG_GATEWAY_URL=""
ENV VITE_SIMCAG_GATEWAY_URL=${VITE_SIMCAG_GATEWAY_URL}
RUN npm run build

FROM nginx:1.27-alpine
# Encaminha /api ao gateway (ver nginx/default.conf.in + docker-entrypoint.d/25-simcag-gateway.sh).
# Docker Desktop: host.docker.internal. Linux: --add-host=host.docker.internal:host-gateway
ENV SIMCAG_GATEWAY_UPSTREAM=http://host.docker.internal:5000
COPY nginx/default.conf.in /etc/nginx/default.conf.in
COPY docker-entrypoint.d/25-simcag-gateway.sh /docker-entrypoint.d/25-simcag-gateway.sh
RUN chmod +x /docker-entrypoint.d/25-simcag-gateway.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
