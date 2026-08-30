"""
seed_hr_demo_data.py — Replace ALL HR data in web.db with fictional demo data.

Usage:
    python seed_hr_demo_data.py              # uses default web.db path
    python seed_hr_demo_data.py /path/to.db  # custom path

This script:
1. Deletes all existing HR table data
2. Inserts fictional employees, jobs, candidates, onboarding, equipment, training, meetings
3. Preserves table structure, tenants, and admin user
4. All names, emails, phones are completely fictional
"""

import sqlite3
import sys
import os
import random
from datetime import datetime, timedelta

DB_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.shogun-os/web.db")

# ── Fictional Data ──────────────────────────────────────────────────────────

DEPARTMENTS = ["Engineering", "Product", "Marketing", "Finance", "HR", "Operations", "Sales", "Design"]

EMPLOYEES = [
    ("Alice Tan", "Engineering", "Senior Backend Engineer", "Bob Lee", "2023-03-15", "+6012-345-6789"),
    ("Bob Lee", "Engineering", "Engineering Manager", None, "2021-06-01", "+6012-456-7890"),
    ("Carmen Wong", "Product", "Product Manager", "David Ng", "2022-09-10", "+6013-567-8901"),
    ("David Ng", "Product", "Head of Product", None, "2020-01-20", "+6013-678-9012"),
    ("Emma Chong", "Marketing", "Digital Marketing Lead", "Frank Tan", "2023-07-01", "+6014-789-0123"),
    ("Frank Tan", "Marketing", "Marketing Director", None, "2019-11-15", "+6014-890-1234"),
    ("Grace Lim", "Finance", "Senior Accountant", "Henry Koh", "2022-04-01", "+6015-901-2345"),
    ("Henry Koh", "Finance", "Finance Manager", None, "2020-08-10", "+6015-012-3456"),
    ("Irene Teo", "HR", "HR Executive", "James Ong", "2023-01-15", "+6016-123-4567"),
    ("James Ong", "HR", "HR Manager", None, "2021-03-01", "+6016-234-5678"),
    ("Kevin Yap", "Engineering", "DevOps Engineer", "Bob Lee", "2023-05-20", "+6017-345-6780"),
    ("Lisa Goh", "Engineering", "Frontend Developer", "Bob Lee", "2024-01-10", "+6017-456-7891"),
    ("Marcus Sim", "Operations", "Operations Analyst", "Nina Phua", "2023-08-01", "+6018-567-8902"),
    ("Nina Phua", "Operations", "Operations Manager", None, "2021-09-15", "+6018-678-9013"),
    ("Oliver Chan", "Sales", "Business Development Exec", "Peter Liew", "2024-02-01", "+6019-789-0124"),
    ("Peter Liew", "Sales", "Sales Director", None, "2020-05-01", "+6019-890-1235"),
    ("Qian Yu", "Design", "UI/UX Designer", "David Ng", "2023-11-01", "+6012-901-2346"),
    ("Rachel Au", "Engineering", "QA Engineer", "Bob Lee", "2024-03-15", "+6013-012-3457"),
    ("Samuel Ho", "Engineering", "AI/ML Engineer", "Bob Lee", "2022-07-01", "+6014-123-4568"),
    ("Tina Low", "Finance", "Accounts Payable Clerk", "Henry Koh", "2024-06-01", "+6015-234-5679"),
]

JOB_OPENINGS = [
    ("Senior Fullstack Developer", "Active", "Engineering", "Full Time", "3+ years", 9000, "Bob Lee", "2026-01-15", "Build scalable web apps using React + Python."),
    ("Product Designer", "Active", "Design", "Full Time", "2+ years", 6500, "David Ng", "2026-02-01", "Design intuitive user experiences for SaaS products."),
    ("Marketing Coordinator", "Draft", "Marketing", "Full Time", "1+ year", 4500, "Frank Tan", "2026-03-01", "Support digital campaigns and content creation."),
    ("Junior Backend Engineer", "Active", "Engineering", "Full Time", "0-1 year", 4000, "Bob Lee", "2026-01-20", "Learn and grow with our engineering team."),
    ("HR Intern", "Draft", "HR", "Internship", "0", 1500, "James Ong", "2026-04-01", "Assist with recruitment and employee engagement."),
    ("Data Analyst", "Active", "Operations", "Contract", "2+ years", 5500, "Nina Phua", "2026-02-15", "Analyze operational data and build dashboards."),
    ("Sales Executive", "Closed - Hired", "Sales", "Full Time", "1+ year", 5000, "Peter Liew", "2025-10-01", "Drive B2B sales in Southeast Asia."),
    ("DevOps Specialist", "Closed - Cancelled", "Engineering", "Full Time", "3+ years", 8000, "Bob Lee", "2025-09-01", "Manage CI/CD pipelines and cloud infrastructure."),
    ("Content Writer", "Draft", "Marketing", "Contract", "1+ year", 3500, "Emma Chong", "2026-05-01", "Create blog posts, case studies, and social content."),
    ("QA Automation Engineer", "Active", "Engineering", "Full Time", "2+ years", 7000, "Bob Lee", "2026-03-15", "Build automated test suites for web and API."),
]

