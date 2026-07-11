function addHistoryRecord(store, req, category, action, description, changes = '', date = null) {
  const record = {
    action: action,
    date: date,
    detail: changes || description || null,
    category: category || 'system',
    ip: req ? (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '') : 'system',
    user_agent: req ? (req.headers['user-agent'] || '').substring(0, 100) : ''
  };
  store.appendHistory(record);
  return record;
}

module.exports = { addHistoryRecord };
