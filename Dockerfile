# Прод-сборка: `npm run dev` (Vite dev-server) для реального сервера не
# годится — это статическая сборка (`vite build`) за nginx, который
# проксирует /api на бэкенд. См. docker-compose.yml в этом репозитории.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
