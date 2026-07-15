/** OpenAPI 3.1 specification for X!Y API (EPIC 17 XFY-089) */

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "X!Y Explorer Factory API",
    version: "1.0.0",
    description:
      "Production API for X!Y (The Explorer Factory). Versioned under /api/v1. Legacy routes remain under /api for backward compatibility.",
  },
  servers: [
    { url: "/api", description: "Current (legacy + new)" },
    { url: "/api/v1", description: "API v1" },
  ],
  tags: [
    { name: "Health", description: "Liveness, readiness, health" },
    { name: "System", description: "System info & metrics hooks" },
    { name: "Auth", description: "Session authentication" },
    { name: "Files", description: "Secure file uploads" },
    { name: "Audit", description: "Admin audit logs" },
    { name: "RBAC", description: "Roles and permissions" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "SessionToken",
        description: "Bearer session token from /auth/login (Authorization: Bearer <token>)",
      },
    },
    parameters: {
      PageParam: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
      },
      PageSizeParam: {
        name: "pageSize",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string" },
          requestId: { type: "string" },
          details: {},
        },
      },
      HealthStatus: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "degraded", "alive", "ready", "not_ready"] },
          version: { type: "string" },
          checks: { type: "object", additionalProperties: { type: "string" } },
        },
      },
      SystemInfo: {
        type: "object",
        properties: {
          name: { type: "string" },
          version: { type: "string" },
          apiVersion: { type: "string" },
          env: { type: "string" },
          uptimeSeconds: { type: "integer" },
          storageProvider: { type: "string" },
        },
      },
      UploadedFile: {
        type: "object",
        properties: {
          id: { type: "integer" },
          ownerUserId: { type: "integer" },
          fileName: { type: "string" },
          originalName: { type: "string" },
          mimeType: { type: "string" },
          size: { type: "integer" },
          storageProvider: { type: "string" },
          checksum: { type: "string" },
          isPublic: { type: "boolean" },
          uploadedAt: { type: "string", format: "date-time" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "integer" },
          userId: { type: "integer", nullable: true },
          action: { type: "string" },
          entityType: { type: "string" },
          entityId: { type: "integer", nullable: true },
          oldValue: { type: "string", nullable: true },
          newValue: { type: "string", nullable: true },
          ipAddress: { type: "string", nullable: true },
          userAgent: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          pageSize: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Not authenticated",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      Forbidden: {
        description: "Insufficient permissions (403)",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      RateLimited: {
        description: "Too many requests (429)",
        headers: {
          "X-RateLimit-Limit": { schema: { type: "integer" } },
          "X-RateLimit-Remaining": { schema: { type: "integer" } },
        },
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
    },
  },
  paths: {
    "/healthz": {
      get: {
        tags: ["Health"],
        summary: "Legacy health check",
        operationId: "healthz",
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/HealthStatus" } } },
          },
        },
      },
    },
    "/livez": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        operationId: "livez",
        responses: { "200": { description: "Alive" } },
      },
    },
    "/readyz": {
      get: {
        tags: ["Health"],
        summary: "Readiness probe (DB)",
        operationId: "readyz",
        responses: {
          "200": { description: "Ready" },
          "503": { description: "Not ready" },
        },
      },
    },
    "/v1/health": {
      get: {
        tags: ["Health"],
        summary: "API v1 health",
        operationId: "v1Health",
        responses: {
          "200": {
            description: "Healthy",
            content: { "application/json": { schema: { $ref: "#/components/schemas/HealthStatus" } } },
          },
          "503": { description: "Degraded" },
        },
      },
    },
    "/v1/system": {
      get: {
        tags: ["System"],
        summary: "System info",
        operationId: "v1System",
        responses: {
          "200": {
            description: "System info",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SystemInfo" } } },
          },
        },
      },
    },
    "/files/upload": {
      post: {
        tags: ["Files"],
        summary: "Upload a file (JSON base64 or multipart)",
        operationId: "uploadFile",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fileBase64", "fileName", "mimeType"],
                properties: {
                  fileBase64: { type: "string" },
                  fileName: { type: "string" },
                  mimeType: { type: "string", example: "application/pdf" },
                  entityType: { type: "string" },
                  entityId: { type: "integer" },
                  isPublic: { type: "boolean" },
                  checksum: { type: "string", description: "Optional SHA-256 hex" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Uploaded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { file: { $ref: "#/components/schemas/UploadedFile" } },
                },
              },
            },
          },
          "400": { description: "Validation / MIME / malware" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/files/{id}": {
      get: {
        tags: ["Files"],
        summary: "Get file metadata + signed download URL",
        operationId: "getFile",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "File metadata" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        tags: ["Files"],
        summary: "Delete a file (owner or admin)",
        operationId: "deleteFile",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Deleted" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/audit-logs": {
      get: {
        tags: ["Audit"],
        summary: "List audit logs (admin)",
        operationId: "listAuditLogs",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/PageSizeParam" },
          { name: "userId", in: "query", schema: { type: "integer" } },
          { name: "entityType", in: "query", schema: { type: "string" } },
          { name: "entityId", in: "query", schema: { type: "integer" } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": {
            description: "Paginated audit logs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/AuditLog" } },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/audit-logs/{id}": {
      get: {
        tags: ["Audit"],
        summary: "Get audit log by id",
        operationId: "getAuditLog",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Audit log" },
          "404": { description: "Not found" },
        },
      },
    },
  },
} as const;