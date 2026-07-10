const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
  app.use(
    "/images",
    createProxyMiddleware({
      target: "https://productionapi.comart.in",
      changeOrigin: true,
      secure: false,
    })
  );
};
