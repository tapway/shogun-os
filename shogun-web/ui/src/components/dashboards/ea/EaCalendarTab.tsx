import { useState, useMemo } from "react";

// ── Mock Data ──
interface GovernanceEvent {
  id: number;
  title: string;
  event_type: string;
  event_date: string;
  status: string;
  agenda_finalized: number;
  papers_pending: number;
  quorum_risk: number;
  responsible_owner: string;
  compliance_notes: string;
}

interface Room {
  id: number;
  room_name: string;
  capacity: number;
  floor: string;
  equipment: string;
  utilization_pct: number;
  peak_hours: string;
  booking_policy: string;
}

interface Visitor {
  id: number;
  visitor_name: string;
  company: string;
  visit_date: string;
  host_dept: string;
  purpose: string;
  nda_status: string;
  security_clearance: string;
  gift_value_myr: number;
  notes: string;
}

const MOCK_EVENTS: GovernanceEvent[] = [
  { id: 1, title: "Q3 Board Meeting", event_type: "board", event_date: "2026-09-25", status: "agenda_finalized", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "Sarah Lim", compliance_notes: "Quarterly financials + strategic review" },
  { id: 2, title: "Audit Committee Session", event_type: "committee", event_date: "2026-09-18", status: "papers_pending", agenda_finalized: 1, papers_pending: 1, quorum_risk: 0, responsible_owner: "Henry Koh", compliance_notes: "Internal audit findings review" },
  { id: 3, title: "AGM 2026", event_type: "agm", event_date: "2026-10-15", status: "planned", agenda_finalized: 0, papers_pending: 1, quorum_risk: 1, responsible_owner: "Dato' Ahmad Razak", compliance_notes: "Annual general meeting - quorum verification needed" },
  { id: 4, title: "SST Return Filing - Sep 2026", event_type: "regulatory", event_date: "2026-09-30", status: "compliance_ready", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "Grace Lim", compliance_notes: "Service tax return submission" },
  { id: 5, title: "SSM Annual Return", event_type: "regulatory", event_date: "2026-11-01", status: "planned", agenda_finalized: 0, papers_pending: 1, quorum_risk: 0, responsible_owner: "Legal Dept", compliance_notes: "Annual filing with SSM" },
  { id: 6, title: "Risk Committee Quarterly", event_type: "committee", event_date: "2026-10-05", status: "agenda_finalized", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "Fatimah Zahra", compliance_notes: "Enterprise risk register review" },
  { id: 7, title: "EPF/SOCSO Submission Deadline", event_type: "regulatory", event_date: "2026-09-15", status: "compliance_ready", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "Payroll Team", compliance_notes: "Monthly statutory contributions" },
  { id: 8, title: "ESG Steering Committee", event_type: "committee", event_date: "2026-10-20", status: "papers_pending", agenda_finalized: 1, papers_pending: 1, quorum_risk: 0, responsible_owner: "David Ng", compliance_notes: "Sustainability roadmap update" },
  // Company-wide: Holidays
  { id: 9, title: "Malaysia Day", event_type: "holiday", event_date: "2026-09-16", status: "confirmed", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "HR", compliance_notes: "National holiday — office closed" },
  { id: 10, title: "Deepavali", event_type: "holiday", event_date: "2026-10-20", status: "confirmed", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "HR", compliance_notes: "Public holiday — office closed" },
  { id: 11, title: "Maulidur Rasul", event_type: "holiday", event_date: "2026-10-07", status: "confirmed", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "HR", compliance_notes: "Public holiday — office closed" },
  // Company-wide: Department Meetings
  { id: 12, title: "All Hands Meeting", event_type: "dept_meeting", event_date: "2026-09-28", status: "planned", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "HR", compliance_notes: "Monthly company-wide update" },
  { id: 13, title: "Product Roadmap Review", event_type: "dept_meeting", event_date: "2026-09-22", status: "planned", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "David Ng", compliance_notes: "Q4 product planning session" },
  { id: 14, title: "Sales Kickoff Q4", event_type: "dept_meeting", event_date: "2026-10-02", status: "planned", agenda_finalized: 0, papers_pending: 0, quorum_risk: 0, responsible_owner: "Peter Liew", compliance_notes: "Q4 sales targets and strategy" },
  // Company-wide: Training
  { id: 15, title: "Leadership Workshop", event_type: "training", event_date: "2026-09-24", status: "confirmed", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "HR", compliance_notes: "Executive leadership development program" },
  { id: 16, title: "Compliance Training - SST", event_type: "training", event_date: "2026-10-08", status: "confirmed", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "Compliance", compliance_notes: "Mandatory SST compliance refresher" },
  // Company-wide: Events
  { id: 17, title: "Company Anniversary", event_type: "event", event_date: "2026-10-10", status: "planned", agenda_finalized: 0, papers_pending: 0, quorum_risk: 0, responsible_owner: "Marketing", compliance_notes: "10th anniversary celebration" },
  { id: 18, title: "Client Appreciation Dinner", event_type: "event", event_date: "2026-09-26", status: "confirmed", agenda_finalized: 1, papers_pending: 0, quorum_risk: 0, responsible_owner: "Sales", compliance_notes: "VIP client networking event" },
];

