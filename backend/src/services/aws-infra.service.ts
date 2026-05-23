import { AppError } from "../middleware/error.middleware";
import { createAwsClient, parseAwsRoleConfig } from "../utils/aws-platform";

export type CloudWatchSourceConfig = {
  region: string;
  roleArn: string;
  externalId?: string;
  sessionNamePrefix?: string;
  logGroupName: string;
  logStreamPrefix?: string;
  filterPattern?: string;
  lookbackMinutes: number;
};

type CloudWatchLogsEvent = {
  timestamp?: number;
  message?: string;
  ingestionTime?: number;
};

type FilterLogEventsResponse = {
  events?: CloudWatchLogsEvent[];
};

type CloudWatchLogsClientLike = {
  send: (command: unknown) => Promise<FilterLogEventsResponse>;
};

type Ec2ClientLike = {
  send: (command: unknown) => Promise<{
    Reservations?: Array<{
      Instances?: Array<{
        InstanceId?: string;
        State?: { Name?: string };
      }>;
    }>;
  }>;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function inferLevelFromMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("error") || normalized.includes("exception") || normalized.includes("fatal")) {
    return "error";
  }
  if (normalized.includes("warn")) return "warn";
  if (normalized.includes("debug") || normalized.includes("trace")) return "debug";
  if (normalized.includes("http")) return "http";
  return "info";
}

export const awsInfraService = {
  parseCloudWatchSourceConfig(rawConfig: unknown): CloudWatchSourceConfig | null {
    if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
      return null;
    }

    const baseConfig = parseAwsRoleConfig(rawConfig);
    if (!baseConfig) return null;

    const data = rawConfig as Record<string, unknown>;
    const logGroupName = normalizeString(data.logGroupName);
    const logStreamPrefix = normalizeString(data.logStreamPrefix);
    const filterPattern = normalizeString(data.filterPattern);
    const lookbackMinutes = Math.min(7 * 24 * 60, parsePositiveInt(data.lookbackMinutes, 240));

    if (!logGroupName) {
      return null;
    }

    return {
      ...baseConfig,
      logGroupName,
      ...(logStreamPrefix ? { logStreamPrefix } : {}),
      ...(filterPattern ? { filterPattern } : {}),
      lookbackMinutes,
    };
  },

  async fetchCloudWatchLogs(config: CloudWatchSourceConfig, limit: number) {
    const cloudWatchModule = await (new Function("moduleName", "return import(moduleName)") as (moduleName: string) => Promise<Record<string, unknown>>)(
      "@aws-sdk/client-cloudwatch-logs",
    ).catch(() => {
      throw new AppError(
        "Missing AWS SDK module: @aws-sdk/client-cloudwatch-logs. Install AWS SDK clients.",
        503,
        "AWS_SDK_MISSING",
      );
    });

    const FilterLogEventsCommand = cloudWatchModule.FilterLogEventsCommand as
      | (new (params: {
        logGroupName: string;
        logStreamNamePrefix?: string;
        filterPattern?: string;
        startTime: number;
        limit: number;
        interleaved: boolean;
      }) => unknown)
      | undefined;

    if (!FilterLogEventsCommand) {
      throw new AppError("AWS CloudWatch Logs client is unavailable", 503, "AWS_SDK_INVALID");
    }

    const client = await createAwsClient<CloudWatchLogsClientLike>(
      "@aws-sdk/client-cloudwatch-logs",
      "CloudWatchLogsClient",
      {
        region: config.region,
        roleArn: config.roleArn,
        ...(config.externalId ? { externalId: config.externalId } : {}),
        ...(config.sessionNamePrefix ? { sessionNamePrefix: config.sessionNamePrefix } : {}),
      },
    );

    const startTime = Date.now() - config.lookbackMinutes * 60 * 1000;
    const response = await client.send(
      new FilterLogEventsCommand({
        logGroupName: config.logGroupName,
        ...(config.logStreamPrefix ? { logStreamNamePrefix: config.logStreamPrefix } : {}),
        ...(config.filterPattern ? { filterPattern: config.filterPattern } : {}),
        startTime,
        limit,
        interleaved: true,
      }),
    );

    const events = response.events ?? [];
    return events
      .map((event) => {
        const message = normalizeString(event.message);
        if (!message) return null;

        const timestamp = event.timestamp ?? event.ingestionTime ?? Date.now();
        const iso = new Date(timestamp).toISOString();

        return {
          level: inferLevelFromMessage(message),
          message,
          timestamp: iso,
        };
      })
      .filter((entry): entry is { level: string; message: string; timestamp: string } => Boolean(entry))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },

  // Reusable helper for future infrastructure widgets (EC2/instance status, etc.)
  async listEc2InstanceStatuses(config: { region: string; roleArn: string; externalId?: string; instanceIds?: string[] }) {
    const ec2Module = await (new Function("moduleName", "return import(moduleName)") as (moduleName: string) => Promise<Record<string, unknown>>)(
      "@aws-sdk/client-ec2",
    ).catch(() => {
      throw new AppError(
        "Missing AWS SDK module: @aws-sdk/client-ec2. Install AWS SDK clients.",
        503,
        "AWS_SDK_MISSING",
      );
    });

    const DescribeInstancesCommand = ec2Module.DescribeInstancesCommand as
      | (new (params: { InstanceIds?: string[] }) => unknown)
      | undefined;
    if (!DescribeInstancesCommand) {
      throw new AppError("AWS EC2 client is unavailable", 503, "AWS_SDK_INVALID");
    }

    const client = await createAwsClient<Ec2ClientLike>(
      "@aws-sdk/client-ec2",
      "EC2Client",
      {
        region: config.region,
        roleArn: config.roleArn,
        ...(config.externalId ? { externalId: config.externalId } : {}),
      },
    );

    const response = await client.send(
      new DescribeInstancesCommand({
        ...(config.instanceIds && config.instanceIds.length > 0 ? { InstanceIds: config.instanceIds } : {}),
      }),
    );

    const statuses: Array<{ instanceId: string; state: string }> = [];
    for (const reservation of response.Reservations ?? []) {
      for (const instance of reservation.Instances ?? []) {
        const instanceId = normalizeString(instance.InstanceId);
        if (!instanceId) continue;
        statuses.push({
          instanceId,
          state: normalizeString(instance.State?.Name) || "unknown",
        });
      }
    }

    return statuses;
  },
};
