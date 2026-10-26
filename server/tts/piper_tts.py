"""
Standalone Piper Neural Text-to-Speech Engine.
Provides local speech synthesis and synchronized visemes for 3D digital human avatars.
"""

import base64
import io
from pathlib import Path
import time
from typing import Optional, Dict, Any, List
import wave
import numpy as np

try:
    from .viseme_mapper import viseme_mapper
except ImportError:
    from viseme_mapper import viseme_mapper


class PiperTTS:
    """Standalone Piper TTS Engine with synchronized visemes."""

    def __init__(self, model_path: Optional[str] = None, config_path: Optional[str] = None):
        # Search for model in local models/ or parent models/
        current_dir = Path(__file__).resolve().parent
        local_model = current_dir / "models" / "en_US-lessac-medium.onnx"
        parent_model = current_dir.parent / "models" / "en_US-lessac-medium.onnx"
        default_model = local_model if local_model.exists() else parent_model

        local_config = current_dir / "models" / "en_US-lessac-medium.onnx.json"
        parent_config = current_dir.parent / "models" / "en_US-lessac-medium.onnx.json"
        default_config = local_config if local_config.exists() else parent_config

        self.model_path = Path(model_path) if model_path else default_model
        self.config_path = Path(config_path) if config_path else default_config
        self._voice = None

    def _load_voice(self):
        if self._voice is None:
            if not self.model_path.exists():
                raise FileNotFoundError(
                    f"Piper voice model not found at {self.model_path}. "
                    f"Ensure the .onnx model is present in the models/ directory."
                )
            try:
                from piper import PiperVoice
            except ImportError:
                raise ImportError(
                    "piper-tts library not installed. Please install it using: pip install piper-tts"
                )

            self._voice = PiperVoice.load(
                str(self.model_path),
                config_path=str(self.config_path) if self.config_path.exists() else None,
                use_cuda=False
            )
        return self._voice

    def is_available(self) -> bool:
        """Check if model files exist."""
        return self.model_path.exists()

    def synthesize(self, text: str, speed: float = 1.0) -> Dict[str, Any]:
        """
        Synthesize text into WAV audio and calculate synchronized visemes.
        
        Returns:
            dict with:
                - audio_base64: Base64-encoded 22050Hz 16-bit mono WAV
                - sample_rate: 22050
                - duration_seconds: float
                - visemes: List[{"viseme": str, "time": float, "intensity": float}]
                - elapsed_sec: Synthesis computation time
        """
        if not text.strip():
            return {
                "audio_base64": "",
                "sample_rate": 22050,
                "duration_seconds": 0.0,
                "visemes": [],
                "elapsed_sec": 0.0
            }

        start_time = time.time()
        voice = self._load_voice()

        # Generate audio chunks
        chunks = list(voice.synthesize(text, include_alignments=True))
        all_pcm = b"".join(c.audio_int16_bytes for c in chunks)
        sample_rate = voice.config.sample_rate

        # Pack into standard WAV container
        wav_io = io.BytesIO()
        with wave.open(wav_io, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(all_pcm)

        wav_bytes = wav_io.getvalue()
        audio_samples = np.frombuffer(all_pcm, dtype=np.int16).astype(np.float32) / 32768.0
        duration_sec = len(audio_samples) / sample_rate

        # Compute visemes & modulate with audio RMS energy
        cues = viseme_mapper.text_to_visemes(text, duration_sec)
        cues = viseme_mapper.modulate_with_audio_energy(cues, audio_samples, sample_rate)

        b64_audio = base64.b64encode(wav_bytes).decode("ascii")
        elapsed = round(time.time() - start_time, 3)

        return {
            "audio_base64": b64_audio,
            "sample_rate": sample_rate,
            "duration_seconds": round(duration_sec, 2),
            "visemes": cues,
            "elapsed_sec": elapsed
        }


# Singleton instance for simple imports
piper_tts = PiperTTS()
