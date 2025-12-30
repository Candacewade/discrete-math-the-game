from typing import Optional


def parse_int(s: str) -> Optional[int]:
    """Parse ints like '1,234' or ' 24 '. Return None if invalid."""
    try:
        cleaned = s.strip().replace(",", "")
        return int(cleaned)
    except Exception:
        return None
