const dotenv = require('dotenv');
const { PORT, APP_VERSION } = require('./config');
const { createApp } = require('./app');
const logger = require('./logger');
const { addHistoryRecord } = require('./utils/historyHelper');

// 加载环境变量
dotenv.config();

const { app, store } = createApp();

store.ensureBootstrapFiles()
  .then(async () => {
    logger.info(`DATA_DIR=${store.dataDir}`);
    logger.info(`BACKUP_DIR=${store.backupDir}`);
    app.listen(PORT, () => {
      logger.info(`服务器运行在端口 ${PORT}`);
      try {
        addHistoryRecord(store, null, 'system', '启动', `服务启动成功 v${APP_VERSION} · port ${PORT}`);
      } catch (_) {}
    });
  })
  .catch((error) => {
    logger.error(error, '初始化失败，服务器拒绝启动');
    process.exit(1);
  });

