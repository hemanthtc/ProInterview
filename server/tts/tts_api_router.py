"""
FastAPI Router for Piper TTS & Visemes.
Can be mounted directly into any FastAPI application.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

try:
    from .piper_tts import piper_tts
except ImportError:
    from piper_tts import piper_tts

router = APIRouter(tags=["TTS & Lip-Sync"])


class SynthesizeRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize into speech")
    speed: float = Field(1.0, ge=0.5, le=2.0, description="Playback speech rate multiplier")


class SynthesizeResponse(BaseModel):
    audio_base64: str
    sample_rate: int
    duration_seconds: float
    visemes: List[Dict[str, Any]]
    elapsed_sec: float


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize_speech(req: SynthesizeRequest):
    """Synthesize text into WAV audio with synchronized ARKit visemes."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    try:
        result = piper_tts.synthesize(req.text, speed=req.speed)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis error: {str(e)}")


@router.get("/health")
async def tts_health():
    """Check health and model readiness."""
    available = piper_tts.is_available()
    return {
        "status": "healthy" if available else "degraded",
        "engine": "Piper ONNX",
        "model_path": str(piper_tts.model_path),
        "available": available
    }
