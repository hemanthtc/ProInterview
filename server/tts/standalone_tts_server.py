"""
Standalone TTS Microservice.
Run this script to launch a dedicated Piper TTS and Lip-Sync API server on localhost.

Usage:
    python standalone_tts_server.py --port 8001
"""

import argparse
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tts_api_router import router as tts_router

app = FastAPI(
    title="Piper TTS & Viseme Lip-Sync Service",
    description="Local high-performance neural speech synthesis with synchronized ARKit visemes",
    version="1.0.0"
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tts_router, prefix="/api/tts")

@app.get("/")
def root():
    return {
        "service": "Piper TTS & Viseme API",
        "docs": "/docs",
        "health": "/api/tts/health",
        "synthesize_endpoint": "/api/tts/synthesize"
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start Standalone Piper TTS Service")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8001, help="Port to bind (default: 8001)")
    args = parser.parse_args()

    print(f"Starting Standalone Piper TTS Service on http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
