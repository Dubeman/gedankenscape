"""
FastAPI server for EnCodec audio compression API
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import librosa
import soundfile as sf
import io
import logging
from models import EncodeResponse, DecodeRequest, HealthResponse
from encodec_service import EncodecService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="EnCodec Compression API", version="1.0.0")

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize EnCodec service
encodec_service = EncodecService()


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Check if the API and model are ready"""
    return HealthResponse(
        status="ok",
        model_loaded=encodec_service.is_loaded(),
        model_name=encodec_service.model_name if encodec_service.is_loaded() else None
    )


@app.post("/api/encode", response_model=EncodeResponse)
async def encode_audio(file: UploadFile = File(...)):
    """
    Encode audio file to codebook indices and latents
    
    Accepts audio file (wav, mp3, etc.) and returns compression data
    """
    try:
        # Read audio file
        contents = await file.read()
        
        # Try loading with temporary file approach for m4a
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.m4a') as tmp_file:
            tmp_file.write(contents)
            tmp_path = tmp_file.name
        
        try:
            # Load audio with librosa (handles resampling automatically)
            # EnCodec 24kHz expects 24kHz sample rate
            audio_array, sample_rate = librosa.load(
                tmp_path,
                sr=24000,  # EnCodec 24kHz model expects 24kHz
                mono=True
            )
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
        logger.info(f"Loaded audio: {len(audio_array)} samples at {sample_rate}Hz")
        
        # Ensure model is loaded
        if not encodec_service.is_loaded():
            encodec_service.load_model()
        
        # Encode audio
        result = encodec_service.encode(audio_array, sample_rate)
        
        logger.info(f"Encoded audio: {len(result['codebook_indices'])} codebook levels")
        
        return EncodeResponse(**result)
        
    except Exception as e:
        logger.error(f"Error in encode endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/decode")
async def decode_audio(request: DecodeRequest):
    """
    Decode codebook indices back to audio
    
    Accepts codebook indices and returns audio file
    """
    try:
        # Ensure model is loaded
        if not encodec_service.is_loaded():
            encodec_service.load_model()
        
        # Decode audio
        audio_array = encodec_service.decode(
            request.codebook_indices,
            request.audio_metadata
        )
        
        # Convert to WAV format
        audio_io = io.BytesIO()
        sf.write(audio_io, audio_array.T, 24000, format='WAV')
        audio_io.seek(0)
        
        return {
            "audio": audio_io.read(),
            "sample_rate": 24000
        }
        
    except Exception as e:
        logger.error(f"Error in decode endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("startup")
async def startup_event():
    """Load model on server startup"""
    logger.info("Starting EnCodec API server...")
    try:
        encodec_service.load_model()
        logger.info("Server ready")
    except Exception as e:
        logger.error(f"Failed to load model on startup: {e}")
        logger.warning("Model will be loaded on first request")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

