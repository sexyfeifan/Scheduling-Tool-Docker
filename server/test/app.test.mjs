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

  it('migrates legacy schedules and settings into structured schema', async () => {
    const ctx = await createTempApp();
    cleanupTargets.push(ctx.rootDir);

    await fs.writeFile(path.join(ctx.dataDir, 'schedules.json'), JSON.stringify([
      {
        date: '2026-04-21',
        projects: [{ name: '旧项目', type: '视频' }]
      }
    ], null, 2));
    await fs.writeFile(path.join(ctx.dataDir, 'settings.json'), JSON.stringify({
      commonLocations: ['棚A'],
      projectTemplates: [
        {
          name: '直播模板',
          defaults: { type: '直播', location: '直播间' }
        }
      ]
    }, null, 2));

    const schedulesResponse = await request(ctx.app).get('/api/schedules');
    const settingsResponse = await request(ctx.app).get('/api/settings');

    expect(schedulesResponse.status).toBe(200);
    expect(schedulesResponse.body['2026-04-21'][0].name).toBe('旧项目');
    expect(settingsResponse.body.commonLocations).toEqual(['棚A']);
    expect(settingsResponse.body.projectTemplates).toHaveLength(1);

    const storedSchedules = JSON.parse(await fs.readFile(path.join(ctx.dataDir, 'schedules.json'), 'utf8'));
    const storedSettings = JSON.parse(await fs.readFile(path.join(ctx.dataDir, 'settings.json'), 'utf8'));
    expect(storedSchedules.schemaVersion).toBe(2);
    expect(storedSettings.schemaVersion).toBe(2);
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

    await request(ctx.app)
      .post('/api/schedules')
      .send({
        date: '2026-04-23',
        projects: [{ name: '副本恢复', type: '平面' }]
      })
      .expect(200);

    await fs.writeFile(path.join(ctx.dataDir, 'schedules.json'), '{broken', 'utf8');

    const response = await request(ctx.app).get('/api/schedules');
    expect(response.status).toBe(200);
    expect(response.body['2026-04-23'][0].name).toBe('副本恢复');

    const repaired = await fs.readFile(path.join(ctx.dataDir, 'schedules.json'), 'utf8');
    expect(repaired).toContain('schemaVersion');
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

    await request(ctx.app)
      .get('/share/share-demo')
      .expect(200);
  });
});
