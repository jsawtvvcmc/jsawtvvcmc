"""
Utility functions for ABC Program Management System
"""
from datetime import datetime
from typing import Dict
import calendar

def generate_case_number(org_shortcode: str, project_code: str, month: int, sequence: int, case_type: str = "C") -> str:
    """
    Generate case number in format: [ORG_SHORT]-[PROJECT_CODE]-[MONTH]-[TYPE][SEQUENCE]
    
    Args:
        org_shortcode: Organization short code (e.g., JS)
        project_code: Project code (e.g., TAL)
        month: Month number (1-12)
        sequence: Sequence number
        case_type: "C" for Catching, "S" for Surgery
    
    Examples: 
        JS-TAL-JAN-C0001 (Catching)
        JS-TAL-JAN-S0001 (Surgery)
    """
    month_abbr = calendar.month_abbr[month].upper()[:3]
    return f"{org_shortcode}-{project_code}-{month_abbr}-{case_type}{sequence:04d}"

def get_current_month_abbr() -> str:
    """Get current month abbreviation (JAN, FEB, etc.)"""
    return calendar.month_abbr[datetime.now().month].upper()[:3]

async def get_next_case_number(db, org_shortcode: str = "JS", project_code: str = "TAL", case_type: str = "C") -> str:
    """
    Get the next case number for the current month
    Resets sequence at the start of each month
    
    Args:
        db: Database connection
        org_shortcode: Organization short code
        project_code: Project code
        case_type: "C" for Catching, "S" for Surgery
    
    Format: JS-TAL-JAN-C0001 (Catching) or JS-TAL-JAN-S0001 (Surgery)
    """
    current_month = datetime.now().month
    current_year = datetime.now().year
    month_abbr = get_current_month_abbr()
    
    # Pattern to match: JS-TAL-JAN-C or JS-TAL-JAN-S
    pattern = f"^{org_shortcode}-{project_code}-{month_abbr}-{case_type}"
    
    # Find the highest sequence number for current month and type
    cases = await db.cases.find(
        {
            "case_number": {"$regex": pattern},
            "created_at": {
                "$gte": datetime(current_year, current_month, 1).isoformat()
            }
        },
        {"case_number": 1, "_id": 0}
    ).to_list(None)
    
    if not cases:
        sequence = 1
    else:
        # Extract sequence numbers and find max
        sequences = []
        for case in cases:
            try:
                # Case number format: JS-TAL-JAN-C0012 -> extract 0012
                seq_str = case["case_number"].split("-")[-1]
                # Remove the type prefix (C or S)
                seq_str = seq_str[1:] if seq_str[0].isalpha() else seq_str
                sequences.append(int(seq_str))
            except (IndexError, ValueError):
                continue
        
        sequence = max(sequences) + 1 if sequences else 1
    
    return generate_case_number(org_shortcode, project_code, current_month, sequence, case_type)

def generate_password(first_name: str, mobile: str) -> str:
    """
    Generate password in format: [Random-Word]#[Last-4-Digits]
    For now using first name as the random word
    Example: Manoj#4455
    """
    last_4_digits = mobile[-4:] if len(mobile) >= 4 else mobile
    return f"{first_name.capitalize()}#{last_4_digits}"
