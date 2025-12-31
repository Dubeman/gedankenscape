"""
Data models/schemas for API requests and responses
"""
from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class EncodeResponse(BaseModel):
    """Response model for /api/encode endpoint"""
    codebook_indices: List[List[int]]  # Multi-level quantization indices
    latents: List[List[float]]  # Latent representations
    audio_metadata: dict
    compression_metrics: dict


class DecodeRequest(BaseModel):
    """Request model for /api/decode endpoint"""
    codebook_indices: List[List[int]]
    audio_metadata: dict


class HealthResponse(BaseModel):
    """Response model for /api/health endpoint"""
    model_config = ConfigDict(protected_namespaces=())
    
    status: str
    model_loaded: bool
    model_name: Optional[str] = None

