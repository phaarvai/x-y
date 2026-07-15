import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "X!Y Explorer Factory API",
    version: "1.0.0",
    apiVersion: "v1",
    env: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    node: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    storageProvider: process.env.STORAGE_PROVIDER ?? "local",
    features: {
      fileUploads: process.env.FF_FILE_UPLOADS !== "false",
      auditApi: process.env.FF_AUDIT_API !== "false",
    },
  });
}
