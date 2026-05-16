import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { jidNormalizedUser, normalizeMessageContent, type GroupMetadata, type WAMessage } from "baileys";

const storePath = process.env.GROUP_BOT_STORE_PATH || "./db/group-bot-commands.json";
const DEFAULT_PREFIX = "/";
const MAX_COMMANDS = 200;

export type GroupBotCommand = {
  id: string;
  trigger: string;
  type: "text" | "webhook";
  response: string;
  description: string;
  webhookUrl: string;
  webhookMethod: "GET" | "POST";
  webhookBody: string;
  webhookQuery: WebhookQueryParam[];
  webhookReply: boolean;
  enabled: boolean;
  exactMatch: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebhookQueryParam = {
  key: string;
  value: string;
  enabled: boolean;
};

export type GroupBotSettings = {
  adminWhitelist: string[];
};

export type GroupBotCommandInput = {
  trigger: string;
  type?: "text" | "webhook";
  response?: string;
  description?: string;
  webhookUrl?: string;
  webhookMethod?: "GET" | "POST";
  webhookBody?: string;
  webhookQuery?: WebhookQueryParam[];
  webhookReply?: boolean;
  enabled?: boolean;
  exactMatch?: boolean;
};

type GroupBotStore = {
  commands: GroupBotCommand[];
  settings: GroupBotSettings;
};

type CommandContext = {
  message: WAMessage;
  groupJid: string;
  metadata: GroupMetadata;
  text: string;
  command?: GroupBotCommand;
};

const fallbackCommands: GroupBotCommand[] = [
  {
    id: "builtin-info",
    trigger: "/info",
    type: "text",
    response: [
      "Info Group",
      "Nama: {group_name}",
      "Group ID: {group_id}",
      "Owner: {owner}",
      "Dibuat: {created_at}",
      "Peserta: {participant_count}",
      "Admin: {admin_count}",
      "Mode kirim pesan: {message_mode}",
      "Mode edit info: {edit_mode}",
      "Deskripsi: {description}",
    ].join("\n"),
    description: "Menampilkan ringkasan informasi group",
    webhookUrl: "",
    webhookMethod: "POST",
    webhookBody: "",
    webhookQuery: [],
    webhookReply: true,
    enabled: true,
    exactMatch: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

function normalizeAdminJid(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.includes("@")) return jidNormalizedUser(normalized);

  const phone = normalized.replace(/\D/g, "");
  return phone ? `${phone}@s.whatsapp.net` : "";
}

function getDefaultSettings(): GroupBotSettings {
  const adminWhitelist = (process.env.ADMIN_WHITELIST || process.env.WHITELIST_ADMINS || process.env.WHATSAPP_ADMIN_WHITELIST || "")
    .split(",")
    .map((admin) => normalizeAdminJid(admin))
    .filter(Boolean);

  return { adminWhitelist };
}

function normalizeTrigger(trigger: string) {
  const value = trigger.trim().replace(/\s+/g, " ").toLowerCase();
  if (!value) throw new Error("Trigger is required");
  if (!/^[\w/-]+(\s+\{[a-z][a-z0-9_]*\})*$/i.test(value)) throw new Error("Trigger format is invalid");
  return value.startsWith(DEFAULT_PREFIX) ? value : `${DEFAULT_PREFIX}${value}`;
}

function normalizeCommandType(type?: string): "text" | "webhook" {
  if (!type) return "text";
  if (type === "text" || type === "webhook") return type;
  throw new Error("Command type is invalid");
}

function normalizeWebhookMethod(method?: string): "GET" | "POST" {
  if (!method) return "POST";
  const normalized = method.toUpperCase();
  if (normalized === "GET" || normalized === "POST") return normalized;
  throw new Error("Webhook method is invalid");
}

function normalizeWebhookUrl(type: "text" | "webhook", webhookUrl?: string) {
  const value = webhookUrl?.trim() || "";
  if (type === "text" && !value) return "";
  if (!value) throw new Error("Webhook URL is required");

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new Error("Webhook URL must be a valid HTTP URL");
  }
}

function normalizeWebhookQuery(input?: WebhookQueryParam[]) {
  if (!Array.isArray(input)) return [];
  if (input.length > 50) throw new Error("Webhook query params must be 50 rows or fewer");

  return input
    .map((param) => ({
      key: param.key?.trim() || "",
      value: param.value?.trim() || "",
      enabled: param.enabled ?? true,
    }))
    .filter((param) => param.key || param.value);
}

function getMessageText(message: WAMessage) {
  const content = normalizeMessageContent(message.message);
  return (content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || content?.documentMessage?.caption || "").trim();
}

function getSenderJid(message: WAMessage) {
  const jid = message.key.participant || message.key.participantAlt || message.key.participantUsername || message.key.remoteJid || "";
  return jid ? jidNormalizedUser(jid) : "-";
}

function getSenderJids(message: WAMessage) {
  const senderJids = [message.key.participant, message.key.participantAlt, message.key.participantUsername, message.key.remoteJid].filter(Boolean) as string[];
  return senderJids.map((jid) => jidNormalizedUser(jid));
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.TZ || "Asia/Jakarta",
  }).format(new Date(timestamp * 1000));
}

