export type WebhookQueryParam = {
  id?: string;
  key: string;
  value: string;
  enabled: boolean;
};

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

export type GroupBotCommandPayload = Omit<GroupBotCommand, "id" | "createdAt" | "updatedAt">;
