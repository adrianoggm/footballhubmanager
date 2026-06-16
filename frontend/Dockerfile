# Multi-stage: build the Vite bundle with Node, then serve the static files with
# nginx. Build context is frontend/.
#   docker build -f frontend/Dockerfile -t <img> frontend
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# Serves a static SPA only. API routing (/api -> backend) is handled by the
# Kubernetes Ingress, so the frontend image stays backend-agnostic.
