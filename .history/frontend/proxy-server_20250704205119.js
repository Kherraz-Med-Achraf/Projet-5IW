const http = require('http');
const httpProxy = require('http-proxy-middleware');

// Proxy vers le backend
const proxy = httpProxy.createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    '^/api': '' // Enlève /api du début
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('[PROXY ERROR]', err.message);
    res.status(500).send('Proxy Error');
  }
});

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    proxy(req, res);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(3001, () => {
  console.log('🚀 Proxy server running on http://localhost:3001');
  console.log('📡 Proxying /api/* -> http://localhost:3000');
}); 