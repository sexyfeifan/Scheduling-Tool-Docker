/**
 * 批量操作路由
 * POST /api/schedules/batch
 */

const express = require('express');
const logger = require('../logger');

function createBatchRouter({ requireEditAccess, sendUpdateToClients, store }) {
  const router = express.Router();

  router.post('/', requireEditAccess, (req, res) => {
    try {
      const { action, projectIds, params } = req.body;

      if (!action || !Array.isArray(projectIds) || projectIds.length === 0) {
        return res.status(400).json({ message: '缺少必要参数: action, projectIds' });
      }

      const allSchedules = store.readSchedules() || [];
      let affected = 0;

      switch (action) {
        case 'delete': {
          allSchedules.forEach(item => {
            const before = item.projects.length;
            item.projects = item.projects.filter(p => !projectIds.includes(p.id));
            affected += before - item.projects.length;
          });
          break;
        }
        case 'move': {
          const targetDate = params && params.targetDate;
          if (!targetDate) {
            return res.status(400).json({ message: '移动操作需要 targetDate 参数' });
          }
          const movedProjects = [];
          allSchedules.forEach(item => {
            const toMove = item.projects.filter(p => projectIds.includes(p.id));
            item.projects = item.projects.filter(p => !projectIds.includes(p.id));
            movedProjects.push(...toMove);
          });
          // 添加到目标日期
          let targetItem = allSchedules.find(s => s.date === targetDate);
          if (!targetItem) {
            targetItem = { id: `sch_${Date.now()}`, date: targetDate, projects: [] };
            allSchedules.push(targetItem);
          }
          targetItem.projects.push(...movedProjects);
          affected = movedProjects.length;
          break;
        }
        case 'updateStatus': {
          const status = params && params.status;
          if (!status) {
            return res.status(400).json({ message: '状态更新需要 status 参数' });
          }
          const validStatuses = ['待确认', '已确认', '已完成', '取消'];
          if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: '无效的状态值' });
          }
          allSchedules.forEach(item => {
            item.projects.forEach(p => {
              if (projectIds.includes(p.id)) {
                p.status = status;
                affected++;
              }
            });
          });
          break;
        }
        default:
          return res.status(400).json({ message: `不支持的操作: ${action}` });
      }

      // 保存变更
      allSchedules.forEach(item => {
        store.writeScheduleDate(item.date, item.id, item.projects);
      });

      sendUpdateToClients({ type: 'batch', action, affected });
      res.json({ success: true, affected, message: `已${action === 'delete' ? '删除' : action === 'move' ? '移动' : '更新'} ${affected} 个项目` });
    } catch (err) {
      logger.error(err, '批量操作失败');
      res.status(500).json({ message: '批量操作失败' });
    }
  });

  return router;
}

module.exports = { createBatchRouter };