CANDIDATE_FIRST_NAMES = [
    "Amir", "Siti", "Wei", "Priya", "Johan", "Mei Ling", "Arjun", "Fatimah",
    "Chen", "Nurul", "Raj", "Yuki", "Hassan", "Lin", "Dev", "Aisha",
    "Ming", "Zara", "Kai", "Hana", "Omar", "Xin", "Ravi", "Dewi",
    "Leo", "Sakura", "Ali", "Jun", "Sanjay", "Wen",
]

CANDIDATE_LAST_NAMES = [
    "Ahmad", "Tan", "Kumar", "Lee", "Lim", "Ng", "Wong", "Chen",
    "Ong", "Teo", "Goh", "Sim", "Phua", "Chan", "Liew", "Au",
    "Ho", "Low", "Yap", "Chong", "Koh", "Tay", "Seah", "Foo",
    "Pang", "Ang", "Mok", "Lam", "Chia", "Tham",
]

ROLES = [
    "Software Engineer", "Backend Developer", "Frontend Developer", "DevOps Engineer",
    "Product Manager", "UI/UX Designer", "Data Analyst", "QA Engineer",
    "Marketing Executive", "Sales Representative", "HR Coordinator", "Technical Writer",
]

SOURCES = ["LinkedIn", "JobStreet", "Hiredly", "Referral", "Company Website", "Indeed", "Glassdoor"]
CANDIDATE_TYPES = ["fulltime", "intern", "contract"]
STATUSES = [
    "Resume Received", "Screening", "Shortlisted", "1st Interview",
    "Manager Interview", "Offer Sent", "Hired", "Rejected", "No Response",
]

ONBOARDING_STAFF = ["Lisa Goh", "Rachel Au", "Tina Low"]
EQUIPMENT_ITEMS = [
    ("MacBook Pro 14\"", "Laptop", "Good", "Alice Tan", "2025-06-01", "2026-06-01", False),
    ("Dell Monitor 27\"", "Monitor", "Good", "Kevin Yap", "2025-09-15", "2026-03-15", True),
    ("Logitech MX Master", "Peripheral", "Fair", None, None, None, False),
    ("Standing Desk", "Furniture", "Good", "Samuel Ho", "2025-03-01", "2026-09-01", False),
    ("iPad Air", "Tablet", "Good", "Qian Yu", "2026-01-10", "2026-07-10", False),
]

TRAINING_PROGRAMS = [
    ("AWS Cloud Fundamentals", "Kevin Yap", "Sarah External", "Online", "2026-02-01", "2026-02-03", 1500),
    ("Leadership Workshop", "Bob Lee", "Dr. Amy Chen", "In-Person", "2026-03-15", "2026-03-16", 3000),
    ("Python Advanced", "Lisa Goh", "Tech Academy MY", "Online", "2026-04-01", "2026-04-05", 2000),
]

MEETINGS = [
    ("Weekly Engineering Sync", "Bob Lee", "2026-08-25", "Completed", "Weekly"),
    ("Q3 Planning Session", "David Ng", "2026-08-20", "Completed", "Quarterly"),
    ("HR Policy Review", "James Ong", "2026-09-01", "Scheduled", "Monthly"),
]


