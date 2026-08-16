import { FormEvent, useEffect, useMemo, useState } from "react";

import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  History,
  Loader2,
  BarChart3,
  Settings,
  Plug,
  Wrench,
  Clock,
  ExternalLink,
  MessageSquare,
  MessageCircle,
  Send,
  Users,
  Lock,
  Home,
  Radio,
  Mail,
  Phone,
  Hash,
  Globe,
  Bell,
  Smartphone,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Search,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import BrainViewer from "../components/BrainViewer";
import ChatHistory from "../components/ChatHistory";
import DepartmentConnectors from "../components/DepartmentConnectors";
import DepartmentCrons from "../components/DepartmentCrons";
import DepartmentSkills from "../components/DepartmentSkills";
import { EmailTemplatesManager } from "../components/EmailTemplatesManager";
import RightChatDock from "../components/RightChatDock";
import { DashboardViewer } from "../components/dashboards/DashboardViewer";
import StatusBadge from "../components/StatusBadge";
import { departmentsApi, authApi, staffApi, skillsApi } from "../lib/api";

import { useAuth } from "../lib/auth";
import {
  DEPARTMENT_CATALOG,
  type DepartmentKey,
  type ProviderConfig,
  type CommsChannelConfig,
} from "../lib/types";

const TABS: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "connectors", label: "Connectors", icon: Plug },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "crons", label: "Cron Jobs", icon: Clock },
  { id: "chat-history", label: "Chat History", icon: History },
  { id: "brain", label: "Brain", icon: Brain },
  { id: "settings", label: "Settings", icon: Settings },
];

type TabId = string;

interface PlatformField {
  field: string;
  label: string;
  placeholder: string;
  type?: "text" | "password";
  hint?: string;
}

