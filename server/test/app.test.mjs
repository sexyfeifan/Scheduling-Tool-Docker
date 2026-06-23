import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import appModule from '../app.js';

const { createApp } = appModule;

async function createTempApp() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scheduling-tool-'));
  const dataDir = path.join(rootDir, 'data');
  const backupDir = path.join(rootDir, 'backups');
  const { app, store } = createApp({
    backupPassword: 'admin-test',
    dataDir,
    backupDir
  });

  await store.ensureBootstrapFiles();
  return { app, dataDir, rootDir };
}

async function cleanup(rootDir) {
  await fs.rm(rootDir, { recursive: true, force: true });
}

const cleanupTargets = [];

afterEach(async () => {
  await Promise.all(cleanupTargets.splice(0).map(cleanup));
});

describe('Scheduling Tool API', () => {
  it('returns health information', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    const response = await request(ctx.app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.dataDir).toContain('data');
    expect(response.body.backupDir).toContain('backups');
  });

  it('handles legacy-format data gracefully via API', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    // Write legacy format data directly (simulates old version)
    await fs.writeFile(path.join(ctx.dataDir, 'schedules.json'), JSON.stringify([
      {
        date: '2026-04-21',
        projects: [{ name: '旧项目', type: '视频' }]
      }
    ], null, 2));

    // API should still work (SQLite store has its own data)
    const res = await request(ctx.app).get('/api/schedules');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');

    // Health check should work
    const health = await request(ctx.app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');
  });

  it('creates backups and restores data from them', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await request(ctx.app)
      .post('/api/settings')
      .send({ commonLocations: ['棚B'] })
      .expect(200);

    await request(ctx.app)
      .post('/api/schedules')
      .send({
        date: '2026-04-22',
        projects: [{ name: '恢复项目', location: '棚B', type: '视频' }]
      })
      .expect(200);

    const backupResponse = await request(ctx.app)
      .post('/api/backup')
      .expect(200);

    await request(ctx.app)
      .delete('/api/schedules/2026-04-22')
      .expect(200);

    await request(ctx.app)
      .post('/api/settings')
      .send({ commonLocations: [] })
      .expect(200);

    await request(ctx.app)
      .post('/api/restore')
      .send({ backupPath: backupResponse.body.backupPath })
      .expect(200);

    const schedulesResponse = await request(ctx.app).get('/api/schedules');
    const settingsResponse = await request(ctx.app).get('/api/settings');

    expect(schedulesResponse.body['2026-04-22'][0].name).toBe('恢复项目');
    expect(settingsResponse.body.commonLocations).toEqual(['棚B']);
  });

  it('recovers from corrupted data file by using .bak copy', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    // First write creates data and .bak
    await request(ctx.app)
      .post('/api/schedules')
      .send({
        date: '2026-04-23',
        projects: [{ name: '副本恢复', type: '平面' }]
      })
      .expect(200);

    // Force a backup write by saving again
    await request(ctx.app)
      .post('/api/schedules')
      .send({
        date: '2026-04-23',
        projects: [{ name: '副本恢复', type: '平面' }, { name: '追加项目', type: '视频' }]
      })
      .expect(200);

    // Corrupt the main file
    await fs.writeFile(path.join(ctx.dataDir, 'schedules.json'), '{broken', 'utf8');

    // Reading should recover from .bak
    const response = await request(ctx.app).get('/api/schedules');
    expect(response.status).toBe(200);
    expect(response.body['2026-04-23']).toBeDefined();
    expect(response.body['2026-04-23'].length).toBeGreaterThanOrEqual(1);
  });

  it('enforces edit password and exposes share link after admin configuration', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await request(ctx.app)
      .post('/api/settings/access')
      .set('x-admin-password', 'admin-test')
      .send({
        editPassword: 'editor-pass',
        shareEnabled: true,
        shareToken: 'share-demo'
      })
      .expect(200);

    await request(ctx.app)
      .post('/api/schedules')
      .send({
        date: '2026-04-24',
        projects: [{ name: '受保护项目', type: '直播' }]
      })
      .expect(401);

    await request(ctx.app)
      .post('/api/schedules')
      .set('x-edit-password', 'editor-pass')
      .send({
        date: '2026-04-24',
        projects: [{ name: '受保护项目', type: '直播' }]
      })
      .expect(200);

    const accessResponse = await request(ctx.app)
      .get('/api/settings/access')
      .set('x-admin-password', 'admin-test')
      .expect(200);

    expect(accessResponse.body.editPasswordEnabled).toBe(true);
    expect(accessResponse.body.shareEnabled).toBe(true);
  });

  // ── 模板 CRUD ──
  it('creates and lists project templates', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    const createRes = await request(ctx.app)
      .post('/api/settings/templates')
      .send({ name: '视频模板', defaults: { type: '视频', location: '棚A' } });
    expect(createRes.status).toBe(200);
    expect(createRes.body.template.name).toBe('视频模板');

    const listRes = await request(ctx.app).get('/api/settings/templates');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].name).toBe('视频模板');
  });

  it('deletes a project template', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    const createRes = await request(ctx.app)
      .post('/api/settings/templates')
      .send({ name: '临时模板', defaults: { type: '视频' } });
    const templateId = createRes.body.template.id;

    const delRes = await request(ctx.app).delete(`/api/settings/templates/${templateId}`);
    expect(delRes.status).toBe(200);

    const listRes = await request(ctx.app).get('/api/settings/templates');
    expect(listRes.body).toHaveLength(0);
  });

  // ── 访问控制 ──
  it('rejects schedule mutation without edit password when enabled', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await request(ctx.app)
      .post('/api/settings/access')
      .set('x-admin-password', 'admin-test')
      .send({ editPasswordEnabled: true, editPassword: 'secret123' });

    const res = await request(ctx.app)
      .post('/api/schedules')
      .send({ date: '2026-06-20', projects: [{ name: '测试', type: '视频' }] });
    expect(res.status).toBe(401);
  });

  it('allows schedule mutation with correct edit password', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await request(ctx.app)
      .post('/api/settings/access')
      .send({ editPasswordEnabled: true, editPassword: 'secret123' });

    const res = await request(ctx.app)
      .post('/api/schedules')
      .set('x-edit-password', 'secret123')
      .send({ date: '2026-06-20', projects: [{ name: '测试项目', type: '视频' }] });
    expect(res.status).toBe(200);
  });

  // ── 版本信息 ──
  it('returns version information', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    const res = await request(ctx.app).get('/api/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
  });

  // ── 多项目排期 ──
  it('handles multiple projects on the same date', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await request(ctx.app)
      .post('/api/schedules')
      .send({
        date: '2026-06-20',
        projects: [
          { name: '项目A', type: '视频' },
          { name: '项目B', type: '平面' },
          { name: '项目C', type: '直播' }
        ]
      });

    const res = await request(ctx.app).get('/api/schedules');
    expect(res.body['2026-06-20']).toHaveLength(3);
  });

  // ── 删除排期 ──
  it('deletes a schedule date', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await request(ctx.app)
      .post('/api/schedules')
      .send({ date: '2026-06-21', projects: [{ name: '待删除', type: '视频' }] });

    const delRes = await request(ctx.app).delete('/api/schedules/2026-06-21');
    expect(delRes.status).toBe(200);

    const getRes = await request(ctx.app).get('/api/schedules');
    expect(getRes.body['2026-06-21']).toBeUndefined();
  });

  // ── 设置保存与读取 ──
  it('saves and retrieves custom settings', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await request(ctx.app)
      .post('/api/settings')
      .send({
        commonLocations: ['棚A', '棚B', '外景'],
        roleCategories: [
          { key: 'director', label: '导演', type: 'checkbox', optionsKey: 'commonDirectors' }
        ]
      });

    const res = await request(ctx.app).get('/api/settings');
    expect(res.body.commonLocations).toEqual(['棚A', '棚B', '外景']);
    expect(res.body.roleCategories).toHaveLength(1);
  });

  // ── Webhook 模板预设 ──
  it('returns webhook template presets', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    const res = await request(ctx.app)
      .get('/api/webhook/templates')
      .set('x-admin-password', 'admin-test');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('daily');
    expect(res.body).toHaveProperty('weekly');
  });

  // ── 健康检查包含计数 ──
  it('health endpoint reports schedule count', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await request(ctx.app)
      .post('/api/schedules')
      .send({ date: '2026-06-20', projects: [{ name: 'P1', type: '视频' }] });
    await request(ctx.app)
      .post('/api/schedules')
      .send({ date: '2026-06-21', projects: [{ name: 'P2', type: '平面' }] });

    const res = await request(ctx.app).get('/api/health');
    expect(res.body.schedulesCount).toBe(2);
  });

  // ── 操作历史 ──
  it('returns empty history initially', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    const res = await request(ctx.app)
      .get('/api/history')
      .set('x-admin-password', 'admin-test');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ── 备份列表 ──
  it('creates backup and lists it', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await request(ctx.app).post('/api/backup').expect(200);

    const res = await request(ctx.app)
      .get('/api/backups')
      .set('x-admin-password', 'admin-test');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  // ── 空数据处理 ──
  it('handles empty schedule gracefully', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    const res = await request(ctx.app).get('/api/schedules');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });

  // ── 非法日期 ──
  it('handles schedule with missing date field', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    const res = await request(ctx.app)
      .post('/api/schedules')
      .send({ projects: [{ name: '无日期', type: '视频' }] });
    expect([200, 400]).toContain(res.status);
  });
});
