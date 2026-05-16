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
# Encaminha /api ao gateway. Ajustar ao correr o container (Compose: environment).
# Docker Desktop: host.docker.internal. Linux: --add-host=host.docker.internal:host-gateway
ENV SIMCAG_GATEWAY_UPSTREAM=http://host.docker.internal:5000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