function createId() {
  return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureStoreDir() {
  await mkdir(dirname(storePath), { recursive: true });
}

async function readStore(): Promise<GroupBotStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as GroupBotStore;
    const defaultSettings = getDefaultSettings();

    return {
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
      settings: {
        ...defaultSettings,
        ...(parsed.settings || {}),
        adminWhitelist: Array.isArray(parsed.settings?.adminWhitelist) ? parsed.settings.adminWhitelist.map((admin) => normalizeAdminJid(admin)).filter(Boolean) : defaultSettings.adminWhitelist,
      },
    };
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
    return {
      commands: fallbackCommands.map((command) => ({ ...command })),
      settings: getDefaultSettings(),
    };
  }
}

async function writeStore(store: GroupBotStore) {
  await ensureStoreDir();
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`);
}

function validateInput(input: GroupBotCommandInput) {
  const trigger = normalizeTrigger(input.trigger);
  const type = normalizeCommandType(input.type);
  const response = input.response?.trim() || "";
  const webhookMethod = normalizeWebhookMethod(input.webhookMethod);
  const webhookUrl = normalizeWebhookUrl(type, input.webhookUrl);
  const webhookBody = input.webhookBody?.trim() || "";
  const webhookQuery = normalizeWebhookQuery(input.webhookQuery);
  if (trigger.length > 64) throw new Error("Trigger must be 64 characters or fewer");
  if (type === "text" && !response) throw new Error("Response is required");
  if (response.length > 4000) throw new Error("Response must be 4000 characters or fewer");
  if (webhookBody.length > 8000) throw new Error("Webhook JSON body must be 8000 characters or fewer");
  if (type === "webhook" && webhookMethod === "GET" && webhookBody) throw new Error("Webhook JSON body is only supported for POST");

  return {
    trigger,
    type,
    response,
    description: input.description?.trim() || "",
    webhookUrl,
    webhookMethod,
    webhookBody,
    webhookQuery,
    webhookReply: input.webhookReply ?? true,
    enabled: input.enabled ?? true,
    exactMatch: input.exactMatch ?? true,
  };
}

function findDuplicate(commands: GroupBotCommand[], input: Pick<GroupBotCommand, "trigger">, exceptId?: string) {
  return commands.find((command) => command.id !== exceptId && command.trigger === input.trigger);
}

function commandMatches(command: GroupBotCommand, ctx: CommandContext) {
  if (!command.enabled) return false;
  if (getNamedCommandParams(command, ctx.text)) return true;

  const text = ctx.text.toLowerCase();
  return command.exactMatch ? text === command.trigger : text === command.trigger || text.startsWith(`${command.trigger} `);
}

function getTriggerParts(command: GroupBotCommand) {
  return command.trigger.split(/\s+/);
}

function getCommandName(command: GroupBotCommand) {
  return getTriggerParts(command)[0] || command.trigger;
}

function getNamedParamNames(command: GroupBotCommand) {
  return getTriggerParts(command)
    .slice(1)
    .map((part) => part.match(/^\{([a-z][a-z0-9_]*)\}$/i)?.[1])
    .filter(Boolean) as string[];
}

function getNamedCommandParams(command: GroupBotCommand, text: string) {
  const names = getNamedParamNames(command);
  if (names.length === 0) return null;

  const parts = text.trim().split(/\s+/);
  const commandName = getCommandName(command);
  if (parts[0]?.toLowerCase() !== commandName) return null;
  if (parts.length - 1 < names.length) return null;
  if (command.exactMatch && parts.length - 1 !== names.length) return null;

  return names.reduce<Record<string, string>>((params, name, index) => {
    params[name] = parts[index + 1] || "";
    return params;
  }, {});
}

function getCommandParamText(command: GroupBotCommand, text: string) {
  const commandName = getCommandName(command);
  if (text.toLowerCase() === commandName) return "";
  return text.slice(commandName.length).trim();
}

function getCommandParams(command: GroupBotCommand, text: string) {
  const paramText = getCommandParamText(command, text);
  if (!paramText) return [];
  return paramText.split(/\s+/).filter(Boolean);
}

function renderResponse(template: string, ctx: CommandContext) {
  const participantCount = ctx.metadata.participants?.length || ctx.metadata.size || 0;
  const adminCount = ctx.metadata.participants?.filter((participant) => participant.admin || participant.isAdmin || participant.isSuperAdmin).length || 0;
  const command = ctx.command;
  const params = command ? getCommandParams(command, ctx.text) : [];
  const namedParams = command ? getNamedCommandParams(command, ctx.text) || {} : {};
  const variables: Record<string, string> = {
    admin_count: String(adminCount),
    created_at: formatDate(ctx.metadata.creation),
    description: ctx.metadata.desc?.trim() || "-",
    edit_mode: ctx.metadata.restrict ? "Hanya admin" : "Semua peserta",
    group_id: ctx.metadata.id || ctx.groupJid,
    group_name: ctx.metadata.subject || "-",
    message_mode: ctx.metadata.announce ? "Hanya admin" : "Semua peserta",
    owner: ctx.metadata.owner || ctx.metadata.ownerPn || "-",
    participant_count: String(participantCount),
    param_text: command ? getCommandParamText(command, ctx.text) : "",
    params: params.join(" "),
    sender: getSenderJid(ctx.message),
    text: ctx.text,
    ...namedParams,
  };
  params.forEach((param, index) => {
    variables[`param_${index + 1}`] = param;
  });

  return template.replace(/\{([a-z0-9_]+)\}/g, (_, key: string) => variables[key] ?? `{${key}}`);
}

function buildWebhookPayload(command: GroupBotCommand, ctx: CommandContext) {
  const params = getCommandParams(command, ctx.text);
  const namedParams = getNamedCommandParams(command, ctx.text) || {};
  return {
    command: command.trigger,
    params,
    named_params: namedParams,
    param_text: getCommandParamText(command, ctx.text),
    group: {
      id: ctx.metadata.id || ctx.groupJid,
      name: ctx.metadata.subject || "",
      description: ctx.metadata.desc || "",
      participant_count: ctx.metadata.participants?.length || ctx.metadata.size || 0,
    },
    message: {
      id: ctx.message.key.id || "",
      text: ctx.text,
      params,
      named_params: namedParams,
      param_text: getCommandParamText(command, ctx.text),
      sender: getSenderJid(ctx.message),
      timestamp: Number(ctx.message.messageTimestamp || 0),
    },
  };
}

function renderTemplate(command: GroupBotCommand, ctx: CommandContext, template: string) {
  return renderResponse(template, { ...ctx, command });
}

function renderWebhookBody(command: GroupBotCommand, ctx: CommandContext) {
  const rendered = renderTemplate(command, ctx, command.webhookBody);
  try {
    return JSON.stringify(JSON.parse(rendered));
  } catch {
    throw new Error("Webhook JSON body is invalid after rendering variables");
  }
}

function extractWebhookReply(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";

  const data = value as Record<string, unknown>;
  for (const key of ["reply", "message", "text", "response"]) {
    if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
  }

  return JSON.stringify(data);
}

async function executeWebhook(command: GroupBotCommand, ctx: CommandContext) {
  const payload = buildWebhookPayload(command, ctx);
  const url = new URL(command.webhookUrl);
  const init: RequestInit = {
    method: command.webhookMethod,
    headers: { accept: "application/json, text/plain" },
  };

  if (command.webhookMethod === "GET") {
    const activeQuery = command.webhookQuery.filter((param) => param.enabled && param.key.trim());
    if (activeQuery.length > 0) {
      activeQuery.forEach((param) => {
        url.searchParams.set(renderTemplate(command, ctx, param.key), renderTemplate(command, ctx, param.value));
      });
    } else {
      url.searchParams.set("command", payload.command);
      url.searchParams.set("param_text", payload.param_text);
      url.searchParams.set("group_id", payload.group.id);
      url.searchParams.set("group_name", payload.group.name);
      url.searchParams.set("message", payload.message.text);
      url.searchParams.set("sender", payload.message.sender);
      payload.params.forEach((param, index) => {
        url.searchParams.set(`param_${index + 1}`, param);
      });
    }
  } else {
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = command.webhookBody ? renderWebhookBody(command, ctx) : JSON.stringify(payload);
  }

  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Webhook failed with HTTP ${response.status}`);
  if (!command.webhookReply) return null;

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  const reply = extractWebhookReply(data);
  return reply || renderResponse(command.response, { ...ctx, command });
}

