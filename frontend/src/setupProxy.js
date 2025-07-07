const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://10.241.144.46:8000',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },   // ← removes the prefix
    })
  );
};