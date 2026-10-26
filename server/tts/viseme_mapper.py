"""
Standalone Viseme Mapping and Audio Energy Modulation Module.
Maps phonetic speech cues to visual mouth blendshapes and modulates intensities via RMS energy.
"""

import math
from typing import List, Dict, Any
import numpy as np


# Standard Phoneme-to-Viseme Mapping Table
PHONEME_TO_VISEME_MAP = {
    # Silence / Pause
    "sil": "sil", "_": "sil", "pau": "sil", "": "sil",

    # Open Vowels (AA / AH)
    "aa": "aa", "ah": "aa", "ae": "aa", "ay": "aa", "aw": "aa",
    "a": "aa", "ar": "aa",

    # Spread Vowels (EE / IH)
    "ee": "ee", "ey": "ee", "ih": "ee", "iy": "ee", "eh": "ee",
    "y": "ee", "i": "ee",

    # Rounded Vowels (OO / UW)
    "oo": "oo", "uw": "oo", "uh": "oo", "w": "oo", "u": "oo",

    # Round Open Vowels (OH / AO)
    "oh": "oh", "ao": "oh", "ow": "oh", "oy": "oh", "o": "oh",

    # Palatals / Affricates (CH / SH / J / S)
    "ch": "ch", "sh": "ch", "jh": "ch", "zh": "ch", "s": "ch",
    "z": "ch", "th": "ch", "dh": "ch",

    # Labiodentals (F / V)
    "f": "fv", "v": "fv",

    # Bilabials (M / B / P)
    "m": "mbp", "b": "mbp", "p": "mbp",
}


class VisemeMapper:
    """Calculates and modulates visual speech cues from text and audio."""

    def __init__(self):
        self.default_viseme = "aa"

    def text_to_visemes(self, text: str, total_duration_sec: float) -> List[Dict[str, Any]]:
        """
        Estimates timed viseme sequence from text letters/words if phoneme alignments are absent.
        """
        words = text.strip().split()
        if not words or total_duration_sec <= 0:
            return [{"viseme": "sil", "time": 0.0, "intensity": 0.0}]

        cues: List[Dict[str, Any]] = []
        cues.append({"viseme": "sil", "time": 0.0, "intensity": 0.0})

        # Letter to rough viseme mapping
        char_map = {
            'a': 'aa', 'e': 'ee', 'i': 'ee', 'o': 'oh', 'u': 'oo',
            'm': 'mbp', 'b': 'mbp', 'p': 'mbp',
            'f': 'fv', 'v': 'fv',
            's': 'ch', 'c': 'ch', 'j': 'ch', 'z': 'ch', 't': 'ch', 'd': 'ch',
            'w': 'oo', 'y': 'ee', 'r': 'oh', 'l': 'aa', 'k': 'aa', 'g': 'aa'
        }

        # Collect speaking units
        units = []
        for word in words:
            word_clean = ''.join(c.lower() for c in word if c.isalnum())
            if not word_clean:
                continue
            for char in word_clean:
                viseme = char_map.get(char, 'aa')
                units.append(viseme)
            units.append('sil')  # Inter-word micro pause

        if not units:
            return [{"viseme": "sil", "time": 0.0, "intensity": 0.0}]

        duration_per_unit = total_duration_sec / max(1, len(units))
        current_time = 0.04

        for viseme in units:
            if current_time >= total_duration_sec:
                break
            intensity = 0.0 if viseme == "sil" else 0.75
            cues.append({
                "viseme": viseme,
                "time": round(current_time, 3),
                "intensity": intensity
            })
            current_time += duration_per_unit

        cues.append({"viseme": "sil", "time": round(total_duration_sec, 3), "intensity": 0.0})
        return cues

    def modulate_with_audio_energy(
        self,
        cues: List[Dict[str, Any]],
        audio_samples: np.ndarray,
        sample_rate: int = 22050
    ) -> List[Dict[str, Any]]:
        """Modulates viseme cue intensities with true RMS audio energy."""
        if len(audio_samples) == 0 or not cues:
            return cues

        window_size = int(sample_rate * 0.05)  # 50ms window
        modulated_cues = []

        for cue in cues:
            t = cue["time"]
            viseme = cue["viseme"]
            base_intensity = cue["intensity"]

            if viseme == "sil":
                modulated_cues.append({"viseme": "sil", "time": t, "intensity": 0.0})
                continue

            center_sample = int(t * sample_rate)
            start_idx = max(0, center_sample - window_size // 2)
            end_idx = min(len(audio_samples), center_sample + window_size // 2)

            if end_idx > start_idx:
                chunk = audio_samples[start_idx:end_idx]
                rms = float(np.sqrt(np.mean(chunk ** 2)))
                # Normalize and clamp energy between 0.35 and 1.0
                norm_energy = min(1.0, max(0.35, rms * 5.0))
                modulated_intensity = round(base_intensity * norm_energy, 2)
            else:
                modulated_intensity = base_intensity

            modulated_cues.append({
                "viseme": viseme,
                "time": t,
                "intensity": modulated_intensity
            })

        return modulated_cues


viseme_mapper = VisemeMapper()
