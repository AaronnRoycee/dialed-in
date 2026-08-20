from dataclasses import dataclass
from typing import Optional


@dataclass
class ShotContext:
    dose_g: float
    target_yield_g: float
    actual_yield_g: float
    target_time_s: float
    actual_time_s: float
    external_grind_setting: float
    internal_burr_setting: float
    overall_rating: Optional[float] = None
    descriptors: Optional[list[str]] = None


def recommend_next_shot(shot: ShotContext) -> dict:
    if not shot.descriptors:
        descriptors = []
    else:
        descriptors = [d.lower() for d in shot.descriptors]

    if "sour" in descriptors:
        return {
            "action": "grind finer",
            "value_change": -1,
            "keep_others": True,
            "reason": "Sour taste and likely under-extraction; grind finer.",
        }

    if "bitter" in descriptors or "harsh" in descriptors or "dry" in descriptors:
        return {
            "action": "grind coarser",
            "value_change": 1,
            "keep_others": True,
            "reason": "Bitter, harsh, or dry taste points to over-extraction; coarsen the grind.",
        }

    if shot.actual_time_s < shot.target_time_s * 0.85:
        return {
            "action": "grind finer",
            "value_change": -1,
            "keep_others": True,
            "reason": "Shot ran fast; tighten the grind to slow extraction.",
        }

    if shot.actual_time_s > shot.target_time_s * 1.15:
        return {
            "action": "grind coarser",
            "value_change": 1,
            "keep_others": True,
            "reason": "Shot ran slow; coarsen the grind to speed extraction.",
        }

    return {
        "action": "keep",
        "value_change": 0,
        "keep_others": True,
        "reason": "Shot is in the target window.",
    }