const MOCK_ROOMS: Room[] = [
  { id: 1, room_name: "Boardroom A", capacity: 20, floor: "Level 15", equipment: "Projector, Video Conf, Whiteboard", utilization_pct: 0.87, peak_hours: "09:00-11:00, 14:00-16:00", booking_policy: "Book 48h ahead for board meetings" },
  { id: 2, room_name: "Meeting Room B", capacity: 10, floor: "Level 12", equipment: "TV Screen, Whiteboard", utilization_pct: 0.62, peak_hours: "10:00-12:00", booking_policy: "First-come-first-served for dept meetings" },
  { id: 3, room_name: "Meeting Room C", capacity: 8, floor: "Level 12", equipment: "TV Screen", utilization_pct: 0.45, peak_hours: "15:00-17:00", booking_policy: "Available for ad-hoc use" },
  { id: 4, room_name: "Training Room", capacity: 30, floor: "Level 3", equipment: "Projector, Microphone, Recording", utilization_pct: 0.78, peak_hours: "09:00-17:00", booking_policy: "Priority for HR training sessions" },
  { id: 5, room_name: "Interview Room 1", capacity: 4, floor: "Level 8", equipment: "Webcam, Soundproof", utilization_pct: 0.55, peak_hours: "10:00-16:00", booking_policy: "HR booking priority" },
  { id: 6, room_name: "Executive Lounge", capacity: 12, floor: "Level 15", equipment: "Catering Available, Privacy", utilization_pct: 0.33, peak_hours: "Variable", booking_policy: "CEO/CFO approval required" },
];

const MOCK_VISITORS: Visitor[] = [
  { id: 1, visitor_name: "Tanaka Hiroshi", company: "Nippon Corp", visit_date: "2026-09-13", host_dept: "Sales", purpose: "Partnership Discussion", nda_status: "valid", security_clearance: "cleared", gift_value_myr: 0, notes: "VIP - Japanese delegation" },
  { id: 2, visitor_name: "Sarah Johnson", company: "GlobalTech Inc", visit_date: "2026-09-14", host_dept: "Engineering", purpose: "Technical Integration", nda_status: "expiring", security_clearance: "pending", gift_value_myr: 0, notes: "NDA expires in 5 days" },
  { id: 3, visitor_name: "Ahmad Faisal", company: "Local Vendor Sdn Bhd", visit_date: "2026-09-15", host_dept: "Procurement", purpose: "Supplier Audit", nda_status: "valid", security_clearance: "cleared", gift_value_myr: 250, notes: "Lunch hospitality - within LHDN threshold" },
  { id: 4, visitor_name: "Priya Sharma", company: "IndiaSoft Solutions", visit_date: "2026-09-16", host_dept: "IT", purpose: "Vendor Evaluation", nda_status: "invalid", security_clearance: "blocked", gift_value_myr: 0, notes: "NDA expired - do not admit until renewed" },
  { id: 5, visitor_name: "Michael Chen", company: "SG Capital Partners", visit_date: "2026-09-18", host_dept: "Finance", purpose: "Investor Relations", nda_status: "valid", security_clearance: "cleared", gift_value_myr: 0, notes: "Confidential - board-level discussion" },
  { id: 6, visitor_name: "Lim Wei Jie", company: "Regulatory Consultant", visit_date: "2026-09-20", host_dept: "Compliance", purpose: "SST Advisory", nda_status: "valid", security_clearance: "cleared", gift_value_myr: 180, notes: "Tea meeting - compliant" },
];