interface PlatformOption {
  key: CommsChannelConfig["key"];
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  docsUrl: string;
  instructions: string[];
  requiredFields: PlatformField[];
  recommendedFields: PlatformField[];
  defaultUrl?: string;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  {
    key: "telegram",
    name: "Telegram",
    icon: Send,
    tagline: "Run Hermes from Telegram DMs, groups, and topics.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram",
    instructions: [
      "In Telegram, talk to @BotFather, run /newbot, and copy the token it gives you.",
      "Then grab your numeric user ID from @userinfobot.",
    ],
    requiredFields: [
      { field: "bot_token", label: "Bot token", placeholder: "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ", type: "password", hint: "Create a bot with @BotFather, then paste the token it gives you." },
    ],
    recommendedFields: [
      { field: "allowed_users", label: "Allowed Telegram user IDs", placeholder: "1101916530, 9876543210", hint: "Comma-separated numeric IDs from @userinfobot. Without this, anyone can DM your bot." },
    ],
    defaultUrl: "https://t.me/your_bot",
  },
  {
    key: "slack",
    name: "Slack",
    icon: Hash,
    tagline: "Connect Hermes to Slack via Socket Mode — no public URL needed.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack",
    instructions: [
      "Create a Slack App in your workspace. Easiest: run `hermes slack manifest --agent-view --write` and paste the manifest.",
      "Enable Socket Mode in the app settings. Copy the Bot Token (xoxb-) and App-Level Token (xapp-).",
      "Grab your Slack Member ID (e.g. U01ABC2DEF3) from your Slack profile.",
    ],
    requiredFields: [
      { field: "bot_token", label: "Bot Token (xoxb-)", placeholder: "xoxb-...", type: "password" },
      { field: "credentials.app_token", label: "App-Level Token (xapp-)", placeholder: "xapp-...", type: "password", hint: "Found under Basic Info → App-Level Tokens in your Slack app settings." },
    ],
    recommendedFields: [
      { field: "allowed_users", label: "Allowed Slack Member IDs", placeholder: "U01ABC2DEF3, U02XYZ...", hint: "Comma-separated Slack Member IDs. Restricts who can DM the bot." },
    ],
    defaultUrl: "https://join.slack.com/t/org/shared_invite/...",
  },
  {
    key: "discord",
    name: "Discord",
    icon: MessageCircle,
    tagline: "Run Hermes as a Discord bot in DMs or server channels.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord",
    instructions: [
      "Go to discord.com/developers/applications and create a New Application.",
      "Under Bot, create a bot and copy its token.",
      "Enable Message Content Intent under Privileged Gateway Intents.",
      "Invite the bot to your server with the bot scope + applications.commands.",
    ],
    requiredFields: [
      { field: "bot_token", label: "Bot Token", placeholder: "MTk4NjIy...", type: "password" },
    ],
    recommendedFields: [
      { field: "credentials.free_response_channels", label: "Free-Response Channel IDs", placeholder: "1234567890123456789", hint: "Comma-separated channel IDs where Hermes responds without @mention. Leave empty to require @mention in all channels." },
    ],
    defaultUrl: "https://discord.gg/...",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    tagline: "Built-in Baileys bridge — link a phone number, no paid Meta API.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/whatsapp",
    instructions: [
      "Hermes uses a built-in Baileys bridge that emulates WhatsApp Web — no Meta developer account needed.",
      "On gateway start, a QR code appears in the terminal. Scan it with the WhatsApp app on your phone to link.",
      "Use a dedicated phone number for the bot (not your personal number) to minimize ban risk.",
    ],
    requiredFields: [
      { field: "credentials.phone_number", label: "Phone Number (E.164)", placeholder: "+60123456789", hint: "The phone number linked to the WhatsApp bridge. Used for display and reference only — actual linking happens via QR scan in the gateway." },
    ],
    recommendedFields: [],
    defaultUrl: "https://wa.me/1234567890",
  },
  {
    key: "teams",
    name: "Microsoft Teams",
    icon: Users,
    tagline: "Run Hermes as a Teams bot. Requires a public HTTPS endpoint.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/teams",
    instructions: [
      "Install the Teams CLI: `npm install -g @microsoft/teams.cli@preview` then `teams login`.",
      "Register a bot: `teams bot create` — this creates the Azure Bot registration and App ID.",
      "Copy the App ID and generate a Client Secret. Configure the public messaging endpoint to your server URL.",
    ],
    requiredFields: [
      { field: "credentials.app_id", label: "App ID", placeholder: "00000000-0000-0000-0000-000000000000" },
      { field: "credentials.client_secret", label: "Client Secret", placeholder: "your-client-secret", type: "password" },
      { field: "credentials.public_endpoint", label: "Public Messaging Endpoint", placeholder: "https://your-server.com/api/messages", hint: "Teams delivers messages by calling this public HTTPS webhook." },
    ],
    recommendedFields: [],
    defaultUrl: "https://teams.microsoft.com/l/channel/...",
  },
  {
    key: "email",
    name: "Email (IMAP/SMTP)",
    icon: Mail,
    tagline: "People email the agent and get in-thread replies.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email",
    instructions: [
      "Create a dedicated email account for this department (don't use a personal inbox).",
      "Enable IMAP on the account. Generate an app password if using Gmail/Outlook (not your login password).",
      "Hermes polls the inbox via IMAP and replies via SMTP — no external dependencies.",
    ],
    requiredFields: [
      { field: "credentials.email_address", label: "Email Address", placeholder: "finance@company.com" },
      { field: "credentials.imap_host", label: "IMAP Host", placeholder: "imap.gmail.com" },
      { field: "credentials.imap_password", label: "IMAP Password / App Password", placeholder: "your-app-password", type: "password" },
      { field: "credentials.smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { field: "credentials.smtp_password", label: "SMTP Password / App Password", placeholder: "your-app-password", type: "password" },
    ],
    recommendedFields: [
      { field: "allowed_users", label: "Allowed Sender Emails", placeholder: "staff@company.com, boss@company.com", hint: "Comma-separated email addresses. Without this, anyone who emails the bot gets a reply." },
    ],
    defaultUrl: "mailto:dept@company.com",
  },
  {
    key: "signal",
    name: "Signal",
    icon: Send,
    tagline: "Most privacy-focused messenger — end-to-end encrypted by default.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/signal",
    instructions: [
      "Install signal-cli (Java-based, requires Java 17+) and run it in HTTP mode.",
      "Link your Signal account as a secondary device: `signal-cli -u +number register` then verify.",
      "Start signal-cli daemon: `signal-cli daemon --receive-mode=http`.",
    ],
    requiredFields: [
      { field: "credentials.phone_number", label: "Signal Phone Number", placeholder: "+1234567890", hint: "The phone number registered with signal-cli. Must be linked as a secondary device." },
    ],
    recommendedFields: [
      { field: "credentials.signal_cli_url", label: "signal-cli HTTP URL", placeholder: "http://127.0.0.1:8080", hint: "URL of the signal-cli daemon. Defaults to localhost:8080 if omitted." },
    ],
    defaultUrl: "https://signal.me/#p/+123****7890",
  },
  {
    key: "matrix",
    name: "Matrix",
    icon: Globe,
    tagline: "Open, federated protocol — run your own homeserver or use matrix.org.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/matrix",
    instructions: [
      "Create a bot account on your Matrix homeserver (self-hosted Synapse/Conduit, or use matrix.org).",
      "Copy the homeserver URL, bot user ID, and password or access token.",
      "Bot auto-accepts room invites. DMs respond to every message; rooms need @mention by default.",
    ],
    requiredFields: [
      { field: "credentials.homeserver_url", label: "Homeserver URL", placeholder: "https://matrix.org" },
      { field: "credentials.bot_user_id", label: "Bot User ID", placeholder: "@finance-bot:matrix.org" },
      { field: "credentials.password", label: "Bot Password / Access Token", placeholder: "s3cr3t...", type: "password" },
    ],
    recommendedFields: [
      { field: "credentials.free_response_rooms", label: "Free-Response Room IDs", placeholder: "!room:matrix.org, !another:matrix.org", hint: "Comma-separated room IDs where Hermes responds without @mention." },
    ],
    defaultUrl: "https://matrix.org/#/room/...",
  },
  {
    key: "mattermost",
    name: "Mattermost",
    icon: MessageSquare,
    tagline: "Self-hosted Slack alternative. Connect via REST API + WebSocket.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/mattermost",
    instructions: [
      "Create a bot account on your Mattermost server (System Console → Integrations → Bot Accounts).",
      "Copy the bot access token from the bot account settings.",
      "Bot responds to @mentions in channels, and every message in DMs.",
    ],
    requiredFields: [
      { field: "credentials.server_url", label: "Mattermost Server URL", placeholder: "https://mattermost.company.com" },
      { field: "bot_token", label: "Bot Access Token", placeholder: "bot_access_token", type: "password" },
    ],
    recommendedFields: [
      { field: "credentials.team_name", label: "Team Name", placeholder: "engineering", hint: "The team slug the bot operates in. Optional if the bot is workspace-wide." },
    ],
    defaultUrl: "https://mattermost.company.com/team/channel",
  },
  {
    key: "line",
    name: "LINE",
    icon: MessageCircle,
    tagline: "Run Hermes as a LINE Official Account bot. Needs a public webhook.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Create a LINE Official Account at developers.line.me.",
      "Copy the Channel Access Token and Channel Secret from the Messaging API settings.",
      "Set the webhook URL to your public server endpoint.",
    ],
    requiredFields: [
      { field: "credentials.channel_access_token", label: "Channel Access Token", placeholder: "channel_access_token", type: "password" },
      { field: "credentials.channel_secret", label: "Channel Secret", placeholder: "channel_secret", type: "password" },
    ],
    recommendedFields: [],
    defaultUrl: "https://line.me/ti/g2/...",
  },
  {
    key: "sms",
    name: "SMS (Twilio)",
    icon: Smartphone,
    tagline: "People text your Twilio number and get AI replies. Paid per message.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/sms",
    instructions: [
      "Sign up at twilio.com (free trial available) and buy a phone number with SMS capability.",
      "Copy your Account SID and Auth Token from the Twilio Console dashboard.",
      "Note your Twilio phone number in E.164 format (e.g. +155****4567).",
    ],
    requiredFields: [
      { field: "credentials.account_sid", label: "Account SID", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { field: "credentials.auth_token", label: "Auth Token", placeholder: "your-auth-token", type: "password" },
      { field: "credentials.phone_number", label: "Twilio Phone Number (E.164)", placeholder: "+15551234567" },
    ],
    recommendedFields: [],
    defaultUrl: "tel:+123****7890",
  },
  {
    key: "webhooks",
    name: "Webhooks",
    icon: Globe,
    tagline: "Receive events from GitHub, GitLab, and other services.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks",
    instructions: [
      "Hermes exposes an incoming webhook URL when the gateway is running.",
      "Configure external services (GitHub, GitLab, etc.) to POST events to this URL.",
      "Set a webhook secret for HMAC verification of incoming payloads.",
    ],
    requiredFields: [
      { field: "webhook_url", label: "Webhook URL", placeholder: "https://your-server.com/webhook/github" },
    ],
    recommendedFields: [
      { field: "credentials.webhook_secret", label: "Webhook Secret", placeholder: "your-webhook-secret", type: "password", hint: "HMAC-SHA256 secret for verifying incoming payloads. Recommended for security." },
    ],
    defaultUrl: "",
  },
  {
    key: "google_chat",
    name: "Google Chat",
    icon: MessageSquare,
    tagline: "Run Hermes as a Google Chat bot. Needs a service account + public endpoint.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Create a service account in Google Cloud Console with Chat API access enabled.",
      "Download the JSON key file for the service account.",
      "Configure the Chat bot's HTTP endpoint to your public server URL.",
    ],
    requiredFields: [
      { field: "credentials.service_account_json", label: "Service Account JSON Key", placeholder: '{ "type": "service_account", ... }', type: "password", hint: "Paste the entire JSON key file contents." },
    ],
    recommendedFields: [],
    defaultUrl: "https://chat.google.com/room/...",
  },
  {
    key: "dingtalk",
    name: "DingTalk",
    icon: Bell,
    tagline: "Run Hermes as a DingTalk custom robot. Needs a public webhook.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Create a custom robot in the DingTalk Open Platform (open-dev.dingtalk.com).",
      "Copy the App Key and App Secret from the robot settings.",
      "Configure the incoming webhook URL to your public server endpoint.",
    ],
    requiredFields: [
      { field: "credentials.app_key", label: "App Key", placeholder: "dingXXXXXX" },
      { field: "credentials.app_secret", label: "App Secret", placeholder: "your-app-secret", type: "password" },
    ],
    recommendedFields: [],
    defaultUrl: "https://www.dingtalk.com/",
  },
  {
    key: "feishu",
    name: "Feishu (Lark)",
    icon: MessageSquare,
    tagline: "Run Hermes as a Feishu/Lark app. Needs a public webhook.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Create an app in the Feishu Open Platform (open.feishu.cn).",
      "Copy the App ID and App Secret from the app's Credentials & Basic Info.",
      "Configure the event subscription webhook URL to your public server endpoint.",
    ],
    requiredFields: [
      { field: "credentials.app_id", label: "App ID", placeholder: "cli_xxxxxxxxxxxx" },
      { field: "credentials.app_secret", label: "App Secret", placeholder: "your-app-secret", type: "password" },
    ],
    recommendedFields: [],
    defaultUrl: "https://www.feishu.cn/",
  },
  {
    key: "wecom",
    name: "WeCom (WeChat Work)",
    icon: MessageCircle,
    tagline: "Run Hermes as a WeCom custom app. Needs a public callback URL.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Create a custom app in the WeCom admin console (work.weixin.qq.com).",
      "Copy the Corp ID, Agent ID, and Secret from the app settings.",
      "Configure the callback URL to your public server endpoint.",
    ],
    requiredFields: [
      { field: "credentials.corp_id", label: "Corp ID", placeholder: "wwXXXXXXXXXXXXXX" },
      { field: "credentials.agent_id", label: "Agent ID", placeholder: "1000002" },
      { field: "credentials.secret", label: "Secret", placeholder: "your-app-secret", type: "password" },
    ],
    recommendedFields: [],
    defaultUrl: "https://work.weixin.qq.com/",
  },
  {
    key: "weixin",
    name: "WeChat (Official)",
    icon: MessageCircle,
    tagline: "Run Hermes as a WeChat Official Account. Needs verification + callback URL.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Create a WeChat Official Account application at mp.weixin.qq.com.",
      "Copy the App ID and App Secret from the developer settings.",
      "Configure the server callback URL to your public server endpoint. Account must be verified.",
    ],
    requiredFields: [
      { field: "credentials.app_id", label: "App ID", placeholder: "wxXXXXXXXXXXXXXX" },
      { field: "credentials.app_secret", label: "App Secret", placeholder: "your-app-secret", type: "password" },
    ],
    recommendedFields: [],
    defaultUrl: "https://mp.weixin.qq.com/",
  },
  {
    key: "homeassistant",
    name: "Home Assistant",
    icon: Home,
    tagline: "Trigger Hermes from Home Assistant conversations. For IoT/automation.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/homeassistant",
    instructions: [
      "In Home Assistant, go to Profile → Long-Lived Access Tokens and create a token.",
      "Copy the token and note your HA server URL (e.g. http://homeassistant.local:8123).",
      "Configure the Conversation integration to point at Hermes.",
    ],
    requiredFields: [
      { field: "credentials.ha_url", label: "Home Assistant URL", placeholder: "http://homeassistant.local:8123" },
      { field: "credentials.ha_token", label: "Long-Lived Access Token", placeholder: "eyJ...", type: "password" },
    ],
    recommendedFields: [],
    defaultUrl: "http://homeassistant.local:8123",
  },
  {
    key: "irc",
    name: "IRC",
    icon: Hash,
    tagline: "Run Hermes as an IRC bot. TLS supported.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Choose an IRC server and port (e.g. irc.libera.chat:6697 for TLS).",
      "Pick a bot nickname — it must be unique on the network.",
      "Optionally specify channels for the bot to join on connect.",
    ],
    requiredFields: [
      { field: "credentials.irc_server", label: "IRC Server", placeholder: "irc.libera.chat" },
      { field: "credentials.irc_nickname", label: "Bot Nickname", placeholder: "finance_bot" },
    ],
    recommendedFields: [
      { field: "credentials.irc_channels", label: "Channels to Join", placeholder: "#finance, #ops", hint: "Comma-separated channel names. Bot joins these on connect." },
      { field: "credentials.irc_port", label: "Port", placeholder: "6697", hint: "Use 6697 for TLS, 6667 for plaintext." },
    ],
    defaultUrl: "irc://irc.libera.chat/...",
  },
  {
    key: "ntfy",
    name: "ntfy.sh",
    icon: Bell,
    tagline: "Free push-notification service. Hermes sends alerts via HTTP POST.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Choose a topic name for this department (e.g. finance-alerts).",
      "Subscribe to the topic in the ntfy app or at ntfy.sh/your-topic.",
      "Hermes POSTs notifications to the topic. No auth needed for public topics.",
    ],
    requiredFields: [
      { field: "credentials.topic_name", label: "Topic Name", placeholder: "finance-alerts" },
    ],
    recommendedFields: [
      { field: "credentials.ntfy_server", label: "ntfy Server URL", placeholder: "https://ntfy.sh", hint: "Self-hosted ntfy URL if not using the public ntfy.sh." },
    ],
    defaultUrl: "https://ntfy.sh/your-topic",
  },
  {
    key: "simplex",
    name: "SimpleX",
    icon: Lock,
    tagline: "Privacy-focused with no user IDs. Generate a bot connection profile.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Hermes generates a SimpleX bot connection profile on gateway start.",
      "Share the SMP address with users so they can connect to the bot.",
      "Users connect via the SimpleX app — no phone number or email needed.",
    ],
    requiredFields: [
      { field: "credentials.smp_address", label: "SMP Address", placeholder: "smp:://example.com/...", hint: "The bot's SimpleX messaging protocol address. Generated by Hermes." },
    ],
    recommendedFields: [],
    defaultUrl: "https://simplex.chat/",
  },
  {
    key: "yuanbao",
    name: "Yuanbao (Tencent)",
    icon: MessageCircle,
    tagline: "Run Hermes as a Tencent Yuanbao bot.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Create a bot in the Tencent Yuanbao platform (yuanbao.tencent.com).",
      "Copy the Bot ID and credentials from the bot settings.",
    ],
    requiredFields: [
      { field: "credentials.bot_id", label: "Bot ID", placeholder: "yuanbao-bot-id" },
      { field: "credentials.bot_token", label: "Bot Token / Access Key", placeholder: "your-token", type: "password" },
    ],
    recommendedFields: [],
    defaultUrl: "https://yuanbao.tencent.com/",
  },
  {
    key: "qqbot",
    name: "QQ Bot",
    icon: MessageCircle,
    tagline: "Run Hermes as a QQ bot via the QQ Open Platform API.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Create a QQ bot in the QQ Open Platform (q.qq.com).",
      "Copy the App ID, App Secret, and token from the bot settings.",
    ],
    requiredFields: [
      { field: "credentials.app_id", label: "App ID", placeholder: "10XXXXXXXXXX" },
      { field: "credentials.app_secret", label: "App Secret", placeholder: "your-app-secret", type: "password" },
    ],
    recommendedFields: [],
    defaultUrl: "https://qun.qq.com/",
  },
  {
    key: "bluebubbles",
    name: "BlueBubbles (iMessage)",
    icon: MessageCircle,
    tagline: "Bridge iMessage to Hermes via a BlueBubbles server on a Mac.",
    docsUrl: "https://hermes-agent.nousresearch.com/docs/user-guide/messaging/",
    instructions: [
      "Install BlueBubbles server on a Mac with iMessage configured (bluebubbles.app).",
      "Copy the server URL (e.g. http://your-mac:1234) and the password you set.",
      "Hermes connects to the BlueBubbles server API to send/receive iMessages.",
    ],
    requiredFields: [
      { field: "credentials.server_url", label: "BlueBubbles Server URL", placeholder: "http://your-mac:1234" },
      { field: "credentials.password", label: "Server Password", placeholder: "your-bb-password", type: "password" },
    ],
    recommendedFields: [],
    defaultUrl: "http://your-mac:1234",
  },
];

