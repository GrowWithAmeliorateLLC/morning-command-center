const https = require('https');

function httpsRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = require('url').parse(url);
    const opts = Object.assign(parsed, { method, headers });
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { pageId, blockId, token, action } = event.queryStringParameters || {};
    if (!token) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing token' }) };

    const notionHeaders = {
      'Authorization': 'Bearer ' + token,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    };

    if (action === 'delete' && blockId) {
      const result = await httpsRequest('DELETE', `https://api.notion.com/v1/blocks/${blockId}`, notionHeaders);
      if (result.status === 200 || result.status === 204) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }
      const err = JSON.parse(result.body || '{}');
      return { statusCode: result.status, headers, body: JSON.stringify({ error: err.message || 'Delete failed' }) };
    }

    if (!pageId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing pageId' }) };
    const result = await httpsRequest('GET', `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, notionHeaders);
    const data = JSON.parse(result.body);
    if (result.status !== 200) {
      return { statusCode: result.status, headers, body: JSON.stringify({ error: data.message || 'Notion API error', code: data.code }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Server error' }) };
  }
};
