const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { APP_CREATE_DATE, APP_VERSION, SCHEMA_VERSION } = require('../config');

const DEFAULT_SETTINGS = {
  commonLocations: [],
  commonDirectors: [],
  commonPhotographers: [],
  commonProductionFacilities: [],
  commonRdFacilities: [],
  commonOperationalFacilities: [],
  commonAudioFacilities: [],
  projectTemplates: [],
  access: {
    editPasswordHash: '',
    shareEnabled: false,
    shareToken: ''
  },
  webhook: {
    enabled: false,
    url: '',
    platform: 'custom',
    dailyTemplate: '',
    weeklyTemplate: ''
  }
};

function isValidDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeText(value, maxLength = 200) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function normalizeTextArray(values, maxItems = 200, maxLength = 100) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(
    values
      .map((item) => normalizeText(item, maxLength))
      .filter(Boolean)
  )].slice(0, maxItems);
}

function normalizeProject(project) {
  const validStatuses = ['待确认', '已确认', '已完成', '取消'];
  const rawStatus = project && project.status;
  return {
    name: normalizeText(project && project.name, 120),
    location: normalizeText(project && project.location, 120),
    director: normalizeText(project && project.director, 120),
    photographer: normalizeText(project && project.photographer, 120),
    production: normalizeText(project && project.production, 120),
    rd: normalizeText(project && project.rd, 120),
    operational: normalizeText(project && project.operational, 120),
    audio: normalizeText(project && project.audio, 120),
    type: normalizeText(project && project.type, 40),
    startTime: normalizeText(project && project.startTime, 10),
    laodao: Boolean(project && project.laodao),
    status: validStatuses.includes(rawStatus) ? rawStatus : '待确认'
  };
}

