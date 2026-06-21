const dotenv = require('dotenv');
const { PORT } = require('./config');
const { createApp } = require('./app');
const logger = require('./logger');

// 加载环境变量
dotenv.config();

const { app, store } = createApp();

store.ensureBootstrapFiles()
  .then(async () => {
    logger.info(`DATA_DIR=${store.dataDir}`);
    logger.info(`BACKUP_DIR=${store.backupDir}`);
    app.listen(PORT, () => {
      logger.info(`服务器运行在端口 ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error(error, '初始化失败，服务器拒绝启动');
    process.exit(1);
  });

