FROM node:22-alpine AS build

ARG VITE_API_URL=/api
ARG VITE_ALLOWED_ASSET_ORIGINS=
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_ALLOWED_ASSET_ORIGINS=${VITE_ALLOWED_ASSET_ORIGINS}

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production

RUN touch /var/run/nginx.pid \
  && chown -R nginx:nginx /var/cache/nginx /var/run/nginx.pid /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