// ── Helper Functions ──
function getDaysUntil(dateStr: string): number {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getUtilizationColor(pct: number): string {
  if (pct >= 0.8) return "var(--samurai-lime)";
  if (pct >= 0.6) return "var(--samurai-yellow, #fbbf24)";
  return "var(--samurai-muted)";
}

function getEventTypeColor(type: string): string {
  switch (type) {
    case "board": return "#ef4444";
    case "committee": return "#f59e0b";
    case "agm": return "#dc2626";
    case "regulatory": return "#10b981";
    case "holiday": return "#22c55e";
    case "dept_meeting": return "#3b82f6";
    case "training": return "#ec4899";
    case "event": return "#8b5cf6";
    default: return "#6b7280";
  }
}

// Get days in month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Get first day of month (0 = Sunday, 6 = Saturday)
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// Format date as YYYY-MM-DD
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Modal Components ──
function EventDetailModal({ event, onClose }: { event: GovernanceEvent; onClose: () => void }) {
  const daysUntil = getDaysUntil(event.event_date);
  
  // Local state for checklist toggles (demo only — no backend persist)
  const [checklist, setChecklist] = useState({
    agendaFinalized: event.agenda_finalized === 1,
    papersDistributed: event.papers_pending === 0,
    quorumConfirmed: event.quorum_risk === 0,
  });
  const [notifySent, setNotifySent] = useState(false);

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNotifyOwner = () => {
    setNotifySent(true);
    setTimeout(() => setNotifySent(false), 3000);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">{event.title}</h3>
          <button onClick={onClose} className="text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]">&times;</button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--samurai-bg)] rounded">
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Date</p>
              <p className="font-medium">{new Date(event.event_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Days Until</p>
              <p className={`font-medium ${daysUntil <= 7 ? 'text-red-500' : daysUntil <= 30 ? 'text-yellow-500' : ''}`}>
                {daysUntil} days
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Type</p>
              <p className="font-medium capitalize">{event.event_type}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Owner</p>
              <p className="font-medium">{event.responsible_owner}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-[var(--samurai-fg)] mb-2">Compliance Checklist</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 border border-[var(--samurai-border)] rounded cursor-pointer hover:bg-[var(--samurai-bg)] transition-colors">
                <input
                  type="checkbox"
                  checked={checklist.agendaFinalized}
                  onChange={() => toggleCheck("agendaFinalized")}
                  className="accent-[var(--samurai-lime)] w-4 h-4 cursor-pointer"
                />
                <span className={`text-sm ${checklist.agendaFinalized ? "text-[var(--samurai-fg)]" : "text-[var(--samurai-muted)]"}`}>
                  Agenda Finalized
                </span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-[var(--samurai-border)] rounded cursor-pointer hover:bg-[var(--samurai-bg)] transition-colors">
                <input
                  type="checkbox"
                  checked={checklist.papersDistributed}
                  onChange={() => toggleCheck("papersDistributed")}
                  className="accent-[var(--samurai-lime)] w-4 h-4 cursor-pointer"
                />
                <span className={`text-sm ${checklist.papersDistributed ? "text-[var(--samurai-fg)]" : "text-[var(--samurai-muted)]"}`}>
                  Board Papers Distributed (48h prior)
                </span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-[var(--samurai-border)] rounded cursor-pointer hover:bg-[var(--samurai-bg)] transition-colors">
                <input
                  type="checkbox"
                  checked={checklist.quorumConfirmed}
                  onChange={() => toggleCheck("quorumConfirmed")}
                  className="accent-[var(--samurai-lime)] w-4 h-4 cursor-pointer"
                />
                <span className={`text-sm ${checklist.quorumConfirmed ? "text-[var(--samurai-fg)]" : "text-[var(--samurai-muted)]"}`}>
                  Quorum Confirmed
                </span>
              </label>
            </div>
          </div>
          
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
            💡 {event.compliance_notes}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-[var(--samurai-lime)] text-[#0a0a0a] font-medium rounded hover:opacity-90 transition-opacity"
          >
            Close
          </button>
          <button
            onClick={handleNotifyOwner}
            disabled={notifySent}
            className={`flex-1 py-2 px-4 font-medium rounded transition-all ${
              notifySent
                ? "bg-green-500/20 text-green-500 border border-green-500/30 cursor-default"
                : "border border-[var(--samurai-border)] text-[var(--samurai-fg)] hover:bg-[var(--samurai-bg)]"
            }`}
          >
            {notifySent ? "✓ Owner Notified" : "Notify Owner"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mock existing bookings for conflict detection ──
interface ExistingBooking {
  room_id: number;
  date: string; // YYYY-MM-DD
  time_slot: string; // "HH:MM"
  booked_by: string;
}

const MOCK_EXISTING_BOOKINGS: ExistingBooking[] = [
  { room_id: 1, date: "2026-09-15", time_slot: "09:00", booked_by: "Board Meeting Prep" },
  { room_id: 1, date: "2026-09-15", time_slot: "09:30", booked_by: "Board Meeting Prep" },
  { room_id: 1, date: "2026-09-15", time_slot: "10:00", booked_by: "Q3 Board Meeting" },
  { room_id: 1, date: "2026-09-15", time_slot: "10:30", booked_by: "Q3 Board Meeting" },
  { room_id: 1, date: "2026-09-15", time_slot: "14:00", booked_by: "CEO 1:1 with CFO" },
  { room_id: 1, date: "2026-09-16", time_slot: "09:00", booked_by: "Audit Committee" },
  { room_id: 1, date: "2026-09-16", time_slot: "09:30", booked_by: "Audit Committee" },
  { room_id: 2, date: "2026-09-15", time_slot: "10:00", booked_by: "HR Team Sync" },
  { room_id: 2, date: "2026-09-15", time_slot: "10:30", booked_by: "HR Team Sync" },
  { room_id: 2, date: "2026-09-16", time_slot: "14:00", booked_by: "Procurement Review" },
  { room_id: 3, date: "2026-09-15", time_slot: "15:00", booked_by: "IT Standup" },
  { room_id: 4, date: "2026-09-15", time_slot: "09:00", booked_by: "New Hire Orientation" },
  { room_id: 4, date: "2026-09-15", time_slot: "09:30", booked_by: "New Hire Orientation" },
  { room_id: 4, date: "2026-09-15", time_slot: "10:00", booked_by: "New Hire Orientation" },
  { room_id: 4, date: "2026-09-15", time_slot: "10:30", booked_by: "New Hire Orientation" },
];

// Generate 30-min time slots from 08:00 to 18:00
const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const min = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
});

function getNext30Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(formatDate(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return days;
}

function isSlotBooked(roomId: number, date: string, timeSlot: string): ExistingBooking | undefined {
  return MOCK_EXISTING_BOOKINGS.find(
    (b) => b.room_id === roomId && b.date === date && b.time_slot === timeSlot
  );
}

// ── Mock staff list for meeting invitations ──
interface StaffMember {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
}

const MOCK_STAFF_LIST: StaffMember[] = [
  { id: 1, name: "Sarah Lim", email: "sarah.lim@company.my", department: "Executive", position: "EA Lead" },
  { id: 2, name: "Henry Koh", email: "henry.koh@company.my", department: "Finance", position: "CFO" },
  { id: 3, name: "Grace Lim", email: "grace.lim@company.my", department: "Finance", position: "Tax Manager" },
  { id: 4, name: "Fatimah Zahra", email: "fatimah.z@company.my", department: "Compliance", position: "Risk Officer" },
  { id: 5, name: "David Ng", email: "david.ng@company.my", department: "Operations", position: "COO" },
  { id: 6, name: "Ahmad Razak", email: "ahmad.r@company.my", department: "Legal", position: "Company Secretary" },
  { id: 7, name: "Priya Nair", email: "priya.n@company.my", department: "HR", position: "HR Director" },
  { id: 8, name: "Tan Wei Jie", email: "weijie.tan@company.my", department: "IT", position: "CTO" },
  { id: 9, name: "Nurul Aisyah", email: "nurul.a@company.my", department: "Marketing", position: "CMO" },
  { id: 10, name: "James Wong", email: "james.w@company.my", department: "Procurement", position: "Head of Procurement" },
];

function RoomBookingModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const availableDates = useMemo(() => getNext30Days(), []);
  const [selectedDate, setSelectedDate] = useState(availableDates[0]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // New fields
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingUsage, setMeetingUsage] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Check which slots are already booked for selected date
  const slotStatus = useMemo(() => {
    return TIME_SLOTS.map((slot) => {
      const existing = isSlotBooked(room.id, selectedDate, slot);
      return { slot, booked: !!existing, bookedBy: existing?.booked_by };
    });
  }, [room.id, selectedDate]);

  // Filter staff by search
  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return MOCK_STAFF_LIST;
    const q = staffSearch.toLowerCase();
    return MOCK_STAFF_LIST.filter(
      (s) => s.name.toLowerCase().includes(q) || s.department.toLowerCase().includes(q) || s.position.toLowerCase().includes(q)
    );
  }, [staffSearch]);

  const toggleSlot = (slot: string) => {
    if (isSlotBooked(room.id, selectedDate, slot)) return;
    setBookedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const toggleStaff = (staffId: number) => {
    setSelectedStaff((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const canBook = bookedSlots.length > 0 && meetingTitle.trim() && meetingUsage.trim();

  const handleBook = () => {
    if (!canBook) return;
    
    // Demo: simulate sending email invitations
    setEmailSent(true);
    
    setTimeout(() => {
      setBookingSuccess(true);
    }, 800);
    
    setTimeout(() => {
      setBookingSuccess(false);
      setBookedSlots([]);
      setMeetingTitle("");
      setMeetingUsage("");
      setSelectedStaff([]);
      setEmailSent(false);
      onClose();
    }, 3000);
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${dayNames[d.getDay()]}, ${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`;
  };

  // Get selected staff names for confirmation
  const selectedStaffNames = MOCK_STAFF_LIST.filter((s) => selectedStaff.includes(s.id)).map((s) => s.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">Book {room.room_name}</h3>
            <p className="text-xs text-[var(--samurai-muted)]">{room.floor} • Capacity: {room.capacity} • {room.equipment}</p>
          </div>
          <button onClick={onClose} className="text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]">&times;</button>
        </div>

        {bookingSuccess ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h4 className="text-xl font-semibold text-[var(--samurai-fg)] mb-2">Booking Confirmed!</h4>
            <p className="text-[var(--samurai-muted)] mb-4">
              <strong>{meetingTitle}</strong><br />
              {room.room_name} on {formatDateDisplay(selectedDate)}<br />
              {bookedSlots.length} session{bookedSlots.length > 1 ? "s" : ""} ({bookedSlots.length * 30} mins)
            </p>
            {emailSent && selectedStaff.length > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded text-sm text-green-500">
                📧 Meeting invitations sent to {selectedStaff.length} attendee{selectedStaff.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Meeting Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[var(--samurai-fg)] mb-1">Meeting Title *</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Q3 Budget Review"
                  className="w-full p-2 bg-[var(--samurai-bg)] border border-[var(--samurai-border)] rounded text-[var(--samurai-fg)] focus:outline-none focus:border-[var(--samurai-lime)] text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--samurai-fg)] mb-1">Purpose / Usage *</label>
                <input
                  type="text"
                  value={meetingUsage}
                  onChange={(e) => setMeetingUsage(e.target.value)}
                  placeholder="e.g. Quarterly financial review with CFO"
                  className="w-full p-2 bg-[var(--samurai-bg)] border border-[var(--samurai-border)] rounded text-[var(--samurai-fg)] focus:outline-none focus:border-[var(--samurai-lime)] text-sm"
                />
              </div>
            </div>

            {/* Date Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--samurai-fg)] mb-1">Select Date (next 30 days)</label>
              <select
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setBookedSlots([]); }}
                className="w-full p-2 bg-[var(--samurai-bg)] border border-[var(--samurai-border)] rounded text-[var(--samurai-fg)] focus:outline-none focus:border-[var(--samurai-lime)] text-sm"
              >
                {availableDates.map((d) => (
                  <option key={d} value={d}>{formatDateDisplay(d)}</option>
                ))}
              </select>
            </div>

            {/* Time Slot Grid */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-[var(--samurai-fg)]">Select Session(s) — 30 min each</label>
                <span className="text-xs text-[var(--samurai-muted)]">{bookedSlots.length} selected ({bookedSlots.length * 30} mins)</span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                {slotStatus.map(({ slot, booked, bookedBy }) => {
                  const isSelected = bookedSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      disabled={booked}
                      onClick={() => toggleSlot(slot)}
                      title={booked ? `Booked: ${bookedBy}` : `Available — click to select`}
                      className={`py-2 px-1 text-xs rounded transition-all ${
                        booked
                          ? "bg-red-500/20 text-red-400 cursor-not-allowed border border-red-500/30"
                          : isSelected
                          ? "bg-[var(--samurai-lime)] text-[#0a0a0a] font-medium"
                          : "border border-[var(--samurai-border)] text-[var(--samurai-muted)] hover:border-[var(--samurai-lime)] hover:text-[var(--samurai-fg)]"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-[var(--samurai-muted)]">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-[var(--samurai-border)] inline-block" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[var(--samurai-lime)] inline-block" /> Selected</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30 inline-block" /> Booked</span>
              </div>
            </div>

            {/* Staff Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--samurai-fg)] mb-1">Invite Attendees (optional)</label>
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search by name, department, or position..."
                className="w-full p-2 mb-2 bg-[var(--samurai-bg)] border border-[var(--samurai-border)] rounded text-[var(--samurai-fg)] focus:outline-none focus:border-[var(--samurai-lime)] text-sm"
              />
              <div className="max-h-32 overflow-y-auto border border-[var(--samurai-border)] rounded p-2 space-y-1">
                {filteredStaff.map((staff) => {
                  const isSelected = selectedStaff.includes(staff.id);
                  return (
                    <label
                      key={staff.id}
                      className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors text-sm ${
                        isSelected ? "bg-[var(--samurai-lime)]/10" : "hover:bg-[var(--samurai-bg)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStaff(staff.id)}
                        className="accent-[var(--samurai-lime)] w-3.5 h-3.5"
                      />
                      <span className="flex-1 text-[var(--samurai-fg)]">{staff.name}</span>
                      <span className="text-xs text-[var(--samurai-muted)]">{staff.position} • {staff.department}</span>
                    </label>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <p className="text-xs text-[var(--samurai-muted)] text-center py-2">No staff found</p>
                )}
              </div>
              {selectedStaff.length > 0 && (
                <p className="text-xs text-[var(--samurai-muted)] mt-1">
                  {selectedStaff.length} attendee{selectedStaff.length > 1 ? "s" : ""} selected — email invitations will be sent upon booking
                </p>
              )}
            </div>

            {/* Booking Policy */}
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm mb-4">
              📋 {room.booking_policy}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleBook}
                disabled={!canBook}
                className={`flex-1 py-2 px-4 font-medium rounded transition-opacity ${
                  canBook
                    ? "bg-[var(--samurai-lime)] text-[#0a0a0a] hover:opacity-90"
                    : "bg-[var(--samurai-bg)] text-[var(--samurai-muted)] cursor-not-allowed"
                }`}
              >
                {!meetingTitle.trim() || !meetingUsage.trim()
                  ? "Fill in Title & Purpose"
                  : bookedSlots.length === 0
                  ? "Select a Time Slot"
                  : `Book & Send Invites (${selectedStaff.length})`}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-[var(--samurai-border)] text-[var(--samurai-fg)] font-medium rounded hover:bg-[var(--samurai-bg)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VisitorClearanceModal({ visitor, onClose }: { visitor: Visitor; onClose: () => void }) {
  const isBlocked = visitor.security_clearance === "blocked";
  const ndaExpiring = visitor.nda_status === "expiring";
  const hasGift = visitor.gift_value_myr > 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)]">{visitor.visitor_name}</h3>
          <button onClick={onClose} className="text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]">&times;</button>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--samurai-bg)] rounded">
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Company</p>
              <p className="font-medium">{visitor.company}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Visit Date</p>
              <p className="font-medium">{new Date(visitor.visit_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Host Department</p>
              <p className="font-medium">{visitor.host_dept}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--samurai-muted)]">Purpose</p>
              <p className="font-medium">{visitor.purpose}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
              <span className="text-[var(--samurai-muted)]">NDA Status</span>
              <span className={`font-medium ${visitor.nda_status === 'valid' ? 'text-green-500' : visitor.nda_status === 'expiring' ? 'text-yellow-500' : 'text-red-500'}`}>
                {visitor.nda_status.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
              <span className="text-[var(--samurai-muted)]">Security Clearance</span>
              <span className={`font-medium ${visitor.security_clearance === 'cleared' ? 'text-green-500' : visitor.security_clearance === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>
                {visitor.security_clearance.toUpperCase()}
              </span>
            </div>
            {hasGift && (
              <div className="flex justify-between py-2 border-b border-[var(--samurai-border)]">
                <span className="text-[var(--samurai-muted)]">Gift/Hospitality Value</span>
                <span className="font-medium">MYR {visitor.gift_value_myr.toLocaleString()}</span>
              </div>
            )}
          </div>
          
          {isBlocked && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm">
              ⛔ ACCESS BLOCKED — NDA expired. Do not admit until renewed.
            </div>
          )}
          {ndaExpiring && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm">
              ⚠️ NDA expiring soon — Initiate renewal before visit date.
            </div>
          )}
          {hasGift && visitor.gift_value_myr > 300 && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded text-sm">
              🎁 Gift value exceeds LHDN threshold (MYR 300) — Tax declaration required.
            </div>
          )}
          
          <div className="p-3 bg-[var(--samurai-bg)] rounded text-sm">
            <p className="text-[var(--samurai-muted)] text-xs mb-1">Notes</p>
            <p>{visitor.notes}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {!isBlocked && (
            <button className="flex-1 py-2 px-4 bg-[var(--samurai-lime)] text-[#0a0a0a] font-medium rounded hover:opacity-90 transition-opacity">
              Confirm Clearance
            </button>
          )}
          <button className="flex-1 py-2 px-4 border border-[var(--samurai-border)] text-[var(--samurai-fg)] font-medium rounded hover:bg-[var(--samurai-bg)] transition-colors">
            {isBlocked ? "Renew NDA" : "View NDA"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar View Component ──
function CalendarView({ events, onEventClick }: { events: GovernanceEvent[]; onEventClick: (e: GovernanceEvent) => void }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
  const firstDay = getFirstDayOfMonth(currentMonth.year, currentMonth.month);
  
  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, GovernanceEvent[]> = {};
    events.forEach(event => {
      const date = event.event_date;
      if (!map[date]) map[date] = [];
      map[date].push(event);
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
  // Empty cells for days before first day of month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-[80px] bg-[var(--samurai-bg)]/30 border border-[var(--samurai-border)]/30" />);
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(currentMonth.year, currentMonth.month, day);
    const dayEvents = eventsByDate[dateStr] || [];
    const isToday = new Date().toDateString() === new Date(currentMonth.year, currentMonth.month, day).toDateString();
    
    calendarDays.push(
      <div
        key={day}
        className={`min-h-[80px] p-1 border border-[var(--samurai-border)] relative ${
          isToday ? 'bg-[var(--samurai-lime)]/10' : 'hover:bg-[var(--samurai-bg)]'
        } transition-colors`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className={`text-xs font-medium ${isToday ? 'text-[var(--samurai-lime)]' : 'text-[var(--samurai-muted)]'}`}>
            {day}
          </span>
          {dayEvents.length > 0 && (
            <span className="text-[10px] bg-[var(--samurai-lime)] text-[#0a0a0a] px-1 rounded">
              {dayEvents.length}
            </span>
          )}
        </div>
        <div className="space-y-0.5 overflow-hidden">
          {dayEvents.slice(0, 3).map((event, idx) => {
            const color = getEventTypeColor(event.event_type);
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left text-[9px] truncate px-1 py-0.5 rounded text-white hover:opacity-80 transition-opacity"
                style={{ backgroundColor: color }}
                title={event.title}
              >
                {event.title}
              </button>
            );
          })}
          {dayEvents.length > 3 && (
            <button 
              onClick={() => dayEvents.forEach(e => onEventClick(e))}
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
        {[
          { color: "#ef4444", label: "Board" },
          { color: "#f59e0b", label: "Committee" },
          { color: "#dc2626", label: "AGM" },
          { color: "#10b981", label: "Regulatory" },
          { color: "#22c55e", label: "Holidays" },
          { color: "#3b82f6", label: "Dept Meetings" },
          { color: "#ec4899", label: "Training" },
          { color: "#8b5cf6", label: "Events" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
            <span className="text-[var(--samurai-muted)]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Tab Component ──
export function EaCalendarTab() {
  const [selectedEvent, setSelectedEvent] = useState<GovernanceEvent | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");

  const filteredEvents = eventTypeFilter === "all"
    ? MOCK_EVENTS
    : MOCK_EVENTS.filter(e => e.event_type === eventTypeFilter);

  return (
    <div className="space-y-6">
      {/* View Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "board", label: "Board" },
            { key: "committee", label: "Committee" },
            { key: "regulatory", label: "Regulatory" },
            { key: "holiday", label: "Holidays" },
            { key: "dept_meeting", label: "Dept Meetings" },
            { key: "training", label: "Training" },
            { key: "event", label: "Events" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setEventTypeFilter(filter.key)}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                eventTypeFilter === filter.key
                  ? "bg-[var(--samurai-lime)] text-[#0a0a0a]"
                  : "border border-[var(--samurai-border)] text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
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
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              viewMode === "calendar"
                ? "bg-[var(--samurai-lime)] text-[#0a0a0a]"
                : "border border-[var(--samurai-border)] text-[var(--samurai-muted)] hover:text-[var(--samurai-fg)]"
            }`}
          >
            Calendar View
          </button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === "calendar" ? (
        <CalendarView events={filteredEvents} onEventClick={setSelectedEvent} />
      ) : (
        /* List View */
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
          <div className="space-y-2">
            {filteredEvents.map((event) => {
              const daysUntil = getDaysUntil(event.event_date);
              const statusColor = event.agenda_finalized && !event.papers_pending && !event.quorum_risk
                ? "green" : event.quorum_risk ? "red" : event.papers_pending ? "yellow" : "blue";
              
              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full p-4 border border-[var(--samurai-border)] rounded hover:border-[var(--samurai-lime)] transition-all text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-[var(--samurai-fg)]">{event.title}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded bg-${statusColor}-500/20 text-${statusColor}-500`}>
                        {event.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${daysUntil <= 7 ? 'text-red-500' : daysUntil <= 30 ? 'text-yellow-500' : ''}`}>
                      {daysUntil} days
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--samurai-muted)]">
                    <span className="capitalize">{event.event_type} • {event.responsible_owner}</span>
                    <span>{new Date(event.event_date).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Two Column: Rooms + Visitors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Utilization */}
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)] mb-4">Meeting Room Utilization</h3>
          <div className="space-y-3">
            {MOCK_ROOMS.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className="w-full p-3 border border-[var(--samurai-border)] rounded hover:border-[var(--samurai-lime)] transition-all text-left"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-[var(--samurai-fg)]">{room.room_name}</span>
                  <span className="text-xs text-[var(--samurai-muted)]">{room.floor}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-[var(--samurai-bg)] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ width: `${room.utilization_pct * 100}%`, backgroundColor: getUtilizationColor(room.utilization_pct) }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: getUtilizationColor(room.utilization_pct) }}>
                    {(room.utilization_pct * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-[var(--samurai-muted)]">Capacity: {room.capacity} • Peak: {room.peak_hours}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Visitor Schedule */}
        <div className="bg-[var(--samurai-card)] border border-[var(--samurai-border)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--samurai-fg)] mb-4">Visitor & Vendor Schedule</h3>
          <div className="space-y-2">
            {MOCK_VISITORS.map((visitor) => {
              const isBlocked = visitor.security_clearance === "blocked";
              const ndaExpiring = visitor.nda_status === "expiring";
              
              return (
                <button
                  key={visitor.id}
                  onClick={() => setSelectedVisitor(visitor)}
                  className={`w-full p-3 border rounded transition-all text-left ${
                    isBlocked 
                      ? "border-red-500/50 bg-red-500/5 hover:border-red-500" 
                      : ndaExpiring
                      ? "border-yellow-500/50 bg-yellow-500/5 hover:border-yellow-500"
                      : "border-[var(--samurai-border)] hover:border-[var(--samurai-lime)]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      {isBlocked && <span className="text-red-500">⛔</span>}
                      {ndaExpiring && <span className="text-yellow-500">⚠️</span>}
                      <span className="font-medium text-sm text-[var(--samurai-fg)]">{visitor.visitor_name}</span>
                    </div>
                    <span className="text-xs text-[var(--samurai-muted)]">{new Date(visitor.visit_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--samurai-muted)]">
                    <span>{visitor.company} • {visitor.host_dept}</span>
                    <span className="capitalize">{visitor.security_clearance}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {selectedRoom && <RoomBookingModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />}
      {selectedVisitor && <VisitorClearanceModal visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />}
    </div>
  );
}