function normalizeProjects(projects) {
  if (!Array.isArray(projects)) {
    return null;
  }

  return projects
    .map(normalizeProject)
    .filter((project) => project.name)
    .slice(0, 500);
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function normalizeTemplate(template, index = 0) {
  const defaults = normalizeProject((template && template.defaults) || {});
  return {
    id: normalizeText(template && template.id, 80) || generateId(`tpl${index}`),
    name: normalizeText(template && template.name, 80),
    defaults
  };
}

function normalizeTemplateList(templates) {
  if (!Array.isArray(templates)) {
    return [];
  }

  return templates
    .map((template, index) => normalizeTemplate(template, index))
    .filter((template) => template.name);
}

function hashPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

function verifyPassword(candidate, hash) {
  if (!hash) return false;
  // Support legacy SHA-256 hashes during transition
  if (/^[a-f0-9]{64}$/.test(hash)) {
    return crypto.createHash('sha256').update(String(candidate)).digest('hex') === hash;
  }
  return bcrypt.compareSync(String(candidate), hash);
}

function normalizeAccessConfig(rawAccess) {
  const access = rawAccess || {};
  const shareToken = normalizeText(access.shareToken, 80).replace(/[^a-zA-Z0-9_-]/g, '');
  return {
    editPasswordHash: normalizeText(access.editPasswordHash, 128),
    shareEnabled: Boolean(access.shareEnabled && shareToken),
    shareToken
  };
}

function normalizeWebhookConfig(rawWebhook) {
  const wh = rawWebhook && typeof rawWebhook === 'object' ? rawWebhook : {};
  const validPlatforms = ['dingtalk', 'feishu', 'wecom', 'custom'];
  const platform = validPlatforms.includes(wh.platform) ? wh.platform : 'custom';
  return {
    enabled: Boolean(wh.enabled),
    url: normalizeText(wh.url, 500),
    platform,
    dailyTemplate: normalizeText(wh.dailyTemplate, 5000),
    weeklyTemplate: normalizeText(wh.weeklyTemplate, 5000)
  };
}

function normalizeSettingsPayload(rawSettings) {
  const base = rawSettings && typeof rawSettings === 'object'
    ? (Array.isArray(rawSettings) ? (rawSettings[0] || {}) : rawSettings)
    : {};

  return {
    commonLocations: normalizeTextArray(base.commonLocations),
    commonDirectors: normalizeTextArray(base.commonDirectors),
    commonPhotographers: normalizeTextArray(base.commonPhotographers),
    commonProductionFacilities: normalizeTextArray(base.commonProductionFacilities),
    commonRdFacilities: normalizeTextArray(base.commonRdFacilities),
    commonOperationalFacilities: normalizeTextArray(base.commonOperationalFacilities),
    commonAudioFacilities: normalizeTextArray(base.commonAudioFacilities),
    projectTemplates: normalizeTemplateList(base.projectTemplates),
    access: normalizeAccessConfig(base.access),
    webhook: normalizeWebhookConfig(base.webhook)
  };
}

function normalizeScheduleList(rawSchedules) {
  if (Array.isArray(rawSchedules)) {
    return rawSchedules
      .map((schedule, index) => {
        if (!schedule || !isValidDateString(schedule.date)) {
          return null;
        }

        const projects = normalizeProjects(schedule.projects);
        if (projects === null) {
          return null;
        }

        return {
          id: normalizeText(schedule.id, 80) || `${schedule.date}-${index}`,
          date: schedule.date,
          projects
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  if (rawSchedules && typeof rawSchedules === 'object') {
    return Object.keys(rawSchedules)
      .filter(isValidDateString)
      .sort()
      .map((date) => ({
        id: date,
        date,
        projects: normalizeProjects(rawSchedules[date]) || []
      }));
  }

  return [];
}

function normalizeVersionData(rawVersion) {
  const base = rawVersion && typeof rawVersion === 'object' ? rawVersion : {};
  return {
    version: normalizeText(base.version, 40) || APP_VERSION,
    createDate: normalizeText(base.createDate, 20) || APP_CREATE_DATE,
    buildDate: normalizeText(base.buildDate, 20)
  };
}

function sanitizeSettingsForClient(settings) {
  return {
    commonLocations: settings.commonLocations || [],
    commonDirectors: settings.commonDirectors || [],
    commonPhotographers: settings.commonPhotographers || [],
    commonProductionFacilities: settings.commonProductionFacilities || [],
    commonRdFacilities: settings.commonRdFacilities || [],
    commonOperationalFacilities: settings.commonOperationalFacilities || [],
    commonAudioFacilities: settings.commonAudioFacilities || [],
    projectTemplates: settings.projectTemplates || [],
    access: {
      shareEnabled: Boolean(settings.access && settings.access.shareEnabled)
    },
    webhook: settings.webhook || { enabled: false, url: '', platform: 'custom', dailyTemplate: '', weeklyTemplate: '' }
  };
}

function sanitizeAccessForClient(settings, baseUrl = '') {
  const access = normalizeAccessConfig(settings.access);
  return {
    editPasswordEnabled: Boolean(access.editPasswordHash),
    shareEnabled: access.shareEnabled,
    shareToken: access.shareToken,
    shareUrl: access.shareEnabled && access.shareToken
      ? `${baseUrl}/?share=${access.shareToken}`
      : ''
  };
}

function normalizeBackupPayload(rawBackup) {
  if (!rawBackup || typeof rawBackup !== 'object') {
    throw new Error('备份文件格式无效');
  }

  return {
    settings: normalizeSettingsPayload(rawBackup.settings),
    schedules: normalizeScheduleList(rawBackup.schedules),
    version: normalizeVersionData(rawBackup.version)
  };
}

function wrapStructuredData(data) {
  return {
    schemaVersion: SCHEMA_VERSION,
    data
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  generateId,
  hashPassword,
  verifyPassword,
  isValidDateString,
  normalizeAccessConfig,
  normalizeBackupPayload,
  normalizeProject,
  normalizeProjects,
  normalizeScheduleList,
  normalizeSettingsPayload,
  normalizeTemplate,
  normalizeTemplateList,
  normalizeText,
  normalizeTextArray,
  normalizeVersionData,
  sanitizeAccessForClient,
  sanitizeSettingsForClient,
  wrapStructuredData
};
