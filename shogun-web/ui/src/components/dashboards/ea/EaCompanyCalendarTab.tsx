import { useState, useMemo } from "react";

// ── Mock Data ──
interface CalendarEvent {
  id: number;
  title: string;
  event_type: "governance" | "dept_meeting" | "holiday" | "deadline" | "event" | "training";
  date: string;
  layer: string;
  description: string;
  owner?: string;
}

const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  // Governance
  { id: 1, title: "Q3 Board Meeting", event_type: "governance", date: "2026-09-25", layer: "Governance", description: "Quarterly board session - financials & strategy", owner: "Sarah Lim" },
  { id: 2, title: "Audit Committee Session", event_type: "governance", date: "2026-09-18", layer: "Governance", description: "Internal audit findings review", owner: "Henry Koh" },
  { id: 3, title: "AGM 2026", event_type: "governance", date: "2026-10-15", layer: "Governance", description: "Annual General Meeting", owner: "Dato' Ahmad Razak" },
  { id: 4, title: "Risk Committee Quarterly", event_type: "governance", date: "2026-10-05", layer: "Governance", description: "Enterprise risk register review", owner: "Fatimah Zahra" },
  
  // Regulatory Deadlines
  { id: 5, title: "SST Return Filing - Sep 2026", event_type: "deadline", date: "2026-09-30", layer: "Deadlines", description: "Service tax return submission deadline", owner: "Grace Lim" },
  { id: 6, title: "EPF/SOCSO Submission", event_type: "deadline", date: "2026-09-15", layer: "Deadlines", description: "Monthly statutory contributions", owner: "Payroll Team" },
  { id: 7, title: "SSM Annual Return", event_type: "deadline", date: "2026-11-01", layer: "Deadlines", description: "Annual filing with SSM", owner: "Legal Dept" },
  
  // Holidays (Malaysia)
  { id: 8, title: "Malaysia Day", event_type: "holiday", date: "2026-09-16", layer: "Holidays", description: "National holiday - office closed" },
  { id: 9, title: "Deepavali", event_type: "holiday", date: "2026-10-20", layer: "Holidays", description: "Public holiday - office closed" },
  { id: 10, title: "Maulidur Rasul", event_type: "holiday", date: "2026-10-07", layer: "Holidays", description: "Public holiday - office closed" },
  
  // Fiscal Periods
  { id: 11, title: "Q3 Month-End Close", event_type: "deadline", date: "2026-09-30", layer: "Deadlines", description: "Finance blackout period - no non-essential meetings", owner: "Finance Team" },
  { id: 12, title: "Annual Audit Period", event_type: "deadline", date: "2026-10-01", layer: "Deadlines", description: "External audit fieldwork begins", owner: "Audit Team" },
  
  // Department Meetings
  { id: 13, title: "All Hands Meeting", event_type: "dept_meeting", date: "2026-09-28", layer: "Dept Meetings", description: "Monthly company-wide update", owner: "HR" },
  { id: 14, title: "Product Roadmap Review", event_type: "dept_meeting", date: "2026-09-22", layer: "Dept Meetings", description: "Q4 product planning session", owner: "David Ng" },
  { id: 15, title: "Sales Kickoff Q4", event_type: "dept_meeting", date: "2026-10-02", layer: "Dept Meetings", description: "Q4 sales targets and strategy", owner: "Peter Liew" },
  
  // Training
  { id: 16, title: "Leadership Workshop", event_type: "training", date: "2026-09-24", layer: "Training", description: "Executive leadership development program", owner: "HR" },
  { id: 17, title: "Compliance Training - SST", event_type: "training", date: "2026-10-08", layer: "Training", description: "Mandatory SST compliance refresher", owner: "Compliance" },
  
  // Events
  { id: 18, title: "Company Anniversary", event_type: "event", date: "2026-10-10", layer: "Events", description: "10th anniversary celebration", owner: "Marketing" },
  { id: 19, title: "Client Appreciation Dinner", event_type: "event", date: "2026-09-26", layer: "Events", description: "VIP client networking event", owner: "Sales" },
];

