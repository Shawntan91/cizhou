# 多阶段构建 Dockerfile
# 1. 前端构建阶段
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

# 2. 生产运行阶段
FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL="file:./dev.db"

# 后端依赖
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm install --omit=dev
RUN npx prisma generate

# 拷贝后端代码
COPY server ./

# 拷贝构建好的前端静态资源
COPY --from=client-builder /app/client/dist /app/client/dist

EXPOSE 4000

CMD ["node", "src/index.js"]
