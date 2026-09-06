// 通用 JSON 文件状态读写（用于持久化历史价格 / 持仓状态）

const fs = require('fs');

function loadJsonState(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) || fallback;
  } catch {
    return fallback;
  }
}

function saveJsonState(filePath, state) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    return true;
  } catch (error) {
    console.error(`保存状态失败 (${filePath}):`, error.message);
    return false;
  }
}

module.exports = { loadJsonState, saveJsonState };
