"""
seed_facility_demo_data.py — Seed demo data for Facility Management tables.

Usage:
    python seed_facility_demo_data.py              # uses default web.db path
    python seed_facility_demo_data.py /path/to.db  # custom path

This script:
1. Deletes all existing facility table data
2. Inserts fictional locations, inspections, action items, and templates
3. Preserves table structure, tenants, and admin user
4. All data is completely fictional for demo purposes
"""

import sqlite3
import sys
import os
import json
import random
from datetime import datetime, timedelta, timezone

DB_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.shogun-os/web.db")

# ── Location Types & Templates ────────────────────────────────────────────────

LOCATION_TYPES = [
    "factory_floor", "hostel", "canteen", "toilet", "warehouse",
    "workshop", "parking", "construction", "office", "clinic",
]

DEFAULT_TEMPLATES = {
    "factory_floor": {
        "display_name": "Factory / Production Floor",
        "scoring_weights": {"safety": 0.35, "ppe": 0.30, "cleanliness": 0.20, "assets": 0.15},
        "checklist": [
            {"category": "safety", "item": "Fire extinguisher visible and accessible", "critical": True},
            {"category": "safety", "item": "Emergency exit signs illuminated", "critical": True},
            {"category": "safety", "item": "Machine guards in place", "critical": True},
            {"category": "safety", "item": "No blocked walkways or aisles", "critical": False},
            {"category": "safety", "item": "Electrical panels closed and labeled", "critical": False},
            {"category": "safety", "item": "First aid kit accessible", "critical": False},
            {"category": "ppe", "item": "Workers wearing hard hats", "critical": True, "applies_when": "people visible"},
            {"category": "ppe", "item": "Safety shoes worn", "critical": True, "applies_when": "people visible"},
            {"category": "ppe", "item": "Safety goggles worn where required", "critical": False, "applies_when": "people visible"},
            {"category": "ppe", "item": "Hearing protection in noisy areas", "critical": False, "applies_when": "people visible"},
            {"category": "ppe", "item": "Gloves worn when handling materials", "critical": False, "applies_when": "people visible"},
            {"category": "cleanliness", "item": "Floor free of oil/liquid spills", "critical": False},
            {"category": "cleanliness", "item": "Waste bins present and not overflowing", "critical": False},
            {"category": "cleanliness", "item": "Work surfaces clean and organized", "critical": False},
            {"category": "cleanliness", "item": "No accumulated debris or scrap", "critical": False},
            {"category": "assets", "item": "Machinery appears well-maintained", "critical": False},
            {"category": "assets", "item": "Safety signage visible and legible", "critical": False},
            {"category": "assets", "item": "Lighting adequate for work area", "critical": False},
        ],
        "expected_assets": ["fire_extinguisher", "first_aid_kit", "emergency_exit_sign", "safety_signage", "machine_guards"],
        "min_photos": 3,
        "photo_guidance": "Take wide shot of production line + close-ups of safety equipment and PPE compliance",
    },
    "hostel": {
        "display_name": "Worker Hostel / Quarters",
        "scoring_weights": {"cleanliness": 0.30, "hygiene": 0.25, "safety": 0.25, "assets": 0.20},
        "checklist": [
            {"category": "cleanliness", "item": "Floor swept and mopped", "critical": False},
            {"category": "cleanliness", "item": "Bedding clean and tidy", "critical": False},
            {"category": "cleanliness", "item": "No mold or mildew on walls/ceiling", "critical": True},
            {"category": "cleanliness", "item": "Windows and ventilation clean", "critical": False},
            {"category": "hygiene", "item": "Toilet facilities clean and functional", "critical": True},
            {"category": "hygiene", "item": "Handwashing station with soap available", "critical": True},
            {"category": "hygiene", "item": "No pest infestation signs", "critical": True},
            {"category": "hygiene", "item": "Drinking water available", "critical": False},
            {"category": "safety", "item": "Fire extinguisher accessible", "critical": True},
            {"category": "safety", "item": "Emergency exit clear and marked", "critical": True},
            {"category": "safety", "item": "Electrical wiring safe (no exposed wires)", "critical": True},
            {"category": "safety", "item": "Smoke detector installed", "critical": False},
            {"category": "assets", "item": "Furniture in good condition", "critical": False},
            {"category": "assets", "item": "Fans/AC operational", "critical": False},
            {"category": "assets", "item": "Lockers/storage available", "critical": False},
        ],
        "expected_assets": ["bed", "mattress", "fan", "locker", "fire_extinguisher", "smoke_detector"],
        "min_photos": 3,
        "photo_guidance": "Photograph room overview, bathroom, and any damage or maintenance issues",
    },
    "canteen": {
        "display_name": "Canteen / Dining Hall",
        "scoring_weights": {"hygiene": 0.35, "cleanliness": 0.30, "safety": 0.20, "assets": 0.15},
        "checklist": [
            {"category": "hygiene", "item": "Food preparation area sanitized", "critical": True},
            {"category": "hygiene", "item": "Utensils and dishes clean", "critical": True},
            {"category": "hygiene", "item": "Food stored at proper temperature", "critical": True},
            {"category": "hygiene", "item": "Staff wearing hairnets/gloves", "critical": True, "applies_when": "staff visible"},
            {"category": "hygiene", "item": "Handwashing station stocked", "critical": True},
            {"category": "cleanliness", "item": "Dining tables wiped clean", "critical": False},
            {"category": "cleanliness", "item": "Floor clean and dry", "critical": False},
            {"category": "cleanliness", "item": "Trash bins emptied regularly", "critical": False},
            {"category": "cleanliness", "item": "No food residue on surfaces", "critical": False},
            {"category": "safety", "item": "Fire extinguisher in kitchen area", "critical": True},
            {"category": "safety", "item": "Gas/electrical connections safe", "critical": True},
            {"category": "safety", "item": "Non-slip flooring in wet areas", "critical": False},
            {"category": "assets", "item": "Refrigeration units operational", "critical": False},
            {"category": "assets", "item": "Adequate seating capacity", "critical": False},
            {"category": "assets", "item": "Ventilation/exhaust fans working", "critical": False},
        ],
        "expected_assets": ["refrigerator", "stove", "sink", "fire_extinguisher", "dining_tables", "handwash_station"],
        "min_photos": 3,
        "photo_guidance": "Photograph kitchen prep area, dining hall, and food storage areas",
    },
    "toilet": {
        "display_name": "Toilet / Washroom",
        "scoring_weights": {"hygiene": 0.40, "cleanliness": 0.35, "safety": 0.15, "assets": 0.10},
        "checklist": [
            {"category": "hygiene", "item": "Soap dispenser filled", "critical": True},
            {"category": "hygiene", "item": "Hand dryer/paper towels available", "critical": True},
            {"category": "hygiene", "item": "Toilets flushed and clean", "critical": True},
            {"category": "hygiene", "item": "No foul odor", "critical": False},
            {"category": "hygiene", "item": "Sanitizer dispenser filled", "critical": False},
            {"category": "cleanliness", "item": "Floor dry and clean", "critical": False},
            {"category": "cleanliness", "item": "Tiles/grout free of mold", "critical": False},
            {"category": "cleanliness", "item": "Mirrors clean", "critical": False},
            {"category": "cleanliness", "item": "Waste bin present and emptied", "critical": False},
            {"category": "safety", "item": "Non-slip floor mats in place", "critical": False},
            {"category": "safety", "item": "Adequate lighting", "critical": False},
            {"category": "safety", "item": "No leaking pipes or fixtures", "critical": True},
            {"category": "assets", "item": "All faucets functional", "critical": False},
            {"category": "assets", "item": "Door locks working", "critical": False},
            {"category": "assets", "item": "Ventilation fan operational", "critical": False},
        ],
        "expected_assets": ["soap_dispenser", "hand_dryer", "toilet", "sink", "mirror", "waste_bin"],
        "min_photos": 2,
        "photo_guidance": "Photograph overall washroom condition and close-ups of fixtures",
    },
    "warehouse": {
        "display_name": "Warehouse / Storage",
        "scoring_weights": {"safety": 0.35, "cleanliness": 0.25, "assets": 0.25, "hygiene": 0.15},
        "checklist": [
            {"category": "safety", "item": "Fire extinguishers accessible and tagged", "critical": True},
            {"category": "safety", "item": "Emergency exits unblocked", "critical": True},
            {"category": "safety", "item": "Racking stable and not overloaded", "critical": True},
            {"category": "safety", "item": "Walkways clearly marked and clear", "critical": False},
            {"category": "safety", "item": "Forklift paths designated", "critical": False},
            {"category": "safety", "item": "Hazardous materials properly stored", "critical": True},
            {"category": "cleanliness", "item": "Floor swept and free of debris", "critical": False},
            {"category": "cleanliness", "item": "No water leaks or puddles", "critical": False},
            {"category": "cleanliness", "item": "Pallets stacked neatly", "critical": False},
            {"category": "cleanliness", "item": "Loading dock area clean", "critical": False},
            {"category": "assets", "item": "Shelving/racking in good condition", "critical": False},
            {"category": "assets", "item": "Lighting adequate throughout", "critical": False},
            {"category": "assets", "item": "Signage clear and legible", "critical": False},
            {"category": "assets", "item": "Loading equipment operational", "critical": False},
            {"category": "hygiene", "item": "Pest control measures in place", "critical": False},
            {"category": "hygiene", "item": "No rodent/insect activity signs", "critical": True},
        ],
        "expected_assets": ["fire_extinguisher", "racking", "pallets", "forklift", "loading_dock", "signage"],
        "min_photos": 3,
        "photo_guidance": "Photograph storage aisles, racking conditions, and loading areas",
    },
    "workshop": {
        "display_name": "Maintenance Workshop",
        "scoring_weights": {"safety": 0.35, "ppe": 0.25, "cleanliness": 0.20, "assets": 0.20},
        "checklist": [
            {"category": "safety", "item": "Fire extinguisher accessible", "critical": True},
            {"category": "safety", "item": "Machine guards in place", "critical": True},
            {"category": "safety", "item": "Electrical panels closed and labeled", "critical": True},
            {"category": "safety", "item": "Chemicals properly labeled and stored", "critical": True},
            {"category": "safety", "item": "First aid kit stocked", "critical": False},
            {"category": "safety", "item": "Lockout/tagout procedures posted", "critical": False},
            {"category": "ppe", "item": "Safety glasses available", "critical": True, "applies_when": "people visible"},
            {"category": "ppe", "item": "Gloves available for chemical handling", "critical": False, "applies_when": "people visible"},
            {"category": "ppe", "item": "Steel-toe boots worn", "critical": False, "applies_when": "people visible"},
            {"category": "ppe", "item": "Hearing protection available", "critical": False, "applies_when": "people visible"},
            {"category": "cleanliness", "item": "Workbenches organized", "critical": False},
            {"category": "cleanliness", "item": "Oil/grease spills cleaned", "critical": False},
            {"category": "cleanliness", "item": "Tools returned to storage", "critical": False},
            {"category": "cleanliness", "item": "Waste disposal bins present", "critical": False},
            {"category": "assets", "item": "Power tools in good condition", "critical": False},
            {"category": "assets", "item": "Ventilation system operational", "critical": False},
            {"category": "assets", "item": "Tool inventory board maintained", "critical": False},
        ],
        "expected_assets": ["fire_extinguisher", "first_aid_kit", "workbench", "tool_board", "ventilation_fan", "chemical_cabinet"],
        "min_photos": 3,
        "photo_guidance": "Photograph workshop overview, tool storage, and safety equipment",
    },
    "parking": {
        "display_name": "Parking Area",
        "scoring_weights": {"safety": 0.40, "cleanliness": 0.30, "assets": 0.30},
        "checklist": [
            {"category": "safety", "item": "Parking lines clearly marked", "critical": False},
            {"category": "safety", "item": "Speed bumps/signs visible", "critical": False},
            {"category": "safety", "item": "Pedestrian walkways designated", "critical": True},
            {"category": "safety", "item": "Lighting adequate (night inspection)", "critical": True},
            {"category": "safety", "item": "Fire lane kept clear", "critical": True},
            {"category": "safety", "item": "No unauthorized vehicles", "critical": False},
            {"category": "cleanliness", "item": "Surface free of potholes/cracks", "critical": False},
            {"category": "cleanliness", "item": "No litter or debris", "critical": False},
            {"category": "cleanliness", "item": "Drainage channels clear", "critical": False},
            {"category": "cleanliness", "item": "Vegetation trimmed", "critical": False},
            {"category": "assets", "item": "Signage legible and upright", "critical": False},
            {"category": "assets", "item": "Barriers/bollards intact", "critical": False},
            {"category": "assets", "item": "CCTV cameras operational", "critical": False},
        ],
        "expected_assets": ["parking_lines", "speed_bump", "signage", "lighting_pole", "cctv_camera", "barrier"],
        "min_photos": 2,
        "photo_guidance": "Photograph parking lot overview and any surface damage or signage issues",
    },
    "construction": {
        "display_name": "Construction Zone",
        "scoring_weights": {"safety": 0.40, "ppe": 0.30, "cleanliness": 0.15, "assets": 0.15},
        "checklist": [
            {"category": "safety", "item": "Perimeter fencing secure", "critical": True},
            {"category": "safety", "item": "Warning signs posted at entry points", "critical": True},
            {"category": "safety", "item": "Scaffolding stable and tagged", "critical": True},
            {"category": "safety", "item": "Fall protection in place for heights", "critical": True},
            {"category": "safety", "item": "Excavation shoring adequate", "critical": True, "applies_when": "excavation present"},
            {"category": "safety", "item": "First aid station on site", "critical": False},
            {"category": "ppe", "item": "Hard hats worn by all workers", "critical": True, "applies_when": "people visible"},
            {"category": "ppe", "item": "High-visibility vests worn", "critical": True, "applies_when": "people visible"},
            {"category": "ppe", "item": "Safety boots worn", "critical": True, "applies_when": "people visible"},
            {"category": "ppe", "item": "Eye protection worn for cutting/grinding", "critical": False, "applies_when": "people visible"},
            {"category": "ppe", "item": "Hearing protection in noisy zones", "critical": False, "applies_when": "people visible"},
            {"category": "cleanliness", "item": "Construction waste contained", "critical": False},
            {"category": "cleanliness", "item": "Site access roads passable", "critical": False},
            {"category": "assets", "item": "Safety barriers in place", "critical": False},
            {"category": "assets", "item": "Material storage organized", "critical": False},
        ],
        "expected_assets": ["fencing", "warning_signs", "scaffolding", "first_aid_station", "safety_barriers", "material_storage"],
        "min_photos": 4,
        "photo_guidance": "Photograph site perimeter, active work zones, PPE compliance, and material storage",
    },
    "office": {
        "display_name": "Office Space",
        "scoring_weights": {"cleanliness": 0.30, "safety": 0.30, "assets": 0.25, "hygiene": 0.15},
        "checklist": [
            {"category": "cleanliness", "item": "Desks and surfaces clean", "critical": False},
            {"category": "cleanliness", "item": "Floor vacuumed/mopped", "critical": False},
            {"category": "cleanliness", "item": "Common areas tidy", "critical": False},
            {"category": "cleanliness", "item": "Kitchenette/break room clean", "critical": False},
            {"category": "safety", "item": "Fire extinguisher accessible", "critical": True},
            {"category": "safety", "item": "Emergency exit routes posted", "critical": True},
            {"category": "safety", "item": "Electrical cords managed (no trip hazards)", "critical": False},
            {"category": "safety", "item": "Ergonomic workstation setup", "critical": False},
            {"category": "safety", "item": "First aid kit available", "critical": False},
            {"category": "assets", "item": "HVAC system functioning", "critical": False},
            {"category": "assets", "item": "Lighting adequate", "critical": False},
            {"category": "assets", "item": "Office furniture in good condition", "critical": False},
            {"category": "assets", "item": "IT equipment organized", "critical": False},
            {"category": "hygiene", "item": "Restrooms clean and stocked", "critical": False},
            {"category": "hygiene", "item": "Hand sanitizer available", "critical": False},
        ],
        "expected_assets": ["fire_extinguisher", "first_aid_kit", "exit_sign", "hvac_unit", "desk", "chair"],
        "min_photos": 2,
        "photo_guidance": "Photograph office overview and common areas",
    },
    "clinic": {
        "display_name": "Clinic / Medical Room",
        "scoring_weights": {"hygiene": 0.35, "safety": 0.25, "cleanliness": 0.25, "assets": 0.15},
        "checklist": [
            {"category": "hygiene", "item": "Medical instruments sterilized", "critical": True},
            {"category": "hygiene", "item": "Surfaces disinfected between patients", "critical": True},
            {"category": "hygiene", "item": "Sharps containers present and not full", "critical": True},
            {"category": "hygiene", "item": "Hand hygiene stations stocked", "critical": True},
            {"category": "hygiene", "item": "Medical waste properly segregated", "critical": True},
            {"category": "safety", "item": "Medications stored securely", "critical": True},
            {"category": "safety", "item": "Fire extinguisher accessible", "critical": True},
            {"category": "safety", "item": "Emergency equipment (AED/oxygen) checked", "critical": True},
            {"category": "safety", "item": "Biohazard signage displayed", "critical": False},
            {"category": "cleanliness", "item": "Waiting area clean and organized", "critical": False},
            {"category": "cleanliness", "item": "Examination rooms spotless", "critical": False},
            {"category": "cleanliness", "item": "Restrooms sanitized", "critical": False},
            {"category": "assets", "item": "Medical supplies adequately stocked", "critical": False},
            {"category": "assets", "item": "Equipment calibrated and maintained", "critical": False},
            {"category": "assets", "item": "Records storage secure", "critical": False},
        ],
        "expected_assets": ["medical_cabinet", "examination_bed", "sterilizer", "sharps_container", "fire_extinguisher", "aed"],
        "min_photos": 3,
        "photo_guidance": "Photograph treatment room, supply storage, and hygiene stations",
    },
}

