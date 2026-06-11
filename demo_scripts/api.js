const TOKEN = process.env.TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

if (!TOKEN) {
  console.error('[ERROR] TOKEN environment variable must be set in api.js.');
  process.exit(1);
}

/**
 * Gửi request REST API đến backend.
 */
async function apiRequest(path, method = 'GET', body = null) {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const url = `${BACKEND_URL}${path}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Request to ${path} failed with status ${response.status}: ${text}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Chia nhỏ mảng thành các chunk để gửi API lô lớn (batch) tránh quá tải body.
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  apiRequest,
  chunkArray
};
