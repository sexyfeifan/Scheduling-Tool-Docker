const dotenv = require('dotenv');
const { PORT } = require('./config');
const { createApp } = require('./app');

// 加载环境变量
dotenv.config();

const { app, store } = createApp();

store.ensureBootstrapFiles()
  .then(async () => {
    console.log(`[boot] DATA_DIR=${store.dataDir}`);
    console.log(`[boot] BACKUP_DIR=${store.backupDir}`);
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[boot] 初始化失败，服务器拒绝启动:', error.message);
    process.exit(1);
  });

