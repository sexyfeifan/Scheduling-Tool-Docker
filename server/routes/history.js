const express = require('express');

function createHistoryRouter({ requireAdminPassword, store }) {
  const router = express.Router();

  router.get('/', requireAdminPassword, (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const { date, category } = req.query;
    const rows = store.readHistory({ limit, date, category });
    res.json(rows);
  });

  router.delete('/', requireAdminPassword, (req, res) => {
    store.clearHistory();
    res.json({ message: '操作记录已清空' });
  });

  return router;
}

module.exports = { createHistoryRouter };