# ── Locations ──────────────────────────────────────────────────────────────────

LOCATIONS = [
    ("Factory A - Line 1", "factory_floor", "Shogun Industrial Park", 1200.0, "Ahmad Razak", "weekly"),
    ("Factory A - Line 2", "factory_floor", "Shogun Industrial Park", 980.0, "Ahmad Razak", "weekly"),
    ("Hostel Block 3 Unit 5", "hostel", "Estate Quarters", 45.0, "Siti Aminah", "monthly"),
    ("Hostel Block 3 Unit 12", "hostel", "Estate Quarters", 45.0, "Siti Aminah", "monthly"),
    ("Main Canteen", "canteen", "Shogun Industrial Park", 250.0, "Lim Wei Chen", "daily"),
    ("Toilet Block A (Male)", "toilet", "Shogun Industrial Park", 30.0, "Kumar Rajan", "daily"),
    ("Toilet Block B (Female)", "toilet", "Shogun Industrial Park", 28.0, "Kumar Rajan", "daily"),
    ("Warehouse C - Raw Materials", "warehouse", "Shogun Industrial Park", 800.0, "Tan Boon Huat", "weekly"),
    ("Workshop B - Maintenance", "workshop", "Shogun Industrial Park", 180.0, "Muthu Arasan", "weekly"),
    ("Visitor Parking Lot", "parking", "Shogun Industrial Park", 600.0, None, "monthly"),
    ("Construction Zone 1 - New Wing", "construction", "Shogun Industrial Park", 450.0, "Chong Wei Ming", "daily"),
    ("Admin Office Building", "office", "Shogun HQ", 320.0, "Nurul Huda", "monthly"),
    ("Site Clinic", "clinic", "Estate Quarters", 65.0, "Dr. Priya Nair", "weekly"),
]