const LAYERS = [
  { id: "Governance", color: "#ef4444", label: "Governance" },
  { id: "Dept Meetings", color: "#3b82f6", label: "Dept Meetings" },
  { id: "Holidays", color: "#10b981", label: "Holidays" },
  { id: "Deadlines", color: "#f59e0b", label: "Deadlines" },
  { id: "Events", color: "#8b5cf6", label: "Events" },
  { id: "Training", color: "#ec4899", label: "Training" },
];

// ── Helper Functions ──
function getDaysUntil(dateStr: string): number {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getEventTypeColor(type: string): string {
  switch (type) {
    case "governance": return "#ef4444";
    case "dept_meeting": return "#3b82f6";
    case "holiday": return "#10b981";
    case "deadline": return "#f59e0b";
    case "event": return "#8b5cf6";
    case "training": return "#ec4899";
    default: return "#6b7280";
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Calendar Grid Component ──
function CompanyCalendarGrid({ events, onEventClick }: { events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
  const firstDay = getFirstDayOfMonth(currentMonth.year, currentMonth.month);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    });
    return map;
  }, [events]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => {
    if (currentMonth.month === 0) {
      setCurrentMonth({ year: currentMonth.year - 1, month: 11 });
    } else {
      setCurrentMonth({ ...currentMonth, month: currentMonth.month - 1 });
    }
  };

  const nextMonth = () => {
    if (currentMonth.month === 11) {
      setCurrentMonth({ year: currentMonth.year + 1, month: 0 });
    } else {
      setCurrentMonth({ ...currentMonth, month: currentMonth.month + 1 });
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
  };

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-[90px] bg-[var(--samurai-bg)]/30 border border-[var(--samurai-border)]/30" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateStr(currentMonth.year, currentMonth.month, day);
    const dayEvents = eventsByDate[dateStr] || [];
    const isToday = new Date().toDateString() === new Date(currentMonth.year, currentMonth.month, day).toDateString();

    calendarDays.push(
      <div
        key={day}
        className={`min-h-[90px] p-1.5 border border-[var(--samurai-border)] relative ${
          isToday ? 'bg-[var(--samurai-lime)]/10' : 'hover:bg-[var(--samurai-bg)]'
        } transition-colors`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className={`text-xs font-medium ${isToday ? 'text-[var(--samurai-lime)]' : 'text-[var(--samurai-muted)]'}`}>
            {day}
          </span>
          {dayEvents.length > 0 && (
            <span className="text-[10px] bg-[var(--samurai-lime)] text-[#0a0a0a] px-1 rounded font-medium">
              {dayEvents.length}
            </span>
          )}
        </div>
        <div className="space-y-0.5 overflow-hidden">
          {dayEvents.slice(0, 3).map((event) => {
            const color = getEventTypeColor(event.event_type);
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left text-[9px] truncate px-1 py-0.5 rounded text-white hover:opacity-80 transition-opacity"
                style={{ backgroundColor: color }}
                title={`${event.title} (${event.layer})`}
              >
                {event.title}
              </button>
            );
          })}
          {dayEvents.length > 3 && (
            <button
              onClick={() => dayEvents[0] && onEventClick(dayEvents[0])}
              className="text-[9px] text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]"
            >
              +{dayEvents.length - 3} more
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">
          {monthNames[currentMonth.month]} {currentMonth.year}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 border border-[var(--samurai-border)] rounded hover:bg-[var(--samurai-bg)] transition-colors text-[var(--samurai-fg)]"
          >
            ← Prev
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 bg-[var(--samurai-lime)] text-[#0a0a0a] rounded hover:opacity-90 transition-opacity font-medium"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 border border-[var(--samurai-border)] rounded hover:bg-[var(--samurai-bg)] transition-colors text-[var(--samurai-fg)]"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Day Names Header */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-xs font-medium text-[var(--samurai-muted)] text-center py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0">
        {calendarDays}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        {LAYERS.map(layer => (
          <div key={layer.id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: layer.color }} />
            <span className="text-[var(--samurai-muted)]">{layer.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modal Component ──
function EventDetailModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const daysUntil = getDaysUntil(event.date);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">{event.title}</h3>
          <button onClick={onClose} className="text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]">&times;</button>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--samurai-bg)] rounded">
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Date</p>
              <p className="font-medium">{new Date(event.date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Days Until</p>
              <p className={`font-medium ${daysUntil <= 7 ? 'text-red-500' : daysUntil <= 30 ? 'text-yellow-500' : ''}`}>
                {daysUntil} days
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Layer</p>
              <p className="font-medium">{event.layer}</p>
            </div>
            {event.owner && (
              <div>
                <p className="text-xs text-[var(--samurai-muted)]">Owner</p>
                <p className="font-medium">{event.owner}</p>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-[var(--samurai-bg)] rounded text-sm">
            <p className="text-[var(--samurai-muted)] text-xs mb-1">Description</p>
            <p>{event.description}</p>
          </div>
          
          {event.event_type === "deadline" && daysUntil <= 7 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm">
              ⚠️ Deadline approaching — Ensure all preparations are complete.
            </div>
          )}
          
          {event.event_type === "holiday" && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-sm">
              🏖️ Office closed — No meetings should be scheduled on this date.
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button className="flex-1 py-2 px-4 bg-[var(--samurai-lime)] text-[#0a0a0a] font-medium rounded hover:opacity-90 transition-opacity">
            {event.event_type === "deadline" ? "View Checklist" : "Add to My Calendar"}
          </button>
          <button className="flex-1 py-2 px-4 border border-[var(--samurai-border)] text-[var(--samurai-fg)] font-medium rounded hover:bg-[var(--samurai-bg)] transition-colors">
            Share Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Tab Component ──
export function EaCompanyCalendarTab() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(LAYERS.map(l => l.id)));
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "calendar">("calendar");

  const toggleLayer = (layerId: string) => {
    const newLayers = new Set(activeLayers);
    if (newLayers.has(layerId)) {
      newLayers.delete(layerId);
    } else {
      newLayers.add(layerId);
    }
    setActiveLayers(newLayers);
  };

  const filteredEvents = MOCK_CALENDAR_EVENTS.filter(e => activeLayers.has(e.layer))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group events by month
  const eventsByMonth = filteredEvents.reduce((acc, event) => {
    const month = new Date(event.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <div className="space-y-6">
      {/* Layer Filters */}
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-[var(--samurai-fg)]">Filter Layers:</span>
          {LAYERS.map((layer) => (
            <button
              key={layer.id}
              onClick={() => toggleLayer(layer.id)}
              className={`px-3 py-1.5 text-xs rounded-full transition-all flex items-center gap-2 ${
                activeLayers.has(layer.id)
                  ? "border-2"
                  : "border border-[var(--samurai-border)] text-[var(--samurai-muted)] opacity-50"
              }`}
              style={{
                borderColor: activeLayers.has(layer.id) ? layer.color : undefined,
                backgroundColor: activeLayers.has(layer.id) ? `${layer.color}20` : undefined,
                color: activeLayers.has(layer.id) ? layer.color : undefined,
              }}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: layer.color }}
              />
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("calendar")}
          className={`px-4 py-2 text-sm rounded transition-colors ${
            viewMode === "calendar"
              ? "bg-[var(--samurai-lime)] text-[#0a0a0a]"
              : "border border-[var(--samurai-border)] text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]"
          }`}
        >
          Calendar View
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`px-4 py-2 text-sm rounded transition-colors ${
            viewMode === "list"
              ? "bg-[var(--samurai-lime)] text-[#0a0a0a]"
              : "border border-[var(--samurai-border)] text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]"
          }`}
        >
          List View
        </button>
        <button
          onClick={() => setViewMode("timeline")}
          className={`px-4 py-2 text-sm rounded transition-colors ${
            viewMode === "timeline"
              ? "bg-[var(--samurai-lime)] text-[#0a0a0a]"
              : "border border-[var(--samurai-border)] text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]"
          }`}
        >
          Timeline View
        </button>
      </div>

      {/* Calendar Content */}
      {viewMode === "calendar" ? (
        <CompanyCalendarGrid events={filteredEvents} onEventClick={setSelectedEvent} />
      ) : viewMode === "list" ? (
        <div className="space-y-6">
          {Object.entries(eventsByMonth).map(([month, events]) => (
            <div key={month} className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--samurai-fg)] mb-4">{month}</h3>
              <div className="space-y-2">
                {events.map((event) => {
                  const daysUntil = getDaysUntil(event.date);
                  const color = getEventTypeColor(event.event_type);
                  
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full p-4 border border-[var(--samurai-border)] rounded hover:border-[var(--samurai-lime)] transition-all text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-1 self-stretch rounded-full shrink-0" 
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-[var(--samurai-fg)] truncate pr-2">
                              {event.title}
                            </span>
                            <span className={`text-xs font-medium shrink-0 ${daysUntil <= 7 ? 'text-red-500' : daysUntil <= 30 ? 'text-yellow-500' : 'text-[var(--samurai-muted)]'}`}>
                              {daysUntil <= 0 ? "TODAY" : `${daysUntil}d`}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-[var(--samurai-muted)]">
                            <span>{new Date(event.date).toLocaleDateString()} • {event.layer}</span>
                            {event.owner && <span>{event.owner}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Timeline View */
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
          <div className="relative space-y-4">
            {filteredEvents.map((event, idx) => {
              const daysUntil = getDaysUntil(event.date);
              const color = getEventTypeColor(event.event_type);
              
              return (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: color }}
                    />
                    {idx < filteredEvents.length - 1 && (
                      <div className="w-0.5 flex-1 bg-[var(--samurai-border)] my-1" />
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="flex-1 p-3 border border-[var(--samurai-border)] rounded hover:border-[var(--samurai-lime)] transition-all text-left mb-2"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm text-[var(--samurai-fg)]">{event.title}</span>
                      <span className={`text-xs ${daysUntil <= 7 ? 'text-red-500' : daysUntil <= 30 ? 'text-yellow-500' : 'text-[var(--samurai-muted)]'}`}>
                        {new Date(event.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--samurai-muted)]">{event.description}</p>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sync Status & Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-[var(--samurai-fg)]">Calendar Sync Active</p>
              <p className="text-xs text-[var(--samurai-muted)]">Last synced: 2 minutes ago • Outlook + GCal</p>
            </div>
          </div>
          <button className="mt-3 w-full py-2 px-4 border border-[var(--samurai-border)] text-[var(--samurai-fg)] text-sm font-medium rounded hover:bg-[var(--samurai-bg)] transition-colors">
            Refresh Now
          </button>
        </div>
        
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-4">
          <p className="text-sm font-medium text-[var(--samurai-fg)] mb-3">Export Calendar View</p>
          <div className="flex gap-2">
            <button className="flex-1 py-2 px-3 bg-[var(--samurai-lime)] text-[#0a0a0a] text-sm font-medium rounded hover:opacity-90 transition-opacity">
              PDF
            </button>
            <button className="flex-1 py-2 px-3 border border-[var(--samurai-border)] text-[var(--samurai-fg)] text-sm font-medium rounded hover:bg-[var(--samurai-bg)] transition-colors">
              PNG
            </button>
            <button className="flex-1 py-2 px-3 border border-[var(--samurai-border)] text-[var(--samurai-fg)] text-sm font-medium rounded hover:bg-[var(--samurai-bg)] transition-colors">
              ICS
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
