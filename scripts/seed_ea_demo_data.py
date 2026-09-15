"""
seed_ea_demo_data.py — Seed Executive department demo data into web.db.

Usage:
    python seed_ea_demo_data.py              # uses default web.db path
    python seed_ea_demo_data.py /path/to.db  # custom path

Creates tables (if not exist) and inserts fictional EA data:
- ea_executives: C-suite / dept heads availability matrix
- ea_approvals: pending signature/approval pipeline
- ea_governance_events: board meetings, AGM, regulatory filings
- ea_requests: incoming EA service requests
- ea_contracts: contract lifecycle tracker
- ea_policies: policy document version control
- ea_visitors: visitor/vendor schedule
- ea_rooms: meeting room utilization
"""

import sqlite3
import sys
import os
from datetime import datetime, timedelta

DB_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.shogun-os/web.db")


def ensure_tables(cur):
    """Create EA tables if they don't exist."""
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS ea_executives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            department TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'available',
            next_free_slot TEXT,
            delegate_name TEXT,
            delegate_phone TEXT,
            current_meeting TEXT,
            travel_destination TEXT,
            travel_cost_myr REAL
        );

        CREATE TABLE IF NOT EXISTS ea_approvals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_name TEXT NOT NULL,
            requester TEXT NOT NULL,
            exec_level TEXT NOT NULL,
            submitted_date TEXT NOT NULL,
            sla_deadline TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            is_sst_sensitive INTEGER DEFAULT 0,
            category TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ea_governance_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'planned',
            agenda_finalized INTEGER DEFAULT 0,
            papers_pending INTEGER DEFAULT 0,
            quorum_risk INTEGER DEFAULT 0,
            responsible_owner TEXT,
            compliance_notes TEXT
        );

        CREATE TABLE IF NOT EXISTS ea_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_type TEXT NOT NULL,
            requester_dept TEXT NOT NULL,
            requester_name TEXT NOT NULL,
            created_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new',
            priority TEXT NOT NULL DEFAULT 'normal',
            description TEXT,
            assigned_to TEXT
        );

        CREATE TABLE IF NOT EXISTS ea_contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_name TEXT NOT NULL,
            contract_type TEXT NOT NULL,
            value_myr REAL NOT NULL,
            start_date TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            renewal_status TEXT NOT NULL DEFAULT 'active',
            performance_score REAL DEFAULT 0.8,
            contact_person TEXT,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS ea_policies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            policy_name TEXT NOT NULL,
            category TEXT NOT NULL,
            last_review_date TEXT NOT NULL,
            next_review_date TEXT NOT NULL,
            owner TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            version TEXT NOT NULL DEFAULT 'v1.0'
        );

        CREATE TABLE IF NOT EXISTS ea_visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_name TEXT NOT NULL,
            company TEXT NOT NULL,
            visit_date TEXT NOT NULL,
            host_dept TEXT NOT NULL,
            purpose TEXT NOT NULL,
            nda_status TEXT NOT NULL DEFAULT 'valid',
            security_clearance TEXT NOT NULL DEFAULT 'cleared',
            gift_value_myr REAL DEFAULT 0,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS ea_rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_name TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            floor TEXT NOT NULL,
            equipment TEXT NOT NULL,
            utilization_pct REAL NOT NULL DEFAULT 0.5,
            peak_hours TEXT,
            booking_policy TEXT
        );
    """)


def seed_executives(cur):
    """Seed executive availability matrix."""
    cur.execute("DELETE FROM ea_executives")
    executives = [
        ("Dato' Ahmad Razak", "CEO", "Executive Office", "in_meeting", "14:00", "Sarah Lim", "+6012-345-6789", "Board Strategy Review", None, None),
        ("Puan Sri Mei Ling", "CFO", "Finance", "available", "Now", "Kevin Tan", "+6013-456-7890", None, None, None),
        ("Rajesh Kumar", "CTO", "Engineering", "travel", "Tomorrow 09:00", "Lisa Wong", "+6014-567-8901", None, "Singapore Tech Summit", 4500.00),
        ("Fatimah Zahra", "COO", "Operations", "ooo", "Mon 09:00", "Marcus Sim", "+6015-678-9012", None, None, None),
        ("David Ng", "Head of Product", "Product", "available", "Now", "Carmen Wong", "+6016-789-0123", None, None, None),
        ("Peter Liew", "Sales Director", "Sales", "in_meeting", "15:30", "Oliver Chan", "+6017-890-1234", "Q3 Sales Forecast", None, None),
        ("Frank Tan", "Marketing Director", "Marketing", "available", "Now", "Emma Chong", "+6018-901-2345", None, None, None),
        ("James Ong", "HR Manager", "HR", "in_meeting", "16:00", "Irene Teo", "+6019-012-3456", "Talent Review Panel", None, None),
    ]
    cur.executemany(
        "INSERT INTO ea_executives (name, title, department, status, next_free_slot, delegate_name, delegate_phone, current_meeting, travel_destination, travel_cost_myr) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        executives
    )


def seed_approvals(cur):
    """Seed approval pipeline."""
    cur.execute("DELETE FROM ea_approvals")
    today = datetime.now()
    approvals = [
        ("Vendor Contract - CloudInfra Sdn Bhd", "Procurement", "CEO", (today - timedelta(days=3)).isoformat(), (today + timedelta(hours=12)).isoformat(), "pending", 1, "contract"),
        ("Travel Authorization - Singapore Trip", "Engineering", "CTO", (today - timedelta(days=1)).isoformat(), (today + timedelta(days=2)).isoformat(), "pending", 0, "travel"),
        ("Q3 Marketing Budget Amendment", "Marketing", "CFO", (today - timedelta(days=5)).isoformat(), (today - timedelta(hours=6)).isoformat(), "escalated", 1, "budget"),
        ("New Hire Offer - Senior Dev", "HR", "CTO", (today - timedelta(days=2)).isoformat(), (today + timedelta(days=1)).isoformat(), "signed", 0, "hr"),
        ("Office Renovation PO", "Facilities", "COO", (today - timedelta(days=7)).isoformat(), (today - timedelta(days=2)).isoformat(), "breached", 1, "procurement"),
        ("SST Filing Approval - Aug 2026", "Finance", "CFO", (today - timedelta(days=1)).isoformat(), (today + timedelta(days=3)).isoformat(), "pending", 1, "regulatory"),
        ("Gift Hospitality - Client Dinner", "Sales", "CEO", (today - timedelta(hours=8)).isoformat(), (today + timedelta(days=1)).isoformat(), "pending", 1, "gift"),
        ("Policy Update - Remote Work", "HR", "COO", (today - timedelta(days=4)).isoformat(), (today + timedelta(days=3)).isoformat(), "in_review", 0, "policy"),
    ]
    cur.executemany(
        "INSERT INTO ea_approvals (doc_name, requester, exec_level, submitted_date, sla_deadline, status, is_sst_sensitive, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        approvals
    )


def seed_governance_events(cur):
    """Seed governance calendar."""
    cur.execute("DELETE FROM ea_governance_events")
    events = [
        ("Q3 Board Meeting", "board", "2026-09-25", "agenda_finalized", 1, 0, 0, "Sarah Lim", "Quarterly financials + strategic review"),
        ("Audit Committee Session", "committee", "2026-09-18", "papers_pending", 1, 1, 0, "Henry Koh", "Internal audit findings review"),
        ("AGM 2026", "agm", "2026-10-15", "planned", 0, 1, 1, "Dato' Ahmad Razak", "Annual general meeting - quorum verification needed"),
        ("SST Return Filing - Sep 2026", "regulatory", "2026-09-30", "compliance_ready", 1, 0, 0, "Grace Lim", "Service tax return submission"),
        ("SSM Annual Return", "regulatory", "2026-11-01", "planned", 0, 1, 0, "Legal Dept", "Annual filing with SSM"),
        ("Risk Committee Quarterly", "committee", "2026-10-05", "agenda_finalized", 1, 0, 0, "Fatimah Zahra", "Enterprise risk register review"),
        ("EPF/SOCSO Submission Deadline", "regulatory", "2026-09-15", "compliance_ready", 1, 0, 0, "Payroll Team", "Monthly statutory contributions"),
        ("ESG Steering Committee", "committee", "2026-10-20", "papers_pending", 1, 1, 0, "David Ng", "Sustainability roadmap update"),
    ]
    cur.executemany(
        "INSERT INTO ea_governance_events (title, event_type, event_date, status, agenda_finalized, papers_pending, quorum_risk, responsible_owner, compliance_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        events
    )


def seed_requests(cur):
    """Seed EA service requests."""
    cur.execute("DELETE FROM ea_requests")
    today = datetime.now()
    requests = [
        ("travel", "Engineering", "Samuel Ho", (today - timedelta(hours=2)).isoformat(), "new", "high", "Flight booking to Penang for client demo"),
        ("room_booking", "Marketing", "Emma Chong", (today - timedelta(hours=5)).isoformat(), "in_progress", "normal", "Boardroom A for product launch prep"),
        ("document", "Finance", "Grace Lim", (today - timedelta(days=1)).isoformat(), "completed", "normal", "Certified true copy of SSM certificate"),
        ("visitor", "Sales", "Oliver Chan", (today - timedelta(hours=1)).isoformat(), "new", "high", "VIP client from Japan - security clearance needed"),
        ("meeting_prep", "Executive Office", "Sarah Lim", (today - timedelta(hours=3)).isoformat(), "in_progress", "urgent", "Board pack compilation for Sep 25"),
        ("gift", "Sales", "Peter Liew", (today - timedelta(days=2)).isoformat(), "completed", "normal", "Corporate gift for client appreciation dinner"),
        ("travel", "Product", "Carmen Wong", (today - timedelta(hours=6)).isoformat(), "assigned", "normal", "Hotel booking for KL conference"),
        ("document", "HR", "Irene Teo", (today - timedelta(days=3)).isoformat(), "completed", "low", "Employment verification letter"),
    ]
    cur.executemany(
        "INSERT INTO ea_requests (request_type, requester_dept, requester_name, created_date, status, priority, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
        requests
    )


def seed_contracts(cur):
    """Seed contract lifecycle."""
    cur.execute("DELETE FROM ea_contracts")
    contracts = [
        ("CloudInfra Sdn Bhd", "IT Services", 280000.00, "2025-01-01", "2026-12-31", "renewal_pending", 0.85, "Ahmad Bin Ali", "Performance review scheduled Oct"),
        ("SecureGuard Pte Ltd", "Security", 95000.00, "2024-06-01", "2026-09-30", "urgent_renewal", 0.72, "Tan Wei Ming", "Expiring in 17 days - negotiate rates"),
        ("OfficePlus Supplies", "Office Supplies", 45000.00, "2025-03-01", "2027-02-28", "active", 0.91, "Lee Mei Hua", "Auto-renewal clause"),
        ("TalentBridge Recruitment", "HR Services", 120000.00, "2025-07-01", "2026-06-30", "expired", 0.65, "Raj Patel", "Underperformance - consider alternative vendors"),
        ("NetConnect Telecom", "Telecommunications", 180000.00, "2024-01-01", "2026-12-31", "active", 0.88, "Siti Nurhaliza", "Bundle discount eligible"),
        ("CleanPro Facilities", "Facilities Management", 75000.00, "2025-09-01", "2026-08-31", "negotiation", 0.78, "Kumar Subramaniam", "Rate increase requested - benchmarking"),
        ("LegalEase Advisory", "Legal Services", 200000.00, "2025-04-01", "2027-03-31", "active", 0.93, "Wong Chee Keong", "Retainer agreement"),
        ("DataVault Storage", "Cloud Storage", 55000.00, "2025-11-01", "2026-10-31", "review_due", 0.82, "Ng Pei Yi", "Usage exceeding tier - upgrade discussion"),
    ]
    cur.executemany(
        "INSERT INTO ea_contracts (vendor_name, contract_type, value_myr, start_date, expiry_date, renewal_status, performance_score, contact_person, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        contracts
    )


def seed_policies(cur):
    """Seed policy documents."""
    cur.execute("DELETE FROM ea_policies")
    policies = [
        ("Remote Work Policy", "HR", "2025-08-15", "2026-08-15", "James Ong", "overdue", "v2.1"),
        ("Gift & Hospitality Guidelines", "Compliance", "2026-01-10", "2027-01-10", "Legal Dept", "active", "v3.0"),
        ("Travel Authorization Procedure", "Finance", "2026-03-20", "2027-03-20", "Henry Koh", "active", "v1.5"),
        ("Information Security Policy", "IT", "2025-11-01", "2026-11-01", "Rajesh Kumar", "review_due", "v4.0"),
        ("Whistleblower Protection Policy", "Governance", "2026-05-01", "2027-05-01", "Audit Committee", "active", "v2.0"),
        ("Procurement SOP", "Procurement", "2025-06-15", "2026-06-15", "Nina Phua", "overdue", "v3.2"),
        ("Data Retention Policy", "Compliance", "2026-02-28", "2027-02-28", "Legal Dept", "active", "v1.0"),
        ("Meeting Minutes Standard", "Governance", "2026-07-01", "2027-07-01", "Sarah Lim", "active", "v2.5"),
    ]
    cur.executemany(
        "INSERT INTO ea_policies (policy_name, category, last_review_date, next_review_date, owner, status, version) VALUES (?, ?, ?, ?, ?, ?, ?)",
        policies
    )


def seed_visitors(cur):
    """Seed visitor schedule."""
    cur.execute("DELETE FROM ea_visitors")
    today = datetime.now()
    visitors = [
        ("Tanaka Hiroshi", "Nippon Corp", today.isoformat(), "Sales", "Partnership Discussion", "valid", "cleared", 0, "VIP - Japanese delegation"),
        ("Sarah Johnson", "GlobalTech Inc", (today + timedelta(days=1)).isoformat(), "Engineering", "Technical Integration", "expiring", "pending", 0, "NDA expires in 5 days"),
        ("Ahmad Faisal", "Local Vendor Sdn Bhd", (today + timedelta(days=2)).isoformat(), "Procurement", "Supplier Audit", "valid", "cleared", 250.00, "Lunch hospitality - within LHDN threshold"),
        ("Priya Sharma", "IndiaSoft Solutions", (today + timedelta(days=3)).isoformat(), "IT", "Vendor Evaluation", "invalid", "blocked", 0, "NDA expired - do not admit until renewed"),
        ("Michael Chen", "SG Capital Partners", (today + timedelta(days=5)).isoformat(), "Finance", "Investor Relations", "valid", "cleared", 0, "Confidential - board-level discussion"),
        ("Lim Wei Jie", "Regulatory Consultant", (today + timedelta(days=7)).isoformat(), "Compliance", "SST Advisory", "valid", "cleared", 180.00, "Tea meeting - compliant"),
    ]
    cur.executemany(
        "INSERT INTO ea_visitors (visitor_name, company, visit_date, host_dept, purpose, nda_status, security_clearance, gift_value_myr, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        visitors
    )


def seed_rooms(cur):
    """Seed meeting rooms."""
    cur.execute("DELETE FROM ea_rooms")
    rooms = [
        ("Boardroom A", 20, "Level 15", "Projector, Video Conf, Whiteboard", 0.87, "09:00-11:00, 14:00-16:00", "Book 48h ahead for board meetings"),
        ("Meeting Room B", 10, "Level 12", "TV Screen, Whiteboard", 0.62, "10:00-12:00", "First-come-first-served for dept meetings"),
        ("Meeting Room C", 8, "Level 12", "TV Screen", 0.45, "15:00-17:00", "Available for ad-hoc use"),
        ("Training Room", 30, "Level 3", "Projector, Microphone, Recording", 0.78, "09:00-17:00", "Priority for HR training sessions"),
        ("Interview Room 1", 4, "Level 8", "Webcam, Soundproof", 0.55, "10:00-16:00", "HR booking priority"),
        ("Executive Lounge", 12, "Level 15", "Catering Available, Privacy", 0.33, "Variable", "CEO/CFO approval required"),
    ]
    cur.executemany(
        "INSERT INTO ea_rooms (room_name, capacity, floor, equipment, utilization_pct, peak_hours, booking_policy) VALUES (?, ?, ?, ?, ?, ?, ?)",
        rooms
    )


def main():
    print(f"📦 Seeding EA demo data into {DB_PATH}...")
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        sys.exit(1)
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    try:
        ensure_tables(cur)
        seed_executives(cur)
        seed_approvals(cur)
        seed_governance_events(cur)
        seed_requests(cur)
        seed_contracts(cur)
        seed_policies(cur)
        seed_visitors(cur)
        seed_rooms(cur)
        conn.commit()
        
        # Print summary
        tables = ["ea_executives", "ea_approvals", "ea_governance_events", "ea_requests", 
                  "ea_contracts", "ea_policies", "ea_visitors", "ea_rooms"]
        print("\n✅ EA Demo Data Seeded Successfully:")
        for table in tables:
            count = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"   • {table}: {count} records")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error seeding data: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
