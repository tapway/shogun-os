import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { HrDashboardStats, HrMeeting, HrMeetingActionItem, HrMeetingAttendee } from "../../../lib/types";

interface Props {
  stats: HrDashboardStats;
  color: string;
}

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const OK = "var(--samurai-ok)";
const WARN = "var(--samurai-warning)";
const DANGER = "var(--samurai-danger)";
const SURFACE_2 = "var(--samurai-surface-2)";

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function statusStyle(status: string | null | undefined): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  if (s.includes("done") || s.includes("complete") || s.includes("closed")) return "ok";
  if (s.includes("progress") || s.includes("ongoing") || s.includes("open") || s.includes("scheduled")) return "warn";
  if (s.includes("cancel") || s.includes("overdue") || s.includes("absent")) return "bad";
  return "muted";
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", fontSize: "0.72rem", fontWeight: 500, color: MUTED, paddingBottom: "0.5rem" }}>{children}</th>;
}

export function MeetingsTab({ stats, color }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const meetings = stats.meetings ?? [];
  const actionItems = stats.meeting_action_items ?? [];
  const attendees = stats.meeting_attendees ?? [];

  const query = search.trim().toLowerCase();

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m: HrMeeting) => {
      if (statusFilter && m.meeting_status !== statusFilter) return false;
      if (!query) return true;
      return (
        (m.meeting_title || "").toLowerCase().includes(query) ||
        (m.meeting_organizer || "").toLowerCase().includes(query) ||
        (m.meeting_type || "").toLowerCase().includes(query)
      );
    });
  }, [meetings, query, statusFilter]);

  const filteredActions = useMemo(() => {
    return actionItems.filter((a: HrMeetingActionItem) => {
      if (!query) return true;
      return (
        (a.action_description || "").toLowerCase().includes(query) ||
        (a.action_owner || "").toLowerCase().includes(query) ||
        (a.action_id || "").toLowerCase().includes(query)
      );
    });
  }, [actionItems, query]);

  const filteredAttendees = useMemo(() => {
    return attendees.filter((a: HrMeetingAttendee) => {
      if (!query) return true;
      return (
        (a.name || "").toLowerCase().includes(query) ||
        (a.department || "").toLowerCase().includes(query) ||
        (a.email || "").toLowerCase().includes(query)
      );
    });
  }, [attendees, query]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    meetings.forEach((m) => m.meeting_status && set.add(m.meeting_status));
    return [...set];
  }, [meetings]);

  const kpis = [
    { label: "Total Meetings", value: meetings.length, warn: false },
    { label: "Open Action Items", value: actionItems.filter((a: HrMeetingActionItem) => ["Open", "In progress", "Not Started"].includes(a.status)).length, warn: actionItems.length > 0 },
    { label: "Attendees Tracked", value: attendees.length, warn: false },
  ];

  return (
    <div className="sd-stack">
      {/* KPI grid */}
      <div className="sd-kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{k.label}</div>
            <div className="sd-kpi-value" style={{ color: k.warn ? WARN : TEXT }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Search + status filter */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "16rem" }}>
          <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", width: "1rem", height: "1rem", color: MUTED }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meetings, action items, attendees…"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem 0.5rem 2.25rem",
              fontSize: "0.85rem",
              background: SURFACE_2,
              border: "1px solid var(--samurai-border)",
              borderRadius: 8,
              color: TEXT,
              outline: "none",
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "0.85rem",
            background: SURFACE_2,
            border: "1px solid var(--samurai-border)",
            borderRadius: 8,
            color: TEXT,
            outline: "none",
          }}
        >
          <option value="">All Statuses</option>
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Meetings */}
      <div className="sd-chart-card">
        <div className="sd-chart-title">Meeting Minutes</div>
        <div className="sd-chart-sub">{filteredMeetings.length} of {meetings.length} meetings</div>
        {filteredMeetings.length === 0 ? (
          <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>
            No meetings match the current filters.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--samurai-border)" }}>
                <Th>Meeting</Th>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Organizer</Th>
                <Th>Duration</Th>
                <Th>Follow-up</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filteredMeetings.map((m: HrMeeting) => (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--samurai-border)" }}>
                  <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{m.meeting_title || "—"}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{fmtDate(m.meeting_date)}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{m.meeting_type || "—"}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{m.meeting_organizer || "—"}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{m.meeting_duration != null ? `${m.meeting_duration}h` : "—"}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{fmtDate(m.follow_up_date)}</td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>
                    <span className={`sd-chip ${statusStyle(m.meeting_status)}`}>{m.meeting_status || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(22rem, 1fr))", gap: "1rem" }}>
        {/* Action items */}
        <div className="sd-chart-card">
          <div className="sd-chart-title">Action Items</div>
          <div className="sd-chart-sub">
            {actionItems.filter((a: HrMeetingActionItem) => ["Open", "In progress", "Not Started"].includes(a.status)).length} open of {actionItems.length}
          </div>
          {filteredActions.length === 0 ? (
            <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>No action items.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--samurai-border)" }}>
                  <Th>ID</Th>
                  <Th>Description</Th>
                  <Th>Owner</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {filteredActions.map((a: HrMeetingActionItem) => {
                  const overdue = a.due_date && new Date(a.due_date) < new Date() && ["Open", "In progress", "Not Started"].includes(a.status);
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--samurai-border)", background: overdue ? `color-mix(in srgb, ${DANGER} 8%, transparent)` : undefined }}>
                      <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{a.action_id || "—"}</td>
                      <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{a.action_description || "—"}</td>
                      <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{a.action_owner || "—"}</td>
                      <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: overdue ? DANGER : TEXT, fontWeight: overdue ? 600 : 400 }}>{fmtDate(a.due_date)}</td>
                      <td style={{ padding: "0.6rem 0.5rem" }}>
                        <span className={`sd-chip ${statusStyle(a.status)}`}>{a.status || "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Attendees */}
        <div className="sd-chart-card">
          <div className="sd-chart-title">Attendees & Absentees</div>
          <div className="sd-chart-sub">{attendees.length} tracked</div>
          {filteredAttendees.length === 0 ? (
            <p style={{ padding: "1rem 0", textAlign: "center", fontSize: "0.85rem", color: MUTED }}>No attendee records.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--samurai-border)" }}>
                  <Th>Name</Th>
                  <Th>Department</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map((a: HrMeetingAttendee) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--samurai-border)" }}>
                    <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{a.name || "—"}</td>
                    <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{a.department || "—"}</td>
                    <td style={{ padding: "0.6rem 0.5rem", fontSize: "0.85rem", color: TEXT }}>{a.email || "—"}</td>
                    <td style={{ padding: "0.6rem 0.5rem" }}>
                      <span className={`sd-chip ${statusStyle(a.status)}`}>{a.status || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}