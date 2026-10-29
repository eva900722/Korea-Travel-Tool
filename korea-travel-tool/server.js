// 本機網站與照片翻譯 API；需 Node.js 18 以上及 GOOGLE_CLOUD_API_KEY。
const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const files = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/css/style.css': ['css/style.css', 'text/css'],
  '/js/app.js': ['js/app.js', 'text/javascript'],
  '/js/exchange.js': ['js/exchange.js', 'text/javascript'],
  '/js/quick-table.js': ['js/quick-table.js', 'text/javascript'],
  '/js/phrases.js': ['js/phrases.js', 'text/javascript'],
  '/data/korean.json': ['data/korean.json', 'application/json'],
  '/manifest.json': ['manifest.json', 'application/manifest+json'],
  '/icons/icon.svg': ['icons/icon.svg', 'image/svg+xml'],
  '/icons/icon-192.png': ['icons/icon-192.png', 'image/png'],
  '/icons/icon-512.png': ['icons/icon-512.png', 'image/png']
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 4_100_000) throw new Error('照片過大，請改用較小的照片。');
  }
  return JSON.parse(text);
}

function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (match, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[entity.toLowerCase()] || match;
  });
}

// Google Vision 辨識韓文，再以 Cloud Translation 翻成繁體中文。
async function translatePhoto(req, res) {
  if (!process.env.GOOGLE_CLOUD_API_KEY) {
    send(res, 503, { error: '尚未設定翻譯服務金鑰。' });
    return;
  }
  let image;
  try {
    ({ image } = await readJson(req));
    if (typeof image !== 'string' || image.length > 4_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      throw new Error('照片格式不正確或檔案過大。');
    }
  } catch (error) {
    send(res, 400, { error: error.message || '無法讀取照片。' });
    return;
  }

  try {
    const key = encodeURIComponent(process.env.GOOGLE_CLOUD_API_KEY);
    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ image: { content: image }, features: [{ type: 'TEXT_DETECTION' }], imageContext: { languageHints: ['ko'] } }] }),
      signal: AbortSignal.timeout(20000)
    });
    const vision = await visionResponse.json();
    if (!visionResponse.ok || vision.responses?.[0]?.error) throw new Error('文字辨識服務暫時無法使用。');
    const original = (vision.responses?.[0]?.fullTextAnnotation?.text || vision.responses?.[0]?.textAnnotations?.[0]?.description || '').trim();
    if (!original) {
      send(res, 422, { error: '照片中沒有辨識到文字，請拍清楚一點再試。' });
      return;
    }
    if (original.length > 5000) {
      send(res, 422, { error: '照片中的文字過多，請縮小拍攝範圍。' });
      return;
    }
    const translateResponse = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: original, source: 'ko', target: 'zh-TW', format: 'text' }),
      signal: AbortSignal.timeout(20000)
    });
    const translation = await translateResponse.json();
    if (!translateResponse.ok || !translation.data?.translations?.[0]?.translatedText) throw new Error('翻譯服務暫時無法使用。');
    send(res, 200, { original, translated: decodeEntities(translation.data.translations[0].translatedText) });
  } catch {
    send(res, 502, { error: '照片翻譯暫時無法使用，請稍後重試。' });
  }
}

// 僅提供本站必要檔案，避免暴露伺服器程式與環境設定。
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/photo-translate' && req.method === 'POST') {
    await translatePhoto(req, res);
    return;
  }
  const file = files[pathname];
  if (req.method !== 'GET' || !file) {
    send(res, 404, { error: '找不到頁面。' });
    return;
  }
  try {
    const content = await readFile(path.join(__dirname, file[0]));
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8` });
    res.end(content);
  } catch {
    send(res, 404, { error: '找不到頁面。' });
  }
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => console.log(`http://localhost:${port}`));
}

module.exports = server;
