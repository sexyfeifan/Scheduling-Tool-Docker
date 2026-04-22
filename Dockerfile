FROM node:18-alpine

# 安装bash和better-sqlite3原生编译所需构建工具
RUN apk add --no-cache bash python3 make g++

# 以非root用户运行，提升安全性
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 设置工作目录
WORKDIR /app

ENV DATA_DIR=/app/data
ENV BACKUP_DIR=/app/backups

# 复制package.json和package-lock.json（如果存在）
COPY server/package*.json ./

# 安装依赖（包含native模块编译）
RUN npm ci --omit=dev

# 清理构建工具，减小镜像体积
RUN apk del python3 make g++

# 复制应用代码
COPY server/ ./

# 复制前端静态文件
COPY client/ /client/

# 创建数据目录和备份目录（空目录，实际数据由 volume 挂载提供）
# 注意：不在这里写入任何 JSON 文件，防止镜像层数据覆盖 volume 挂载的真实数据
RUN mkdir -p data backups && chown -R appuser:appgroup /app /client

USER appuser

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# 启动应用
CMD ["node", "server.js"]
