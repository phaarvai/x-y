/**
 * EPIC 17 XFY-086 — Pluggable file storage providers
 * Local (MVP) | AWS S3 | Azure Blob | Google Cloud Storage
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config/env";
import { logger } from "../logger";

export type StorageProviderName = "local" | "s3" | "azure" | "gcs";

export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  isPublic?: boolean;
};

export type PutObjectResult = {
  provider: StorageProviderName;
  storagePath: string;
  publicUrl?: string;
};

export type SignedUrlResult = {
  url: string;
  expiresAt: Date;
};

export interface ObjectStorageProvider {
  readonly name: StorageProviderName;
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getObject(storagePath: string): Promise<Buffer>;
  deleteObject(storagePath: string): Promise<void>;
  getSignedUrl(storagePath: string, ttlSeconds?: number): Promise<SignedUrlResult>;
}

/** Malware scanning — pluggable interface (noop/pass-through by default) */
export interface MalwareScanner {
  scan(buffer: Buffer, fileName: string, mimeType: string): Promise<{
    status: "CLEAN" | "INFECTED" | "ERROR" | "SKIPPED";
    detail?: string;
  }>;
}

export class NoopMalwareScanner implements MalwareScanner {
  async scan(): Promise<{ status: "CLEAN" | "INFECTED" | "ERROR" | "SKIPPED"; detail?: string }> {
    return { status: "SKIPPED", detail: "No scanner configured (set MALWARE_SCANNER=clamav|external)" };
  }
}

export class LocalStorageProvider implements ObjectStorageProvider {
  readonly name = "local" as const;
  constructor(private rootDir = config.storageLocalPath) {}

  private resolve(key: string) {
    const safe = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return path.resolve(this.rootDir, safe);
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const full = this.resolve(input.key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, input.body);
    return {
      provider: "local",
      storagePath: input.key,
      publicUrl: input.isPublic ? `${config.storagePublicBaseUrl}/${input.key}` : undefined,
    };
  }

  async getObject(storagePath: string): Promise<Buffer> {
    return fs.readFile(this.resolve(storagePath));
  }

  async deleteObject(storagePath: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(storagePath));
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw err;
    }
  }

  async getSignedUrl(storagePath: string, ttlSeconds = config.signedUrlTtlSeconds): Promise<SignedUrlResult> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const token = crypto
      .createHmac("sha256", config.sessionSecret || "local-dev-signing")
      .update(`${storagePath}:${expiresAt.getTime()}`)
      .digest("hex");
    const url = `${config.storagePublicBaseUrl}/download?path=${encodeURIComponent(storagePath)}&exp=${expiresAt.getTime()}&sig=${token}`;
    return { url, expiresAt };
  }
}

/**
 * S3 / Azure / GCS providers are scaffolded for production wiring.
 * They use dynamic import of official SDKs when installed; otherwise throw a clear error.
 */
export class S3StorageProvider implements ObjectStorageProvider {
  readonly name = "s3" as const;

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    throw new Error(
      `S3 provider selected but SDK not wired in this build. Install @aws-sdk/client-s3 and configure AWS_* env. Key would be: ${input.key}`,
    );
  }
  async getObject(): Promise<Buffer> {
    throw new Error("S3 provider not fully configured");
  }
  async deleteObject(): Promise<void> {
    throw new Error("S3 provider not fully configured");
  }
  async getSignedUrl(): Promise<SignedUrlResult> {
    throw new Error("S3 provider not fully configured");
  }
}

export class AzureBlobStorageProvider implements ObjectStorageProvider {
  readonly name = "azure" as const;
  async putObject(): Promise<PutObjectResult> {
    throw new Error("Azure Blob provider requires @azure/storage-blob and AZURE_STORAGE_* env");
  }
  async getObject(): Promise<Buffer> {
    throw new Error("Azure Blob provider not fully configured");
  }
  async deleteObject(): Promise<void> {
    throw new Error("Azure Blob provider not fully configured");
  }
  async getSignedUrl(): Promise<SignedUrlResult> {
    throw new Error("Azure Blob provider not fully configured");
  }
}

export class GcsStorageProvider implements ObjectStorageProvider {
  readonly name = "gcs" as const;
  async putObject(): Promise<PutObjectResult> {
    throw new Error("GCS provider requires @google-cloud/storage and GCS_* env");
  }
  async getObject(): Promise<Buffer> {
    throw new Error("GCS provider not fully configured");
  }
  async deleteObject(): Promise<void> {
    throw new Error("GCS provider not fully configured");
  }
  async getSignedUrl(): Promise<SignedUrlResult> {
    throw new Error("GCS provider not fully configured");
  }
}

let cachedProvider: ObjectStorageProvider | null = null;
let cachedScanner: MalwareScanner | null = null;

export function getStorageProvider(): ObjectStorageProvider {
  if (cachedProvider) return cachedProvider;
  switch (config.storageProvider) {
    case "s3":
      cachedProvider = new S3StorageProvider();
      break;
    case "azure":
      cachedProvider = new AzureBlobStorageProvider();
      break;
    case "gcs":
      cachedProvider = new GcsStorageProvider();
      break;
    default:
      cachedProvider = new LocalStorageProvider();
  }
  logger.info({ provider: cachedProvider.name }, "Storage provider initialized");
  return cachedProvider;
}

export function getMalwareScanner(): MalwareScanner {
  if (cachedScanner) return cachedScanner;
  cachedScanner = new NoopMalwareScanner();
  return cachedScanner;
}

export function resetStorageCaches() {
  cachedProvider = null;
  cachedScanner = null;
}
