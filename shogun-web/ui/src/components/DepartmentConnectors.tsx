import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  CheckCircle2,
  Loader2,
  BookOpen,
  DollarSign,
  FileText,
  CreditCard,
  Database,
  Plug,
  Users,
  UserCheck,
  Briefcase,
  Smartphone,
  Globe,
  Handshake,
  Package,
  ShoppingCart,
  Layers,
  Truck,
  X,
  Pencil,
  ExternalLink,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { connectorsApi } from "../lib/api";
import type { Connector, ConnectorField } from "../lib/types";

interface DepartmentConnectorsProps {
  department: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  DollarSign,
  FileText,
  CreditCard,
  Database,
  Users,
  UserCheck,
  Briefcase,
  Smartphone,
  Globe,
  Handshake,
  Package,
  ShoppingCart,
  Layers,
  Truck,
  Plug,
};

function getIcon(name: string) {
  return ICON_MAP[name] ?? Plug;
}

/** Extract the bare key name from a "credentials.xxx" field path. */
function credKey(field: string): string {
  return field.startsWith("credentials.") ? field.slice("credentials.".length) : field;
}

export default function DepartmentConnectors({
  department,
}: DepartmentConnectorsProps) {
  const queryClient = useQueryClient();
  const [modalConnector, setModalConnector] = useState<Connector | null>(null);

  const connectorsQuery = useQuery({
    queryKey: ["department-connectors", department],
    queryFn: async () => {
      const res = await connectorsApi.list(department);
      return res.connectors;
    },
  });

  const connectors: Connector[] = connectorsQuery.data || [];

  // Direct connect mutation (for reconnect with saved credentials — no modal)
  const directConnectMut = useMutation({
    mutationFn: (connId: string) => connectorsApi.connect(department, connId),
    onSuccess: () => {
      toast.success("Reconnected successfully!");
      queryClient.invalidateQueries({ queryKey: ["department-connectors", department] });
    },
    onError: () => toast.error("Failed to reconnect"),
  });

  // Disconnect mutation
  const disconnectMut = useMutation({
    mutationFn: (connId: string) => connectorsApi.disconnect(department, connId),
    onSuccess: () => {
      toast.success("Disconnected. Credentials saved for next time.");
      queryClient.invalidateQueries({ queryKey: ["department-connectors", department] });
    },
    onError: () => toast.error("Failed to disconnect"),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
            {department} Integrations & Connectors
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
            Connect external software, payment gateways, and ERP tools to feed
            live operational data into {department} AI agent.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
          <Plug className="h-4 w-4" />
          {connectors.filter((c) => c.status === "connected").length} Connected
          Software
        </div>
      </div>

      {connectorsQuery.isLoading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : connectors.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Plug className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-300 mb-2" />
          <p className="text-sm font-medium">
            No software connectors configured for {department} yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {connectors.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onConnectClick={() => setModalConnector(connector)}
              onReconnect={() => directConnectMut.mutate(connector.id)}
              onDisconnect={() => disconnectMut.mutate(connector.id)}
              isReconnecting={directConnectMut.isPending}
              isDisconnecting={disconnectMut.isPending}
            />
          ))}
        </div>
      )}

      {modalConnector && (
        <ConnectModal
          connector={modalConnector}
          department={department}
          onClose={() => setModalConnector(null)}
          onConnected={() => {
            setModalConnector(null);
            queryClient.invalidateQueries({ queryKey: ["department-connectors", department] });
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConnectorCard — 3 visual states
// ---------------------------------------------------------------------------

interface CardProps {
  connector: Connector;
  onConnectClick: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
  isReconnecting: boolean;
  isDisconnecting: boolean;
}

function ConnectorCard({
  connector,
  onConnectClick,
  onReconnect,
  onDisconnect,
  isReconnecting,
  isDisconnecting,
}: CardProps) {
  const IconComp = getIcon(connector.logo_icon);
  const isConnected = connector.status === "connected";

  // Does the connector have saved credentials?
  const hasSavedCreds =
    connector.credentials && Object.values(connector.credentials).some((v) => v && v.length > 0);

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border p-5 transition shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
        isConnected
          ? "border-emerald-300 dark:border-emerald-500/50 ring-1 ring-emerald-300/40"
          : hasSavedCreds
            ? "border-amber-300 dark:border-amber-500/40 ring-1 ring-amber-300/30"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${
                isConnected
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  : hasSavedCreds
                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              <IconComp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {connector.name}
              </h3>
              <span className="text-[11px] font-medium text-slate-400">
                {connector.category}
              </span>
            </div>
          </div>
          {isConnected && (
            <button
              onClick={onConnectClick}
              title="Edit credentials"
              className="text-slate-400 hover:text-brand transition"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {connector.description}
        </p>

        {connector.config_summary && isConnected && (
          <div className="rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">
            {connector.config_summary}
          </div>
        )}

        {hasSavedCreds && !isConnected && (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Credentials saved — ready to reconnect
          </div>
        )}
        {!hasSavedCreds && !isConnected && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <KeyRound className="h-3.5 w-3.5" />
            Credentials required
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        {isConnected ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Connected
          </span>
        ) : hasSavedCreds ? (
          <span className="text-xs text-amber-600 font-medium">Disconnected</span>
        ) : (
          <span className="text-xs text-slate-400">Not connected</span>
        )}

        {isConnected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Disconnecting...
              </>
            ) : (
              "Disconnect"
            )}
          </button>
        ) : hasSavedCreds ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onConnectClick}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-brand transition"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={onReconnect}
              disabled={isReconnecting}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition bg-brand text-white hover:bg-brand/90"
            >
              {isReconnecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5" />
                  Reconnect
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConnectClick}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition bg-brand text-white hover:bg-brand/90"
          >
            <Link2 className="h-3.5 w-3.5" />
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConnectModal — 3-section credential form (mirrors comms-channels pattern)
// ---------------------------------------------------------------------------

interface ConnectModalProps {
  connector: Connector;
  department: string;
  onClose: () => void;
  onConnected: () => void;
}

function ConnectModal({ connector, department, onClose, onConnected }: ConnectModalProps) {
  const queryClient = useQueryClient();
  const [credentialFields, setCredentialFields] = useState<Record<string, string>>({});

  // Reset fields when connector changes
  useEffect(() => {
    const init: Record<string, string> = {};
    // Pre-fill with masked saved credentials (so user sees *** and can update)
    const allFields = [
      ...(connector.required_fields || []),
      ...(connector.recommended_fields || []),
    ];
    for (const f of allFields) {
      const key = credKey(f.field);
      const saved = connector.credentials?.[key];
      init[f.field] = saved ? saved : "";
    }
    setCredentialFields(init);
  }, [connector]);

  const connectMut = useMutation({
    mutationFn: (creds: Record<string, string>) =>
      connectorsApi.connect(department, connector.id, creds),
    onSuccess: () => {
      toast.success(`Connected to ${connector.name} successfully!`);
      queryClient.invalidateQueries({ queryKey: ["department-connectors", department] });
      onConnected();
    },
    onError: (err: unknown) => {
      // If it's a "credentials_required" error, the user didn't fill in fields
      const msg = err instanceof Error ? err.message : "Failed to connect";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Build credentials dict from the field paths
    const creds: Record<string, string> = {};
    for (const [fieldPath, value] of Object.entries(credentialFields)) {
      const key = credKey(fieldPath);
      // Only send non-empty values (skip "***" — backend will preserve)
      if (value && value !== "***") {
        creds[key] = value;
      } else if (value === "***") {
        // Send *** so backend preserves the existing value
        creds[key] = "***";
      }
    }
    connectMut.mutate(creds);
  };

  const renderField = (f: ConnectorField) => {
    const value = credentialFields[f.field] || "";
    return (
      <div key={f.field} className="space-y-1">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {f.label}
        </label>
        <input
          type={f.type === "password" ? "password" : "text"}
          value={value}
          onChange={(e) =>
            setCredentialFields((prev) => ({ ...prev, [f.field]: e.target.value }))
          }
          placeholder={f.placeholder}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand outline-none"
        />
        {f.hint && (
          <p className="text-[11px] text-slate-400">{f.hint}</p>
        )}
      </div>
    );
  };

  const requiredFields = connector.required_fields || [];
  const recommendedFields = connector.recommended_fields || [];
  const instructions = connector.instructions || [];
  const hasSavedCreds =
    connector.credentials && Object.values(connector.credentials).some((v) => v && v.length > 0);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {(() => {
              const IconComp = getIcon(connector.logo_icon);
              return <IconComp className="h-6 w-6 text-brand" />;
            })()}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {hasSavedCreds ? "Edit Credentials" : "Connect to"} {connector.name}
              </h3>
              <p className="text-xs text-slate-400">{connector.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* GET YOUR CREDENTIALS */}
            {instructions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Get Your Credentials
                  </h4>
                  {connector.docs_url && (
                    <a
                      href={connector.docs_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                    >
                      Open setup guide
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* REQUIRED */}
            {requiredFields.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-rose-500 dark:text-rose-400">
                  Required
                </h4>
                {requiredFields.map(renderField)}
              </div>
            )}

            {/* RECOMMENDED */}
            {recommendedFields.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Recommended
                </h4>
                {recommendedFields.map(renderField)}
              </div>
            )}

            {hasSavedCreds && (
              <p className="text-[11px] text-slate-400 italic">
                Fields show <span className="font-mono">••••</span> for saved secrets. Leave as-is to keep existing, or type a new value to update.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={connectMut.isPending}
              className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 transition disabled:opacity-50"
            >
              {connectMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  {hasSavedCreds ? "Update & Connect" : "Connect"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