# ── Inspectors ─────────────────────────────────────────────────────────────────

INSPECTORS = [
    "Ahmad Razak", "Siti Aminah", "Lim Wei Chen", "Kumar Rajan",
    "Tan Boon Huat", "Muthu Arasan", "Nurul Huda", "Dr. Priya Nair",
    "Chong Wei Ming", "System AI",
]

# ── Action Item Definitions ────────────────────────────────────────────────────

ACTION_ITEM_POOL = [
    ("urgent", "safety", "Fire extinguisher missing from east wall mount"),
    ("urgent", "safety", "Blocked emergency exit — pallets stacked in front"),
    ("high", "safety", "Exposed electrical wiring near ceiling junction box"),
    ("high", "ppe", "3 out of 5 workers observed without hard hats"),
    ("high", "hygiene", "Mold growth detected on bathroom ceiling corner"),
    ("high", "cleanliness", "Oil spill on factory floor not cordoned off"),
    ("medium", "cleanliness", "Waste bins overflowing in canteen area"),
    ("medium", "assets", "Broken window latch in hostel unit bedroom"),
    ("medium", "safety", "Emergency exit sign bulb burnt out"),
    ("medium", "hygiene", "Soap dispenser empty in male toilet block"),
    ("medium", "assets", "Fan not operational in hostel room 12B"),
    ("low", "cleanliness", "Minor scuff marks on corridor walls"),
    ("low", "assets", "Faded safety signage near warehouse entrance"),
    ("low", "cleanliness", "Grass overgrowth along parking lot perimeter"),
    ("medium", "safety", "Cracked tile on canteen floor — trip hazard"),
    ("high", "safety", "Scaffolding missing cross-brace on level 2"),
    ("medium", "hygiene", "Pest droppings found near warehouse loading bay"),
    ("low", "assets", "Office chair hydraulic cylinder failing"),
]


