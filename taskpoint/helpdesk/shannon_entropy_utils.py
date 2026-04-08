import math
from typing import List, Dict, Any


def compute_shannon_entropy(addresses: List[str]) -> float:
    """
    Compute Shannon entropy (in bits) of an address sequence.
    Entropy measures the unpredictability of the distribution.
    """
    if not addresses:
        return 0.0
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def entropy_breakdown(addresses: List[str]) -> Dict[str, Any]:
    """
    Return detailed breakdown of entropy calculation:
    - total addresses
    - unique addresses
    - probability distribution
    - entropy value
    """
    if not addresses:
        return {
            "total": 0,
            "unique": 0,
            "distribution": {},
            "entropy": 0.0,
        }

    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)
    probs = {addr: count / total for addr, count in freq.items()}

    entropy = -sum(p * math.log2(p) for p in probs.values())
    return {
        "total": total,
        "unique": len(freq),
        "distribution": {k: round(v, 4) for k, v in probs.items()},
        "entropy": round(entropy, 4),
    }