export const GroupBotService = {
  getMessageText,

  async listCommands() {
    const store = await readStore();
    return store.commands
      .map((command) => ({
        ...command,
        type: command.type || "text",
        webhookUrl: command.webhookUrl || "",
        webhookMethod: command.webhookMethod || "POST",
        webhookBody: command.webhookBody || "",
        webhookQuery: Array.isArray(command.webhookQuery) ? command.webhookQuery : [],
        webhookReply: command.webhookReply ?? true,
      }))
      .sort((a, b) => a.trigger.localeCompare(b.trigger));
  },

  async getSettings() {
    const store = await readStore();
    return store.settings;
  },

  async updateSettings(input: GroupBotSettings) {
    const store = await readStore();
    const settings: GroupBotSettings = {
      adminWhitelist: (input.adminWhitelist || []).map((admin) => normalizeAdminJid(admin)).filter(Boolean),
    };

    await writeStore({ ...store, settings });
    return settings;
  },

  async isSenderAllowed(message: WAMessage) {
    if (message.key.fromMe) return true;

    const { adminWhitelist } = await this.getSettings();
    if (adminWhitelist.length === 0) return true;

    const allowedAdmins = new Set(adminWhitelist);
    return getSenderJids(message).some((jid) => allowedAdmins.has(jid));
  },

  async createCommand(input: GroupBotCommandInput) {
    const commandInput = validateInput(input);
    const store = await readStore();
    if (store.commands.length >= MAX_COMMANDS) throw new Error(`Maximum ${MAX_COMMANDS} commands reached`);
    if (findDuplicate(store.commands, commandInput)) throw new Error("Command trigger already exists");

    const now = new Date().toISOString();
    const command: GroupBotCommand = {
      ...commandInput,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    };

    store.commands.push(command);
    await writeStore(store);
    return command;
  },

  async updateCommand(id: string, input: GroupBotCommandInput) {
    const commandInput = validateInput(input);
    const store = await readStore();
    const index = store.commands.findIndex((command) => command.id === id);
    if (index < 0) throw new Error("Command not found");
    if (findDuplicate(store.commands, commandInput, id)) throw new Error("Command trigger already exists");

    const current = store.commands[index];
    if (!current) throw new Error("Command not found");
    const command: GroupBotCommand = {
      ...current,
      ...commandInput,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    store.commands[index] = command;
    await writeStore(store);
    return command;
  },

  async deleteCommand(id: string) {
    const store = await readStore();
    const nextCommands = store.commands.filter((command) => command.id !== id);
    if (nextCommands.length === store.commands.length) throw new Error("Command not found");

    await writeStore({ ...store, commands: nextCommands });
  },

  async buildReply(message: WAMessage, groupJid: string, metadata: GroupMetadata) {
    const text = getMessageText(message);
    if (!text.startsWith(DEFAULT_PREFIX)) return null;

    const commands = await this.listCommands();
    const ctx = { message, groupJid, metadata, text };
    const command = commands.find((candidate) => commandMatches(candidate, ctx));
    if (!command) return null;

    return {
      command,
      text: command.type === "webhook" ? await executeWebhook(command, ctx) : renderResponse(command.response, { ...ctx, command }),
    };
  },
};
