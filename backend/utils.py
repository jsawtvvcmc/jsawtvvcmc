"""
Utility functions for ABC Program Management System
"""
from datetime import datetime
from typing import Dict
import calendar

def generate_case_number(project_code: str, month: int, sequence: int) -> str:
    """
    Generate case number in format: JS/[PROJECT-CODE]/[MONTH]-[SEQUENCE]
    Example: JS/TAL/JAN-0001
    """
    month_abbr = calendar.month_abbr[month].upper()
    return f"JS/{project_code}/{month_abbr}-{sequence:04d}"

def get_current_month_abbr() -> str:
    """Get current month abbreviation (JAN, FEB, etc.)"""
    return calendar.month_abbr[datetime.now().month].upper()

async def get_next_case_number(db, project_code: str) -> str:
    """
    Get the next case number for the current month
    Resets sequence at the start of each month
    """
    current_month = datetime.now().month
    current_year = datetime.now().year
    month_abbr = get_current_month_abbr()
    
    # Find the highest sequence number for current month
    pattern = f"JS/{project_code}/{month_abbr}-"
    cases = await db.cases.find(
        {
            "case_number": {"$regex": f"^{pattern}"},
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
                seq_str = case["case_number"].split("-")[-1]
                sequences.append(int(seq_str))
            except (IndexError, ValueError):
                continue
        
        sequence = max(sequences) + 1 if sequences else 1
    
    return generate_case_number(project_code, current_month, sequence)

def generate_password(first_name: str, mobile: str) -> str:
    """
    Generate password in format: [Random-Word]#[Last-4-Digits]
    For now using first name as the random word
    Example: Manoj#4455
    """
    last_4_digits = mobile[-4:] if len(mobile) >= 4 else mobile
    return f"{first_name.capitalize()}#{last_4_digits}"