def seed():
    print(f"📦 Seeding demo HR data into: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()

    # Get tenant_id
    tenant = cur.execute("SELECT id FROM tenants LIMIT 1").fetchone()
    if not tenant:
        print("❌ No tenant found. Run the app first to create one.")
        return
    tid = tenant[0]
    print(f"   Tenant ID: {tid}")

    # ── Clear all HR tables ──
    hr_tables = [
        "hr_candidate_events", "hr_candidate_files", "hr_candidates",
        "hr_employees", "hr_equipment", "hr_equipment_logs",
        "hr_interviews", "hr_job_openings",
        "hr_meeting_action_items", "hr_meeting_attendees", "hr_meetings",
        "hr_onboarding_checklist_items", "hr_onboarding_checklist_progress",
        "hr_onboarding_tasks", "hr_performance_reviews",
        "hr_trainers", "hr_training", "hr_training_participants",
    ]
    for t in hr_tables:
        try:
            cur.execute(f"DELETE FROM {t}")
            print(f"   ✓ Cleared {t}")
        except Exception as e:
            print(f"   ⚠ Skipped {t}: {e}")

    # ── Employees ──
    for name, dept, role, mgr, hire, phone in EMPLOYEES:
        cur.execute("""
            INSERT INTO hr_employees (tenant_id, notion_page_id, employees_name, department,
                role, manager_name, date_of_hire, phone_number, q1, q2, q3, q4, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, f"demo-{name.lower().replace(' ','-')}", name, dept, role, mgr, hire, phone,
              random.choice(["Exceeds", "Meets", "Meets"]),
              random.choice(["Exceeds", "Meets", "Meets"]),
              random.choice(["Exceeds", "Meets", "Below"]),
              random.choice(["Exceeds", "Meets", "Meets", "Below"]),
              now, now))
    print(f"   ✓ Inserted {len(EMPLOYEES)} employees")

    # ── Job Openings ──
    job_ids = {}
    for title, status, dept, etype, exp, budget, hm, app_start, desc in JOB_OPENINGS:
        jd_link = f"https://docs.example.com/jd/{title.lower().replace(' ', '-')}"
        cur.execute("""
            INSERT INTO hr_job_openings (tenant_id, notion_page_id, job_title, job_status,
                department, employment_type, experience, budget_max, hiring_manager,
                application_start, job_description, jd_link, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, f"demo-job-{title.lower().replace(' ','-')}", title, status, dept, etype,
              exp, budget, hm, app_start, desc, jd_link, now, now))
        job_ids[title] = cur.lastrowid
    print(f"   ✓ Inserted {len(JOB_OPENINGS)} job openings")

    # ── Candidates (smaller set: ~50) ──
    candidate_ids = []
    for i in range(50):
        fname = random.choice(CANDIDATE_FIRST_NAMES)
        lname = random.choice(CANDIDATE_LAST_NAMES)
        name = f"{fname} {lname}"
        email = f"{fname.lower()}.{lname.lower()}@example.com"
        phone = f"+60{random.randint(10,19)}-{random.randint(100,999)}-{random.randint(1000,9999)}"
        role = random.choice(ROLES)
        source = random.choice(SOURCES)
        ctype = random.choice(CANDIDATE_TYPES)
        status = random.choice(STATUSES)
        entry = (datetime.utcnow() - timedelta(days=random.randint(1, 180))).strftime("%Y-%m-%d")
        in_pipeline = 1 if status not in ("Hired", "Rejected", "No Response") else 0

        # Assign to a random active/draft job
        job_title = random.choice([j[0] for j in JOB_OPENINGS if j[1] in ("Active", "Draft")])
        job_id = job_ids.get(job_title)

        cur.execute("""
            INSERT INTO hr_candidates (tenant_id, notion_page_id, name, email, phone_no,
                role, status, source, candidate_type, date_entry, in_pipeline, job_opening_id,
                created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, f"demo-cand-{i}", name, email, phone, role, status, source, ctype,
              entry, in_pipeline, job_id, now, now))
        candidate_ids.append(cur.lastrowid)
    print(f"   ✓ Inserted 50 candidates")

    # ── Candidate Events (a few per candidate) ──
    event_count = 0
    for cid in candidate_ids[:15]:
        events = [
            ("stage_move", "Moved to Screening", None, "Screening"),
            ("comment", "Strong technical background", None, None),
            ("decision", "Shortlisted for interview", "Screening", "Shortlisted"),
        ]
        for etype, note, from_s, to_s in random.sample(events, min(2, len(events))):
            cur.execute("""
                INSERT INTO hr_candidate_events (tenant_id, candidate_id, event_type, note,
                    from_status, to_status, actor_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (tid, cid, etype, note, from_s, to_s, "Irene Teo", now))
            event_count += 1
    print(f"   ✓ Inserted {event_count} candidate events")

    # ── Onboarding Tasks ──
    for staff in ONBOARDING_STAFF:
        start = (datetime.utcnow() - timedelta(days=random.randint(5, 30))).strftime("%Y-%m-%d")
        end = (datetime.utcnow() + timedelta(days=random.randint(10, 60))).strftime("%Y-%m-%d")
        status = random.choice(["In progress", "Done"])
        cur.execute("""
            INSERT INTO hr_onboarding_tasks (tenant_id, notion_page_id, staff_name, department,
                start_date, end_date, status, assigned_to, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, f"demo-onb-{staff.lower().replace(' ','-')}", staff,
              random.choice(DEPARTMENTS), start, end, status, "Irene Teo", now, now))
    print(f"   ✓ Inserted {len(ONBOARDING_STAFF)} onboarding tasks")

    # ── Onboarding Checklist Items ──
    checklist = [
        ("Sign employment contract", "HR Documents"),
        ("Submit IC and bank details", "HR Documents"),
        ("Complete tax form (TP1)", "HR Documents"),
        ("Setup email and Slack", "IT Setup"),
        ("Collect laptop and badge", "IT Setup"),
        ("Install dev environment", "IT Setup"),
        ("Meet team members", "Orientation"),
        ("Review company handbook", "Orientation"),
        ("Complete safety briefing", "Orientation"),
        ("Set up HRIS profile", "HR Documents"),
    ]
    item_ids = []
    for i, (title, section) in enumerate(checklist):
        cur.execute("""
            INSERT INTO hr_onboarding_checklist_items (tenant_id, title, description, section, sort_order, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (tid, title, "", section, i, "admin", now))
        item_ids.append(cur.lastrowid)
    print(f"   ✓ Inserted {len(checklist)} checklist items")

    # ── Checklist Progress ──
    prog_count = 0
    for staff in ONBOARDING_STAFF:
        for iid in item_ids:
            completed = random.choice([True, True, True, False])
            cur.execute("""
                INSERT INTO hr_onboarding_checklist_progress (tenant_id, staff_name, item_id, completed, completed_at, completed_by)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (tid, staff, iid, 1 if completed else 0, now if completed else None, "system" if completed else None))
            prog_count += 1
    print(f"   ✓ Inserted {prog_count} checklist progress records")

    # ── Equipment ──
    for ename, cat, cond, assigned, pdate, rdate, returned in EQUIPMENT_ITEMS:
        notion_id = "demo-eq-" + ename.lower().replace(' ', '-').replace('"', '')
        cur.execute("""
            INSERT INTO hr_equipment (tenant_id, notion_page_id, equipment_name, category,
                condition, assigned_to, purchase_date, return_due_date, returned, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, notion_id, ename, cat,
              cond, assigned, pdate, rdate, 1 if returned else 0, now, now))
    print(f"   ✓ Inserted {len(EQUIPMENT_ITEMS)} equipment items")

    # ── Training ──
    for tname, staff, trainer, fmt, start, end, charges in TRAINING_PROGRAMS:
        cur.execute("""
            INSERT INTO hr_training (tenant_id, notion_page_id, training_name, staff_name,
                trainer_name, training_format, start_date, end_date, training_charges,
                exam_included, bond_agreement, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, f"demo-train-{tname.lower().replace(' ','-')}", tname, staff, trainer, fmt,
              start, end, charges, 0, 0, now, now))
    print(f"   ✓ Inserted {len(TRAINING_PROGRAMS)} training programs")

    # ── Trainers ──
    trainers = [
        ("Sarah External", "Cloud & DevOps", "sarah@example.com", "+6012-111-2222"),
        ("Dr. Amy Chen", "Leadership & Management", "amy.chen@example.com", "+6013-333-4444"),
    ]
    for tname, spec, email, phone in trainers:
        cur.execute("""
            INSERT INTO hr_trainers (tenant_id, notion_page_id, name, specialization,
                contact_email, phone_number, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, f"demo-trainer-{tname.lower().replace(' ','-')}", tname, spec, email, phone, now, now))
    print(f"   ✓ Inserted {len(trainers)} trainers")

    # ── Meetings ──
    for mtitle, organizer, mdate, mstatus, mtype in MEETINGS:
        cur.execute("""
            INSERT INTO hr_meetings (tenant_id, notion_page_id, meeting_title, meeting_organizer,
                meeting_date, meeting_status, meeting_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, f"demo-mtg-{mtitle.lower().replace(' ','-')}", mtitle, organizer, mdate, mstatus, mtype, now, now))
    print(f"   ✓ Inserted {len(MEETINGS)} meetings")

    # ── Performance Reviews ──
    reviews = [
        ("Alice Tan", "Engineering", "Exceeds Expectations", "High Performer", "Bob Lee", "2026-06-30"),
        ("Emma Chong", "Marketing", "Meets Expectations", "Solid Contributor", "Frank Tan", "2026-06-30"),
    ]
    for ename, dept, rating, level, mgr, rdate in reviews:
        cur.execute("""
            INSERT INTO hr_performance_reviews (tenant_id, notion_page_id, quarterly_performance,
                employee_name, department, performance_rating, performance_level, manager_name,
                review_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, f"demo-perf-{ename.lower().replace(' ','-')}", "Q2 2026", ename, dept, rating, level, mgr, rdate, now, now))
    print(f"   ✓ Inserted {len(reviews)} performance reviews")

    conn.commit()
    conn.close()

    # Verify
    conn = sqlite3.connect(DB_PATH)
    print("\n📊 Verification:")
    for t in hr_tables:
        try:
            count = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            if count > 0:
                print(f"   {t:45s} {count:>5} rows")
        except:
            pass
    conn.close()
    print("\n✅ Demo data seeded successfully!")


if __name__ == "__main__":
    seed()
