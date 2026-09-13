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
# .template в /etc/nginx/templates/ — официальный образ nginx сам прогоняет
# его через envsubst при старте и кладёт результат в conf.d/default.conf
# (см. комментарий в nginx.conf.template). BACKEND_ORIGIN по умолчанию —
# внутреннее DNS-имя сервиса из docker-compose; на Render и т.п. переопредели
# переменной окружения на публичный URL бэкенд-сервиса.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_ORIGIN=http://backend:8080
EXPOSE 80
