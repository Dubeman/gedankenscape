# EnCodec Compression API Backend

FastAPI server for neural audio compression using Facebook's EnCodec model.

## Setup

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Run the server:**
```bash
python server.py
```

Or with uvicorn directly:
```bash
uvicorn server:app --reload --port 8000
```

The server will start on `http://localhost:8000`

## API Endpoints

### `GET /api/health`
Check if the API and model are ready.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_name": "facebook/encodec_24khz"
}
```

### `POST /api/encode`
Encode audio file to codebook indices and latents.

**Request:** Multipart form data with audio file

**Response:**
```json
{
  "codebook_indices": [
    [1, 2, 3, ...],  // Level 1
    [4, 5, 6, ...],  // Level 2
    [7, 8, 9, ...],  // Level 3
    [10, 11, 12, ...] // Level 4
  ],
  "latents": [[...], [...]],
  "audio_metadata": {
    "duration": 10.5,
    "sample_rate": 24000,
    "num_frames": 252000,
    "num_codebooks": 4
  },
  "compression_metrics": {
    "compression_ratio": 0.15,
    "bits_per_second": 2400,
    "original_size_bytes": 504000,
    "compressed_size_bytes": 75600
  }
}
```

### `POST /api/decode`
Decode codebook indices back to audio.

**Request:**
```json
{
  "codebook_indices": [[...], [...]],
  "audio_metadata": {...}
}
```

**Response:** Audio file (WAV format)

## Model

The server uses `facebook/encodec_24khz` model from Hugging Face. The model will be automatically downloaded on first use (saved to `~/.cache/huggingface/`).

## Notes

- Audio is automatically resampled to 24kHz (EnCodec requirement)
- Model loads on server startup (or on first request if startup fails)
- Supports CUDA if available, falls back to CPU

