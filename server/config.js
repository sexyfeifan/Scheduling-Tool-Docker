const fs = require('fs');
const path = require('path');

const APP_VERSION = '2.58';
const APP_CREATE_DATE = '2026-06-03';
const SCHEMA_VERSION = 2;

function resolveStorageDir(envName, dirName) {
  if (process.env[envName]) {
    return path.resolve(process.env[envName]);
  }

  const siblingDir = path.resolve(__dirname, '..', dirName);
  if (path.basename(__dirname) !== 'server') {
    return path.resolve(__dirname, dirName);
  }

  if (fs.existsSync(siblingDir)) {
    return siblingDir;
  }

  return path.resolve(__dirname, dirName);
}

const DATA_DIR = resolveStorageDir('DATA_DIR', 'data');
const BACKUP_DIR = resolveStorageDir('BACKUP_DIR', 'backups');
const CLIENT_DIR = path.resolve(__dirname, '..', 'client');
const PORT = Number(process.env.PORT || 3000);
const BACKUP_PASSWORD = process.env.BACKUP_PASSWORD || 'admin123';

module.exports = {
  APP_VERSION,
  APP_CREATE_DATE,
  BACKUP_DIR,
  BACKUP_PASSWORD,
  CLIENT_DIR,
  DATA_DIR,
  PORT,
  SCHEMA_VERSION
};