def _random_date_in_range(start_days_ago: int, end_days_ago: int = 0) -> datetime:
    """Return a random datetime within a range of days ago."""
    delta = timedelta(days=random.randint(end_days_ago, start_days_ago))
    base = datetime.now(timezone.utc) - delta
    # Randomize time within business hours (7am-6pm)
    hour = random.randint(7, 17)
    minute = random.randint(0, 59)
    return base.replace(hour=hour, minute=minute, second=0, microsecond=0)


def _score_to_rating(score: float) -> str:
    if score >= 85:
        return "Excellent"
    elif score >= 70:
        return "Good"
    elif score >= 55:
        return "Moderate"
    elif score >= 40:
        return "Poor"
    else:
        return "Critical"


def _generate_scores(template: dict) -> tuple:
    """Generate realistic category scores based on template weights."""
    weights = template["scoring_weights"]
    scores = {}
    weighted_sum = 0.0
    total_weight = 0.0

    for category, weight in weights.items():
        # Generate a score biased toward Good/Moderate range (50-90)
        base = random.gauss(72, 15)
        score = max(15, min(100, round(base)))
        rating = _score_to_rating(score)
        scores[category] = {"score": score, "rating": rating}
        weighted_sum += score * weight
        total_weight += weight

    overall = round(weighted_sum / total_weight) if total_weight > 0 else 70
    overall = max(15, min(100, overall))
    return scores, overall, _score_to_rating(overall)


