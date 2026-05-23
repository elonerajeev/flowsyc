import { randomUUID } from "crypto";

import { AppError } from "../middleware/error.middleware";

export type AwsRoleConfig = {
  region: string;
  roleArn: string;
  externalId?: string;
  sessionNamePrefix?: string;
};

type AwsTemporaryCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
};

type AssumeRoleParams = {
  RoleArn: string;
  RoleSessionName: string;
  DurationSeconds: number;
  ExternalId?: string;
};

type AssumeRoleResponse = {
  Credentials?: {
    AccessKeyId?: string;
    SecretAccessKey?: string;
    SessionToken?: string;
    Expiration?: Date | string;
  };
};

type StsClientLike = {
  send: (command: unknown) => Promise<AssumeRoleResponse>;
};

type AwsModule = Record<string, unknown>;

const moduleCache = new Map<string, Promise<AwsModule>>();
const credentialCache = new Map<string, AwsTemporaryCredentials>();

function getDynamicImporter() {
  return new Function("moduleName", "return import(moduleName)") as (moduleName: string) => Promise<AwsModule>;
}

function normalizeString(value: string | undefined | null) {
  return String(value ?? "").trim();
}

function normalizeRegion(region: string) {
  return region.trim();
}

function buildCredentialCacheKey(config: AwsRoleConfig) {
  return `${config.roleArn}::${config.region}::${config.externalId ?? ""}`;
}

function isExpiringSoon(expiration: Date) {
  return expiration.getTime() - Date.now() <= 2 * 60 * 1000;
}

function assertValidAwsRoleConfig(config: AwsRoleConfig) {
  if (!config.region) {
    throw new AppError("AWS region is required", 400, "VALIDATION_ERROR");
  }
  if (!config.roleArn) {
    throw new AppError("AWS role ARN is required", 400, "VALIDATION_ERROR");
  }
  if (!config.roleArn.startsWith("arn:aws:iam::") || !config.roleArn.includes(":role/")) {
    throw new AppError("Invalid AWS role ARN", 400, "VALIDATION_ERROR");
  }
}

export async function loadAwsModule(moduleName: string): Promise<AwsModule> {
  if (!moduleCache.has(moduleName)) {
    const importer = getDynamicImporter();
    moduleCache.set(moduleName, importer(moduleName));
  }

  try {
    return await moduleCache.get(moduleName)!;
  } catch {
    moduleCache.delete(moduleName);
    throw new AppError(
      `Missing AWS SDK module: ${moduleName}. Install @aws-sdk/client-sts and required AWS clients.`,
      503,
      "AWS_SDK_MISSING",
    );
  }
}

export async function assumeAwsRole(config: AwsRoleConfig): Promise<AwsTemporaryCredentials> {
  assertValidAwsRoleConfig(config);

  const cacheKey = buildCredentialCacheKey(config);
  const cached = credentialCache.get(cacheKey);
  if (cached && !isExpiringSoon(cached.expiration)) {
    return cached;
  }

  const stsModule = await loadAwsModule("@aws-sdk/client-sts");
  const StsClient = stsModule.STSClient as
    | (new (config: { region: string }) => StsClientLike)
    | undefined;
  const AssumeRoleCommand = stsModule.AssumeRoleCommand as
    | (new (params: AssumeRoleParams) => unknown)
    | undefined;

  if (!StsClient || !AssumeRoleCommand) {
    throw new AppError("AWS STS client is unavailable", 503, "AWS_SDK_INVALID");
  }

  const sessionNamePrefix = normalizeString(config.sessionNamePrefix) || "flowsyc";
  const sessionName = `${sessionNamePrefix}-${randomUUID().slice(0, 10)}`;

  const client = new StsClient({ region: config.region });
  const response = await client.send(
    new AssumeRoleCommand({
      RoleArn: config.roleArn,
      RoleSessionName: sessionName,
      DurationSeconds: 900,
      ...(config.externalId ? { ExternalId: config.externalId } : {}),
    }),
  );

  const credentials = response.Credentials;
  const accessKeyId = credentials?.AccessKeyId?.trim();
  const secretAccessKey = credentials?.SecretAccessKey?.trim();
  const sessionToken = credentials?.SessionToken?.trim();
  const expiration = credentials?.Expiration ? new Date(credentials.Expiration) : null;

  if (!accessKeyId || !secretAccessKey || !sessionToken || !expiration || Number.isNaN(expiration.getTime())) {
    throw new AppError("Unable to assume AWS role", 503, "AWS_ASSUME_ROLE_FAILED");
  }

  const resolved = {
    accessKeyId,
    secretAccessKey,
    sessionToken,
    expiration,
  } satisfies AwsTemporaryCredentials;

  credentialCache.set(cacheKey, resolved);
  return resolved;
}

export async function createAwsClient<TClient>(
  moduleName: string,
  clientCtorName: string,
  config: AwsRoleConfig,
): Promise<TClient> {
  const module = await loadAwsModule(moduleName);
  const ClientCtor = module[clientCtorName] as
    | (new (params: {
      region: string;
      credentials: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken: string;
      };
    }) => TClient)
    | undefined;

  if (!ClientCtor) {
    throw new AppError(`AWS SDK client ${clientCtorName} is unavailable`, 503, "AWS_SDK_INVALID");
  }

  const credentials = await assumeAwsRole(config);
  return new ClientCtor({
    region: config.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
}

export function parseAwsRoleConfig(rawConfig: unknown): AwsRoleConfig | null {
  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    return null;
  }

  const data = rawConfig as Record<string, unknown>;
  const region = normalizeRegion(String(data.region ?? ""));
  const roleArn = normalizeString(String(data.roleArn ?? ""));
  const externalId = normalizeString(String(data.externalId ?? ""));
  const sessionNamePrefix = normalizeString(String(data.sessionNamePrefix ?? ""));

  if (!region || !roleArn) return null;

  return {
    region,
    roleArn,
    ...(externalId ? { externalId } : {}),
    ...(sessionNamePrefix ? { sessionNamePrefix } : {}),
  };
}
