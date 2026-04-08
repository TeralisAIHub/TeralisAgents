from typing import List, Dict, Any


def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into 'buckets' time intervals,
    returning either raw counts or normalized [0.0–1.0].
    - timestamps: list of epoch ms timestamps.
    - counts: list of integer counts per timestamp.
    - buckets: number of buckets to split the time range into.
    - normalize: if True, scale values between 0 and 1.
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        return [round(val / m, 4) for val in agg]
    return agg


def generate_heatmap_with_metadata(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> Dict[str, Any]:
    """
    Generate a heatmap along with metadata such as bucket ranges.
    Returns dictionary with both data and ranges for better interpretation.
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return {"heatmap": [], "ranges": []}

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    heatmap = generate_activity_heatmap(timestamps, counts, buckets, normalize)

    ranges = []
    for i in range(buckets):
        start = t_min + i * bucket_size
        end = start + bucket_size
        ranges.append((int(start), int(end)))

    return {"heatmap": heatmap, "ranges": ranges}