def _generate_checklist_results(template: dict) -> list:
    """Generate realistic checklist pass/fail results."""
    results = []
    for item in template.get("checklist", []):
        # Critical items more likely to pass (they get fixed faster)
        pass_rate = 0.85 if item.get("critical") else 0.72
        passed = random.random() < pass_rate
        result = {
            "item": item["item"],
            "pass": passed,
            "category": item["category"],
            "critical": item.get("critical", False),
        }
        if not passed:
            result["evidence"] = f"Visual non-compliance observed during inspection"
        results.append(result)
    return results


def _ensure_tables(cur):
    """Create facility tables if they don't exist (for demo/dev environments)."""
    cur.execute("""
        CREATE TABLE IF NOT EXISTS facility_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            name VARCHAR(256) NOT NULL,
            location_type VARCHAR(64) NOT NULL,
            site_name VARCHAR(256),
            area_sqm FLOAT,
            responsible_person VARCHAR(256),
            inspection_frequency VARCHAR(32) NOT NULL DEFAULT 'monthly',
            last_inspection_date DATETIME,
            last_overall_score FLOAT,
            last_overall_rating VARCHAR(64),
            status VARCHAR(32) NOT NULL DEFAULT 'active',
            notes TEXT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS facility_inspections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            location_id INTEGER NOT NULL,
            inspected_by VARCHAR(256) NOT NULL DEFAULT '',
            inspection_date DATETIME NOT NULL,
            photos JSON NOT NULL DEFAULT '[]',
            location_type_snapshot VARCHAR(64),
            scores JSON,
            overall_score FLOAT,
            overall_rating VARCHAR(64),
            checklist_results JSON,
            action_items JSON,
            ai_raw_response TEXT,
            created_at DATETIME NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS facility_action_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            inspection_id INTEGER NOT NULL,
            location_id INTEGER NOT NULL,
            priority VARCHAR(32) NOT NULL DEFAULT 'medium',
            category VARCHAR(64) NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            photo_ref INTEGER,
            status VARCHAR(32) NOT NULL DEFAULT 'open',
            assigned_to VARCHAR(256),
            resolved_at DATETIME,
            resolved_by VARCHAR(256),
            created_at DATETIME NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS facility_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            location_type VARCHAR(64) NOT NULL,
            display_name VARCHAR(128) NOT NULL DEFAULT '',
            scoring_weights JSON,
            checklist JSON,
            expected_assets JSON,
            min_photos INTEGER NOT NULL DEFAULT 2,
            photo_guidance VARCHAR(512) NOT NULL DEFAULT 'Take wide shot of area + close-ups of specific concerns',
            is_system_default BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """)


