/**
 * EPIC 17 XFY-089 — OpenAPI / Swagger UI at /api/docs
 */

import { Router } from "express";
import { config } from "../config/env";
import { openApiSpec } from "../lib/openapi-spec";

const router = Router();

router.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

router.get("/docs", (_req, res) => {
  if (!config.enableSwagger) {
    return res.status(404).json({ error: "API docs disabled" });
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>X!Y API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: ${JSON.stringify("/api/openapi.json")},
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
      tryItOutEnabled: true,
      persistAuthorization: true,
    });
  </script>
</body>
</html>`;
  res.type("html").send(html);
});

export default router;
export { openApiSpec };
