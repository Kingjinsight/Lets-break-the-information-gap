FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; else npm i; fi
COPY . .
# 生产环境 API 走同域反代
RUN echo "VITE_API_BASE_URL=/api/v1" > .env.production
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]