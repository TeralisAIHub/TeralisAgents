from typing import List, Dict, Any


def detect_volume_bursts(
    volumes: List[float],
    threshold_ratio: float = 1.5,
    min_interval: int = 1
) -> List[Dict[str, Any]]:
    """
    Identify indices where volume jumps by threshold_ratio over the previous value.
    Returns a list of dicts with detailed information:
    {index, previous, current, ratio}.
    - volumes: list of volume values.
    - threshold_ratio: multiplier that defines what counts as a burst (default: 1.5).
    - min_interval: minimum gap between detected bursts (in steps).
    """
    events: List[Dict[str, Any]] = []
    last_idx = -min_interval
    for i in range(1, len(volumes)):
        prev, curr = volumes[i - 1], volumes[i]
        ratio = (curr / prev) if prev > 0 else float("inf")
        if ratio >= threshold_ratio and (i - last_idx) >= min_interval:
            events.append({
                "index": i,
                "previous": round(prev, 4),
                "current": round(curr, 4),
                "ratio": round(ratio, 4),
            })
            last_idx = i
    return events


def summarize_bursts(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Provide a summary of detected bursts:
    - total events
    - highest ratio
    - average ratio
    """
    if not events:
        return {"total_events": 0, "highest_ratio": 0.0, "average_ratio": 0.0}

    ratios = [e["ratio"] for e in events]
    return {
        "total_events": len(events),
        "highest_ratio": max(ratios),
        "average_ratio": round(sum(ratios) / len(ratios), 4),
    }