def seed():
    print(f"📦 Seeding demo Facility data into: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")
    cur = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    # Ensure tables exist (for dev/demo environments before migration runs)
    _ensure_tables(cur)
    conn.commit()

    # Get tenant_id
    tenant = cur.execute("SELECT id FROM tenants LIMIT 1").fetchone()
    if not tenant:
        print("❌ No tenant found. Run the app first to create one.")
        return
    tid = tenant[0]
    print(f"   Tenant ID: {tid}")

    # ── Clear all facility tables ──
    facility_tables = [
        "facility_action_items",
        "facility_inspections",
        "facility_locations",
        "facility_templates",
    ]
    for t in facility_tables:
        try:
            cur.execute(f"DELETE FROM {t}")
            print(f"   ✓ Cleared {t}")
        except Exception as e:
            print(f"   ⚠ Skipped {t}: {e}")

    # ── Templates (all 10 location types) ──
    template_count = 0
    for loc_type, tmpl in DEFAULT_TEMPLATES.items():
        cur.execute("""
            INSERT INTO facility_templates (
                tenant_id, location_type, display_name, scoring_weights,
                checklist, expected_assets, min_photos, photo_guidance,
                is_system_default, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tid, loc_type, tmpl["display_name"],
            json.dumps(tmpl["scoring_weights"]),
            json.dumps(tmpl["checklist"]),
            json.dumps(tmpl["expected_assets"]),
            tmpl["min_photos"],
            tmpl["photo_guidance"],
            1,  # is_system_default
            now, now,
        ))
        template_count += 1
    print(f"   ✓ Inserted {template_count} templates")

    # ── Locations ──
    location_ids = {}
    for name, loc_type, site, area, responsible, freq in LOCATIONS:
        # Assign a last inspection date and score for realism
        last_insp = _random_date_in_range(45, 1)
        tmpl = DEFAULT_TEMPLATES.get(loc_type, DEFAULT_TEMPLATES["office"])
        _, last_score, last_rating = _generate_scores(tmpl)

        cur.execute("""
            INSERT INTO facility_locations (
                tenant_id, name, location_type, site_name, area_sqm,
                responsible_person, inspection_frequency,
                last_inspection_date, last_overall_score, last_overall_rating,
                status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tid, name, loc_type, site, area, responsible, freq,
            last_insp.isoformat(), last_score, last_rating,
            "active", None, now, now,
        ))
        location_ids[name] = cur.lastrowid
    print(f"   ✓ Inserted {len(LOCATIONS)} locations")

    # ── Inspections (25 records spanning last 3 months) ──
    inspection_ids = []
    location_names = list(location_ids.keys())

    for i in range(25):
        loc_name = random.choice(location_names)
        loc_id = location_ids[loc_name]
        loc_type = None
        for n, lt, *_ in LOCATIONS:
            if n == loc_name:
                loc_type = lt
                break
        tmpl = DEFAULT_TEMPLATES.get(loc_type, DEFAULT_TEMPLATES["office"])

        insp_date = _random_date_in_range(90, 0)
        inspector = random.choice(INSPECTORS)
        scores, overall, rating = _generate_scores(tmpl)
        checklist_results = _generate_checklist_results(tmpl)

        # Generate some action items from failed checklist items
        failed_items = [r for r in checklist_results if not r["pass"]]
        ai_action_items = []
        for fi in failed_items[:3]:  # Max 3 action items per inspection
            ai_action_items.append({
                "priority": "high" if fi.get("critical") else "medium",
                "category": fi["category"],
                "description": f"Fix: {fi['item']}",
                "status": "open",
            })

        cur.execute("""
            INSERT INTO facility_inspections (
                tenant_id, location_id, inspected_by, inspection_date,
                photos, location_type_snapshot, scores, overall_score,
                overall_rating, checklist_results, action_items,
                ai_raw_response, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tid, loc_id, inspector, insp_date.isoformat(),
            json.dumps([]),  # photos — empty for demo
            loc_type,
            json.dumps(scores),
            overall, rating,
            json.dumps(checklist_results),
            json.dumps(ai_action_items),
            None,  # ai_raw_response
            now,
        ))
        inspection_ids.append((cur.lastrowid, loc_id, loc_name))
    print(f"   ✓ Inserted {len(inspection_ids)} inspections")

    # ── Action Items (18 items across various statuses) ──
    action_count = 0
    statuses_pool = ["open", "open", "open", "in_progress", "in_progress", "resolved", "resolved", "dismissed"]
    assignees = ["Ahmad Razak", "Kumar Rajan", "Muthu Arasan", "Tan Boon Huat", "Chong Wei Ming", None]

    # Create action items from pool, linking to random inspections
    for priority, category, description in ACTION_ITEM_POOL:
        insp_id, loc_id, loc_name = random.choice(inspection_ids)
        status = random.choice(statuses_pool)
        assigned = random.choice(assignees)
        resolved_at = None
        resolved_by = None

        if status == "resolved":
            resolved_at = _random_date_in_range(14, 0).isoformat()
            resolved_by = assigned or random.choice([a for a in assignees if a])
        elif status == "dismissed":
            resolved_at = _random_date_in_range(14, 0).isoformat()
            resolved_by = "System AI"

        cur.execute("""
            INSERT INTO facility_action_items (
                tenant_id, inspection_id, location_id, priority, category,
                description, photo_ref, status, assigned_to,
                resolved_at, resolved_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tid, insp_id, loc_id, priority, category, description,
            None,  # photo_ref
            status, assigned,
            resolved_at, resolved_by,
            now,
        ))
        action_count += 1
    print(f"   ✓ Inserted {action_count} action items")

    conn.commit()
    conn.close()

    # ── Verify ──
    conn = sqlite3.connect(DB_PATH)
    print("\n📊 Verification:")
    total_records = 0
    for t in facility_tables:
        try:
            count = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            total_records += count
            if count > 0:
                print(f"   {t:45s} {count:>5} rows")
        except Exception:
            pass
    conn.close()

    print(f"\n✅ Demo data seeded successfully! ({total_records} total records)")

    return {
        "success": True,
        "locations": len(LOCATIONS),
        "templates": template_count,
        "records_created": total_records,
    }


if __name__ == "__main__":
    result = seed()
    if result:
        print(json.dumps(result, indent=2))
