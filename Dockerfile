FROM node:18-alpine

# 安装bash
RUN apk add --no-cache bash

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json（如果存在）
COPY server/package*.json ./

# 安装依赖
RUN npm ci --omit=dev

# 复制应用代码
COPY server/ ./

# 复制前端静态文件
COPY client/ /client/

# 创建数据目录和备份目录
RUN mkdir -p data backups

# 确保 version.json 存在
RUN test -f data/version.json || echo '{"version":"2.17","createDate":"2026-03-15","buildDate":""}' > data/version.json

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