export default function Department() {
  const { name = "" } = useParams();
  const key = name.toLowerCase() as DepartmentKey;
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = (searchParams.get("tab") || "dashboard") as TabId;

  const isGlobalAdmin = user?.role === "admin" || user?.role === "owner";
  const accessQuery = useQuery({
    queryKey: ["my-access"],
    queryFn: () => authApi.myAccess(),
    staleTime: 30_000,
  });

  const isAssigned = useMemo(() => {
    if (isGlobalAdmin) return true;
    const assigned = accessQuery.data?.assigned_departments || [];
    return assigned.some(
      (a) => (a.department || "").toLowerCase() === key.toLowerCase(),
    );
  }, [isGlobalAdmin, accessQuery.data, key]);

  const isAdmin =
    user?.role === "admin" ||
    user?.role === "owner" ||
    user?.role === "department_admin";

  const tabs = useMemo(() => {
    if (isAdmin) return TABS;
    // Hide 'crons' tab from regular Department Users
    return TABS.filter((t) => t.id !== "crons");
  }, [isAdmin]);

  if (accessQuery.data && !isGlobalAdmin && !isAssigned) {
    return <Navigate to="/no-access" replace />;
  }

  const tab = tabs.some((t) => t.id === tabParam)
    ? tabParam
    : tabs[0]?.id || "dashboard";
  const queryClient = useQueryClient();

  const meta = DEPARTMENT_CATALOG[key];
  const deptQuery = useQuery({
    queryKey: ["department", key],
    queryFn: () => departmentsApi.get(key),
    enabled: !!meta,
  });

  const statusQuery = useQuery({
    queryKey: ["department-status", key],
    queryFn: () => departmentsApi.status(key),
    enabled: !!meta,
    refetchInterval: 30_000,
  });

  const department = deptQuery.data;
  const displayName =
    meta?.name ||
    (department?.name
      ? department.name.charAt(0).toUpperCase() + department.name.slice(1)
      : key);
  const persona = department?.persona || meta?.persona || "";
  const color = department?.color || meta?.color || "#6366f1";

  // Sub-tab state inside Settings tab
  const [settingsSubTab, setSettingsSubTab] = useState<"comms" | "provider" | "email-templates">(
    "comms",
  );

  const [config, setConfig] = useState<ProviderConfig>({});
  const [commsChannels, setCommsChannels] = useState<CommsChannelConfig[]>([]);

  // Add Channel Modal state
  const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] =
    useState<CommsChannelConfig["key"]>("telegram");
  const [newChannelName, setNewChannelName] = useState("");
  const [credentialFields, setCredentialFields] = useState<Record<string, string>>({});

  // Reset credential fields when platform changes
  useEffect(() => {
    setCredentialFields({});
  }, [selectedPlatform]);

  const configReady = useMemo(() => {
    if (department?.provider_config) {
      return department.provider_config;
    }
    return {};
  }, [department]);

  // Hydrate local forms when remote department configuration loads
  useEffect(() => {
    if (configReady) {
      setConfig(configReady);
      // Always reset channels — even to [] — so navigating away from a dept with channels
      // doesn't bleed its channels into another department's settings.
      setCommsChannels(
        Array.isArray(configReady.comms_channels)
          ? (configReady.comms_channels as CommsChannelConfig[])
          : [],
      );
    }
  }, [configReady]);

  const saveMutation = useMutation({
    mutationFn: (payload: ProviderConfig) =>
      departmentsApi.updateConfig(key, payload),
    onSuccess: async () => {
      toast.success("Settings saved");
      await queryClient.invalidateQueries({ queryKey: ["department", key] });
    },
    onError: (err: Error) => toast.error(err.message || "Save failed"),
  });

  const testMutation = useMutation({
    mutationFn: () =>
      departmentsApi.testConnection(key, {
        ...config,
        comms_channels: commsChannels,
      }),
    onSuccess: (res) => {
      if (res.ok) toast.success(res.message || "Connection OK");
      else toast.error(res.message || "Connection failed");
    },
    onError: (err: Error) => toast.error(err.message || "Test failed"),
  });

  // --- Comms channel test + discover (gap #1 + #3) ---
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);
  const [discoveringChannelId, setDiscoveringChannelId] = useState<string | null>(null);
  const [discoveredChats, setDiscoveredChats] = useState<
    Record<string, Array<{ id: string; title: string; type: string; username?: string; is_member?: boolean; num_members?: number }>>
  >({});
  const [showDiscoverPanel, setShowDiscoverPanel] = useState<string | null>(null);

  const testChannelMutation = useMutation({
    mutationFn: (channelId: string) => departmentsApi.testChannel(key, channelId),
    onMutate: (channelId) => setTestingChannelId(channelId),
    onSuccess: async (res) => {
      if (res.ok) {
        toast.success(`Bot verified: ${res.bot_username || res.bot_name || "connected"}`);
      } else {
        toast.error(res.error || "Bot token test failed");
      }
      // Update the local channel state with test results
      setCommsChannels((prev) =>
        prev.map((ch) =>
          ch.id === res.channel_id
            ? { ...ch, ...res.channel }
            : ch,
        ),
      );
      setTestingChannelId(null);
      await queryClient.invalidateQueries({ queryKey: ["department", key] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Test failed");
      setTestingChannelId(null);
    },
  });

  const discoverChatsMutation = useMutation({
    mutationFn: (channelId: string) => departmentsApi.discoverChats(key, channelId),
    onMutate: (channelId) => {
      setDiscoveringChannelId(channelId);
      setShowDiscoverPanel(channelId);
    },
    onSuccess: (res) => {
      if (res.ok && res.chats.length > 0) {
        setDiscoveredChats((prev) => ({ ...prev, [res.channel_id]: res.chats }));
        const sourceLabel = res.source === "state.db" ? " (from gateway)" : " (from Telegram API)";
        toast.success(`Found ${res.chats.length} chat(s)${sourceLabel}`);
      } else if (res.ok && res.chats.length === 0) {
        toast(
          res.note ||
            "No chats found. Send a message in the group first so the bot can see it.",
          { icon: "💭" },
        );
      } else {
        toast.error(res.error || "Discovery failed — test the connection first");
      }
      setDiscoveringChannelId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Discovery failed");
      setDiscoveringChannelId(null);
    },
  });

  // --- Staff data for coverage indicator (gap #4) ---
  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: () => staffApi.list(),
    enabled: isAdmin,
  });

  const assignedStaff = useMemo(() => {
    if (!staffData?.staff) return [];
    return staffData.staff.filter((s) =>
      s.assignments?.some((a) => a.department_name?.toLowerCase() === key.toLowerCase()),
    );
  }, [staffData, key]);

  const getStaffCoverage = (platformKey: CommsChannelConfig["key"]) => {
    if (!assignedStaff.length) return { matched: 0, total: 0 };
    const idField =
      platformKey === "telegram"
        ? "telegram_user_id"
        : platformKey === "slack"
          ? "slack_user_id"
          : null;
    if (!idField) return { matched: 0, total: assignedStaff.length };
    const matched = assignedStaff.filter(
      (s) => (s as unknown as Record<string, unknown>)[idField],
    ).length;
    return { matched, total: assignedStaff.length };
  };

  // --- Cron + skills data for bot activity panel (gap #5) ---
  const { data: cronData } = useQuery({
    queryKey: ["department-crons", key],
    queryFn: () => departmentsApi.getCrons(key),
    enabled: commsChannels.length > 0,
  });
  const { data: skillsData } = useQuery({
    queryKey: ["department-skills", key],
    queryFn: () => skillsApi.listDepartment(key),
    enabled: commsChannels.length > 0,
  });

  const activeCrons = useMemo(() => {
    if (!cronData?.crons) return [];
    return cronData.crons.filter((c) => c.enabled !== false);
  }, [cronData]);
  const activeSkills = useMemo(() => {
    if (!skillsData?.skills) return [];
    return skillsData.skills;
  }, [skillsData]);

  if (!meta && !deptQuery.isLoading) {
    return (
      <div className="sd-empty" style={{ marginTop: "2rem" }}>
        <h2>Department not found</h2>
        <p style={{ color: "var(--samurai-muted)" }}>
          “{name}” is not a known department.
        </p>
        <Link
          to="/dashboard"
          className="sd-btn sd-btn-primary"
          style={{ marginTop: "0.75rem" }}
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...config, comms_channels: commsChannels });
  };

  const handleUpdateChannel = (
    index: number,
    field: keyof CommsChannelConfig,
    value: unknown,
  ) => {
    setCommsChannels((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      saveMutation.mutate({ ...config, comms_channels: next });
      return next;
    });
  };

  const handleDeleteChannel = (index: number) => {
    const updated = commsChannels.filter((_, i) => i !== index);
    setCommsChannels(updated);
    saveMutation.mutate({ ...config, comms_channels: updated });
    toast.success("Channel connection removed");
  };

  const handleAddChannelSubmit = (e: FormEvent) => {
    e.preventDefault();
    const platformObj = PLATFORM_OPTIONS.find(
      (p) => p.key === selectedPlatform,
    );
    const channelName =
      newChannelName.trim() ||
      `${platformObj?.name || selectedPlatform} Channel`;

    // Build the channel object from dynamic credential fields.
    // Fields starting with "credentials." go into the credentials bag;
    // top-level fields (bot_token, webhook_url, allowed_users) are promoted.
    const credentials: Record<string, string> = {};
    let botToken = "";
    let webhookUrl = "";
    let allowedUsers = "";

    for (const [field, value] of Object.entries(credentialFields)) {
      const v = value.trim();
      if (!v) continue;
      if (field.startsWith("credentials.")) {
        credentials[field.slice("credentials.".length)] = v;
      } else if (field === "bot_token") {
        botToken = v;
      } else if (field === "webhook_url") {
        webhookUrl = v;
      } else if (field === "allowed_users") {
        allowedUsers = v;
      } else {
        credentials[field] = v;
      }
    }

    const newChannel: CommsChannelConfig = {
      id: `ch-${selectedPlatform}-${Date.now()}`,
      key: selectedPlatform,
      name: channelName,
      enabled: true,
      join_url: platformObj?.defaultUrl,
      bot_token: botToken || undefined,
      webhook_url: webhookUrl || undefined,
      allowed_users: allowedUsers || undefined,
      credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
      status: "configured",
    };

    const updatedChannels = [...commsChannels, newChannel];
    setCommsChannels(updatedChannels);
    saveMutation.mutate({ ...config, comms_channels: updatedChannels });

    setIsAddChannelModalOpen(false);
    setNewChannelName("");
    setCredentialFields({});

    toast.success(`Added ${channelName}`);
  };

  return (
    <div className="flex w-full h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 space-y-4">
        {deptQuery.isLoading && (
          <div className="sd-empty">
            <div
              className="h-7 w-7 animate-spin rounded-full"
              style={{
                border: "2px solid var(--samurai-lime)",
                borderTopColor: "transparent",
              }}
            />
            <p>Loading department…</p>
          </div>
        )}

        {!deptQuery.isLoading && tab === "dashboard" && (
          <DashboardViewer department={key} color={color} />
        )}
        {!deptQuery.isLoading && tab === "connectors" && (
          <DepartmentConnectors department={key} />
        )}
        {!deptQuery.isLoading && tab === "skills" && (
          <DepartmentSkills department={key} />
        )}
        {!deptQuery.isLoading && tab === "crons" && (
          <DepartmentCrons department={key} />
        )}
        {!deptQuery.isLoading && (tab === "chat-history" || tab === "chat") && (
          <ChatHistory department={key} />
        )}
        {!deptQuery.isLoading && tab === "brain" && (
          <BrainViewer department={key} />
        )}
        {!deptQuery.isLoading && tab === "settings" && (
          <div className="max-w-4xl space-y-6 text-slate-900 dark:text-white p-2">
            {/* Sub-Tab Navigation Bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-3">
              <button
                type="button"
                onClick={() => setSettingsSubTab("comms")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  settingsSubTab === "comms"
                    ? "bg-brand text-white shadow-md shadow-brand/20"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Radio className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Department Communication Channels ({commsChannels.length})
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("email-templates")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  settingsSubTab === "email-templates"
                    ? "bg-brand text-white shadow-md shadow-brand/20"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Email Templates
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("provider")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  settingsSubTab === "provider"
                    ? "bg-brand text-white shadow-md shadow-brand/20"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Settings className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {displayName} Provider Configuration
              </button>
            </div>

            {/* SUB-TAB 1: Department Communication Channels */}
            {settingsSubTab === "comms" && (
              <div className="space-y-6">
                {/* Header with Add Button */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Radio className="h-5 w-5 text-brand" />
                      Department Communication Channels
                    </h2>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                      {isAdmin
                        ? `Choose a messaging platform for ${displayName}. Add the channel and configure the bot token — staff will automatically follow this setup.`
                        : `Messaging platform connections configured for ${displayName}. Staff use the channels set by the department admin.`}
                    </p>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsAddChannelModalOpen(true)}
                      className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-brand-hover transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Add Channel Connection
                    </button>
                  )}
                </div>

                {/* Empty State when no channels added */}
                {commsChannels.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 text-center">
                    <Radio className="mx-auto h-10 w-10 text-slate-500 mb-3" />
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      No communication channels connected
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                      {isAdmin
                        ? 'Choose a platform above to connect Slack, Telegram, WhatsApp, Microsoft Teams, and more for this department. Staff will automatically follow this setup.'
                        : "No messaging channels are configured for this department yet. Only admins can add channels."}
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsAddChannelModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:bg-slate-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add First Channel Connection
                      </button>
                    )}
                  </div>
                )}

                {/* Grid of Permanent Active Channel Cards */}
                {commsChannels.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-1">
                    {commsChannels.map((ch, idx) => {
                      const platformInfo = PLATFORM_OPTIONS.find(
                        (p) => p.key === ch.key,
                      );
                      const IconComp = platformInfo?.icon || MessageSquare;

                      return (
                        <div
                          key={ch.id || `channel-${idx}`}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 space-y-4 shadow-xl"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-brand border border-slate-300 dark:border-slate-700 shadow-inner">
                                <IconComp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white text-base">
                                    {ch.name}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                    ({ch.key})
                                  </span>
                                  {/* Real status badge from live test */}
                                  {ch.last_test_status === "ok" && (
                                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Connected
                                    </span>
                                  )}
                                  {ch.last_test_status === "error" && (
                                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30 flex items-center gap-1">
                                      <XCircle className="h-3 w-3" />
                                      Error
                                    </span>
                                  )}
                                  {(!ch.last_test_status || ch.last_test_status === "untested") && ch.enabled && (
                                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Untested
                                    </span>
                                  )}
                                  {!ch.enabled && (
                                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700">
                                      Disabled
                                    </span>
                                  )}
                                </div>
                                {/* Bot identity from test result */}
                                {ch.bot_username && (
                                  <div className="text-xs text-emerald-700 dark:text-emerald-300/80 font-mono mt-0.5">
                                    @{ch.bot_username}
                                  </div>
                                )}
                                {ch.channel_id && !ch.bot_username && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                    ID: {ch.channel_id}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions & Join Button */}
                            <div className="flex items-center gap-2">
                              {/* One-Click Join Channel Link Button */}
                              {ch.join_url && (
                                <a
                                  href={ch.join_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl bg-brand/20 px-4 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white border border-brand/30 transition-all shadow-sm"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Join Channel
                                </a>
                              )}

                              {/* Test Connection button (admin only) */}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => ch.id && testChannelMutation.mutate(ch.id)}
                                  disabled={testingChannelId === ch.id}
                                  title="Test bot token"
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-700 transition-colors"
                                >
                                  {testingChannelId === ch.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  )}
                                  Test
                                </button>
                              )}

                              {/* Toggle & Delete for Admins */}
                              {isAdmin && (
                                <>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={ch.enabled}
                                      onChange={(e) =>
                                        handleUpdateChannel(
                                          idx,
                                          "enabled",
                                          e.target.checked,
                                        )
                                      }
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteChannel(idx)}
                                    title="Delete Channel Connection"
                                    className="rounded-xl bg-slate-100 dark:bg-slate-800/80 p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Last error display */}
                          {ch.last_error && ch.last_test_status === "error" && (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-200 flex gap-2">
                              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">Last error:</span>{" "}
                                {ch.last_error}
                                {ch.last_tested_at && (
                                  <span className="text-red-500/60 dark:text-red-300/60 ml-2">
                                    {new Date(ch.last_tested_at).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Staff coverage indicator (gap #4) */}
                          {isAdmin && (() => {
                            const cov = getStaffCoverage(ch.key);
                            if (cov.total === 0) return null;
                            const pct = cov.total > 0 ? Math.round((cov.matched / cov.total) * 100) : 0;
                            return (
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 p-2.5 text-xs">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                    <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                    Staff Identity Coverage
                                  </span>
                                  <span className={`font-semibold ${pct === 100 ? "text-emerald-700 dark:text-emerald-300" : pct > 0 ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300"}`}>
                                    {cov.matched}/{cov.total}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                {pct < 100 && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                    {cov.total - cov.matched} staff member(s) missing their {ch.key} ID —
                                    add it in Staff Management so the bot can recognize them.
                                  </p>
                                )}
                              </div>
                            );
                          })()}

                          {/* Admin Editable Fields */}
                          {isAdmin ? (
                            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                              {/* Platform tagline */}
                              {platformInfo?.tagline && (
                                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-200 flex gap-2">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                  <span>{platformInfo.tagline}</span>
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    One-Click Join Link (Public/Team Join URL)
                                  </label>
                                  <input
                                    value={ch.join_url || ""}
                                    onChange={(e) =>
                                      handleUpdateChannel(
                                        idx,
                                        "join_url",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="https://..."
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    {platformInfo?.requiredFields?.[0]?.label || "Bot Token"}
                                  </label>
                                  <input
                                    type="password"
                                    value={ch.bot_token || ""}
                                    onChange={(e) =>
                                      handleUpdateChannel(
                                        idx,
                                        "bot_token",
                                        e.target.value,
                                      )
                                    }
                                    placeholder={platformInfo?.requiredFields?.[0]?.placeholder || ""}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                    Channel ID / Handle
                                  </label>
                                  <div className="flex gap-1.5">
                                    <input
                                      value={ch.channel_id || ""}
                                      onChange={(e) =>
                                        handleUpdateChannel(
                                          idx,
                                          "channel_id",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="e.g. C0123456789 or @dept_alerts"
                                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                                    />
                                    {/* Discover Chat ID button (gap #3) */}
                                    <button
                                      type="button"
                                      onClick={() => ch.id && discoverChatsMutation.mutate(ch.id)}
                                      disabled={discoveringChannelId === ch.id}
                                      title="Discover chat IDs from platform"
                                      className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg bg-indigo-500/20 px-2.5 py-2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-all"
                                    >
                                      {discoveringChannelId === ch.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Search className="h-3.5 w-3.5" />
                                      )}
                                      Discover
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Discovered chats panel */}
                              {showDiscoverPanel === ch.id && discoveredChats[ch.id] && (
                                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
                                      <Search className="h-3.5 w-3.5" />
                                      Discovered Chats ({discoveredChats[ch.id].length})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setShowDiscoverPanel(null)}
                                      className="text-slate-500 dark:text-slate-400 dark:hover:text-white text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <div className="max-h-40 overflow-y-auto space-y-1">
                                    {discoveredChats[ch.id].map((chat) => (
                                      <button
                                        key={chat.id}
                                        type="button"
                                        onClick={() => {
                                          handleUpdateChannel(idx, "channel_id", chat.id);
                                          setShowDiscoverPanel(null);
                                          toast.success(`Channel ID set to: ${chat.title}`);
                                        }}
                                        className="w-full text-left rounded-md bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:bg-slate-700 px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between gap-2"
                                      >
                                        <div className="min-w-0">
                                          <span className="text-slate-900 dark:text-white font-medium truncate">{chat.title}</span>
                                          <span className="text-slate-500 dark:text-slate-400 ml-2 capitalize">({chat.type})</span>
                                        </div>
                                        <span className="font-mono text-indigo-600 dark:text-indigo-300 text-[10px] flex-shrink-0">{chat.id}</span>
                                      </button>
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                                    Click a chat to auto-fill the Channel ID field. This ID is where the bot posts scheduled messages and alerts.
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Staff Read-Only View */
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
                              <div className="flex flex-wrap gap-4 text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  {ch.last_test_status === "ok" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : ch.last_test_status === "error" ? (
                                    <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                                  ) : (
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  )}
                                  {ch.last_test_status === "ok"
                                    ? `Connected${ch.bot_username ? ` as @${ch.bot_username}` : ""}`
                                    : ch.last_test_status === "error"
                                      ? "Connection error"
                                      : "Not tested yet"}
                                </span>
                                {ch.channel_id && (
                                  <span className="font-mono text-slate-600 dark:text-slate-500">
                                    ID: {ch.channel_id}
                                  </span>
                                )}
                              </div>
                              {platformInfo?.tagline && (
                                <p className="text-slate-600 dark:text-slate-500 text-[11px] leading-relaxed">
                                  {platformInfo.tagline}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bot Activity Panel — what this bot actually does (gap #5) */}
                {commsChannels.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <Activity className="h-4 w-4 text-brand" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bot Activity</h3>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        What this department's bot does in the connected channels
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Scheduled messages (crons) */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          Scheduled Messages
                          <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-400">
                            {activeCrons.length} active
                          </span>
                        </div>
                        {activeCrons.length === 0 ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                            No scheduled jobs. The bot waits for staff to ask questions —
                            it won't post anything proactively.
                          </p>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {activeCrons.slice(0, 8).map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800/50 px-2 py-1.5 text-[11px]"
                              >
                                <span className="font-mono text-amber-600 dark:text-amber-300/80 flex-shrink-0">
                                  {c.schedule}
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 truncate">{c.name}</span>
                              </div>
                            ))}
                            {activeCrons.length > 8 && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-2">
                                +{activeCrons.length - 8} more…
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Available skills */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          Bot Skills
                          <span className="ml-auto text-[10px] text-slate-500 dark:text-slate-400">
                            {activeSkills.length} loaded
                          </span>
                        </div>
                        {activeSkills.length === 0 ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                            No skills installed. The bot can chat but can't run
                            department-specific workflows.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                            {activeSkills.slice(0, 20).map((s) => (
                              <span
                                key={s.id || s.name}
                                className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-600 dark:text-indigo-300"
                              >
                                {s.name}
                              </span>
                            ))}
                            {activeSkills.length > 20 && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 px-1 py-0.5">
                                +{activeSkills.length - 20} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Setup checklist */}
                    {isAdmin && (
                      <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-1.5">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Setup Checklist
                        </p>
                        {[
                          {
                            label: "Bot token tested",
                            done: commsChannels.some((c) => c.last_test_status === "ok"),
                          },
                          {
                            label: "Channel ID discovered",
                            done: commsChannels.some((c) => c.channel_id),
                          },
                          {
                            label: "Staff have platform IDs",
                            done: commsChannels.some((c) => {
                              const cov = getStaffCoverage(c.key);
                              return cov.total > 0 && cov.matched === cov.total;
                            }),
                          },
                          {
                            label: "Scheduled jobs configured",
                            done: activeCrons.length > 0,
                          },
                          {
                            label: "Skills installed",
                            done: activeSkills.length > 0,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            {item.done ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-400 dark:border-slate-600 flex-shrink-0" />
                            )}
                            <span className={item.done ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Save Comms Button for Admins */}
                {isAdmin && commsChannels.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={onSave}
                      disabled={saveMutation.isPending}
                      className="btn-primary"
                    >
                      {saveMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Save Channel Settings
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: Email Templates */}
            {settingsSubTab === "email-templates" && (
              <EmailTemplatesManager department={key} isAdmin={!!isAdmin} />
            )}

            {/* SUB-TAB 3: Provider Configuration */}
            {settingsSubTab === "provider" && (
              <form className="space-y-6" onSubmit={onSave}>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                      {displayName} Provider Configuration
                    </h2>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                      Credentials, API keys, and gateways for {displayName}{" "}
                      agent integrations.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                    <Settings className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Integration Settings
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 pt-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Provider Name
                    </label>
                    <input
                      disabled={!isAdmin}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:border-brand focus:outline-none disabled:opacity-60"
                      value={config.provider || ""}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, provider: e.target.value }))
                      }
                      placeholder="e.g. Bukku / Stripe / SAP Ariba"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Subdomain
                    </label>
                    <input
                      disabled={!isAdmin}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:border-brand focus:outline-none disabled:opacity-60"
                      value={config.subdomain || ""}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, subdomain: e.target.value }))
                      }
                      placeholder="organization"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Base URL
                    </label>
                    <input
                      disabled={!isAdmin}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:border-brand focus:outline-none disabled:opacity-60"
                      value={config.base_url || ""}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, base_url: e.target.value }))
                      }
                      placeholder="https://api.provider.com/v1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      API Key / Secret Token
                    </label>
                    <input
                      disabled={!isAdmin}
                      type="password"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:border-brand focus:outline-none font-mono disabled:opacity-60"
                      value={config.api_key || ""}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, api_key: e.target.value }))
                      }
                      placeholder="••••••••••••••••••••••••••••"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700/60 pt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    Live Gateway & Agent Status
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <StatusBadge
                      status={
                        statusQuery.data?.gateway_status ||
                        department?.gateway_status
                      }
                      label={`Gateway · ${statusQuery.data?.gateway_status || department?.gateway_status || "unknown"}`}
                    />
                    <StatusBadge
                      status={
                        statusQuery.data?.provider_status ||
                        department?.provider_status
                      }
                      label={`Provider · ${statusQuery.data?.provider_status || department?.provider_status || "unknown"}`}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/60">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Save Settings
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={testMutation.isPending}
                      onClick={() => testMutation.mutate()}
                    >
                      {testMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Test connection
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </div>

      {/* Add Channel Connection Modal — two-column, Hermes-style setup */}
      {isAddChannelModalOpen && (() => {
        const platform = PLATFORM_OPTIONS.find((p) => p.key === selectedPlatform);
        if (!platform) return null;
        const IconComp = platform.icon;

        const renderField = (f: PlatformField) => (
          <div key={f.field}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              {f.label}
            </label>
            <input
              type={f.type === "password" ? "password" : "text"}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:border-brand focus:outline-none font-mono"
              value={credentialFields[f.field] || ""}
              onChange={(e) =>
                setCredentialFields((prev) => ({ ...prev, [f.field]: e.target.value }))
              }
              placeholder={f.placeholder}
            />
            {f.hint && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{f.hint}</p>
            )}
          </div>
        );

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-slate-900 dark:text-white">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="h-5 w-5 text-brand" />
                Add Channel Connection
              </h3>
              <button
                onClick={() => setIsAddChannelModalOpen(false)}
                className="text-slate-500 dark:text-slate-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleAddChannelSubmit}
              className="flex flex-1 min-h-0"
            >
              {/* LEFT: Platform list */}
              <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="px-4 pt-4 pb-2 flex-shrink-0">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Select Platform
                  </label>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                  {PLATFORM_OPTIONS.map((p) => {
                    const PIcon = p.icon;
                    const isSelected = selectedPlatform === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setSelectedPlatform(p.key)}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all w-full ${
                          isSelected
                            ? "border-brand bg-brand/10 text-slate-900 dark:text-white font-semibold shadow-md"
                            : "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        <PIcon
                          className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-brand" : "text-slate-500 dark:text-slate-400"}`}
                        />
                        <span className="text-xs truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Detail form — Hermes-style setup */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {/* Platform header + tagline */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                      <IconComp className="h-5 w-5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{platform.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{platform.tagline}</div>
                    </div>
                  </div>

                  {/* GET YOUR CREDENTIALS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Get your credentials
                      </h4>
                      <a
                        href={platform.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-hover"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open setup guide
                      </a>
                    </div>
                    <ol className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-decimal list-inside">
                      {platform.instructions.map((step, i) => (
                        <li key={i} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Channel Name */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Channel Name / Display Identifier
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:border-brand focus:outline-none"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder={`e.g. ${displayName} ${platform.name} Channel`}
                    />
                  </div>

                  {/* REQUIRED fields */}
                  {platform.requiredFields.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Required
                      </h4>
                      {platform.requiredFields.map(renderField)}
                    </div>
                  )}

                  {/* RECOMMENDED fields */}
                  {platform.recommendedFields.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Recommended
                      </h4>
                      {platform.recommendedFields.map(renderField)}
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddChannelModalOpen(false)}
                    className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover shadow-lg"
                  >
                    Add Connection
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Resizable Fixed Right Dock Chat */}
      <RightChatDock
        department={key}
        displayName={displayName}
        persona={persona}
        color={color}
      />
    </div>
  );
}
