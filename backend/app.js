const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.resolve(__dirname, '../frontend');
const port = Number(process.env.PORT || 3000);
const { configured, getDashboard, createSale, updateSale, deleteSale, createReturn } = require('./supabase');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function send(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; if (body.length > 1_000_000) reject(new Error('Request terlalu besar')); });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Format JSON tidak valid')); }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  try {
    if (pathname === '/api/health') return send(response, 200, { configured });
    if (pathname.startsWith('/api/')) {
      if (!configured) return send(response, 503, { error: 'Supabase belum dikonfigurasi. Demo lokal tetap dapat digunakan.' });
      if (request.method === 'GET' && pathname === '/api/dashboard') {
        return send(response, 200, await getDashboard());
      }
      if (request.method === 'POST' && pathname === '/api/sales') {
        const body = await readBody(request);
        const data = await createSale(body);
        return send(response, 201, { id: data });
      }
      const saleMatch = pathname.match(/^\/api\/sales\/([a-f0-9-]+)$/i);
      if (saleMatch && request.method === 'PUT') {
        const body = await readBody(request);
        const data = await updateSale(saleMatch[1], body);
        return send(response, 200, { id: data });
      }
      if (saleMatch && request.method === 'DELETE') {
        const data = await deleteSale(saleMatch[1]);
        return send(response, 200, { id: data });
      }
      if (request.method === 'POST' && pathname === '/api/returns') {
        const body = await readBody(request);
        const data = await createReturn(body);
        return send(response, 201, { id: data });
      }
      return send(response, 404, { error: 'Endpoint tidak ditemukan' });
    }

    const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    const filePath = path.resolve(frontendRoot, requested);
    if (!filePath.startsWith(`${frontendRoot}${path.sep}`)) return send(response, 403, { error: 'Akses ditolak' });
    fs.readFile(filePath, (error, content) => {
      if (error) return send(response, 404, { error: 'File tidak ditemukan' });
      response.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
      response.end(content);
    });
  } catch (error) {
    send(response, 400, { error: error.message });
  }
});

server.listen(port, () => console.log(`Gadgetku berjalan di http://localhost:${port}`));