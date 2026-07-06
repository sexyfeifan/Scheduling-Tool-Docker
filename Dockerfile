# ── 阶段 1: 安装依赖 ──
FROM node:22-alpine AS deps

WORKDIR /app

COPY server/package*.json ./

RUN apk add --no-cache python3 make g++ && \
    npm ci --omit=dev && \
    apk del python3 make g++

# ── 阶段 2: 前端静态资源 ──
FROM node:22-alpine AS frontend

WORKDIR /client

# 前端为纯静态文件，无需构建
COPY client/ ./

# ── 阶段 3: 最终镜像 ──
FROM node:22-alpine

ARG BUILD_DATE
ENV BUILD_DATE=${BUILD_DATE}

RUN apk add --no-cache bash wget && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

ENV DATA_DIR=/app/data
ENV BACKUP_DIR=/app/backups
ENV TMPDIR=/app/data/.tmp

# 从依赖阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制后端应用代码
COPY server/ ./

# 复制前端静态文件
COPY --from=frontend /client/ /client/

# 创建数据目录和备份目录
RUN mkdir -p data data/.tmp backups && \
    chown -R appuser:appgroup /app /client

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
