"""
EnCodec model service for audio compression
"""
import torch
import numpy as np
from transformers import EncodecModel, AutoProcessor
from typing import List
import logging

logger = logging.getLogger(__name__)


class EncodecService:
    """Service for encoding/decoding audio with EnCodec model"""
    
    def __init__(self, model_name: str = "facebook/encodec_24khz"):
        self.model_name = model_name
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._is_loaded = False
        
    def load_model(self):
        """Load EnCodec model and processor"""
        if self._is_loaded:
            return
            
        try:
            logger.info(f"Loading EnCodec model: {self.model_name}")
            logger.info(f"Using device: {self.device}")
            
            # Load processor first
            self.processor = AutoProcessor.from_pretrained(self.model_name)
            
            # Load model
            self.model = EncodecModel.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            
            self._is_loaded = True
            logger.info("EnCodec model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading EnCodec model: {e}")
            raise
    
    def encode(self, audio_array: np.ndarray, sample_rate: int = 24000):
        """
        Encode audio to codebook indices and latents
        
        Args:
            audio_array: Audio data as numpy array
            sample_rate: Sample rate of audio (will be resampled to model's rate)
            
        Returns:
            dict with codebook_indices, latents, and metadata
        """
        if not self._is_loaded:
            self.load_model()
        
        try:
            # Ensure audio is in the right format
            # EnCodec processor expects (samples,) for mono, not (1, samples)
            if len(audio_array.shape) == 2 and audio_array.shape[0] == 1:
                # If it's (1, samples), flatten to (samples,)
                audio_array = audio_array.flatten()
            elif len(audio_array.shape) == 1:
                # Already 1D, keep as is
                pass
            else:
                # Multiple channels - take first channel
                audio_array = audio_array[0] if audio_array.shape[0] > 0 else audio_array.flatten()
            
            # Process audio - processor expects 1D array for mono
            try:
                inputs = self.processor(
                    raw_audio=audio_array,
                    sampling_rate=sample_rate,
                    return_tensors="pt"
                )
            except Exception as proc_error:
                raise
            
            # Move to device
            inputs = {k: v.to(self.device) if hasattr(v, 'to') else v for k, v in inputs.items()}
            
            # Encode - get both encoder embeddings and quantized outputs
            with torch.no_grad():
                # Get quantized outputs
                encoder_outputs = self.model.encode(
                    inputs["input_values"],
                    inputs["padding_mask"]
                )
                
                # Get encoder embeddings (before quantization)
                # Try different ways to access the encoder embeddings
                embeddings = None
                try:
                    # Method 1: Direct encoder access
                    if hasattr(self.model, 'encoder'):
                        embeddings = self.model.encoder(inputs["input_values"])
                    # Method 2: Check if encoder_outputs has embeddings
                    elif hasattr(encoder_outputs, 'embeddings'):
                        embeddings = encoder_outputs.embeddings
                    # Method 3: Check if encoder_outputs has hidden_states
                    elif hasattr(encoder_outputs, 'hidden_states') and encoder_outputs.hidden_states:
                        embeddings = encoder_outputs.hidden_states[-1]  # Last layer
                    # Method 4: Try to get from model's forward pass
                    else:
                        # Run encoder separately if available
                        if hasattr(self.model, 'encoder'):
                            embeddings = self.model.encoder(inputs["input_values"])
                except Exception as e:
                    logger.warning(f"Could not extract embeddings directly: {e}")
                    embeddings = None
            
            # Extract codebook indices (multi-level quantization)
            # EnCodec uses residual vector quantization with multiple levels
            codebook_indices = []
            if hasattr(encoder_outputs, 'audio_codes'):
                # audio_codes shape: [batch, num_codebooks, num_frames]
                codes = encoder_outputs.audio_codes
                if hasattr(codes, 'cpu'):
                    codes = codes.cpu().numpy()
                elif isinstance(codes, (list, tuple)):
                    codes = np.array(codes)
                else:
                    codes = np.array(codes)
                
                # Convert to list of lists for each quantization level
                # Handle different possible shapes
                if codes.ndim == 4:
                    # Shape: [batch, channels, num_codebooks, num_frames] or [batch, num_codebooks, channels, num_frames]
                    # Remove batch dimension first
                    codes = codes[0]  # Now [channels, num_codebooks, num_frames] or [num_codebooks, channels, num_frames]
                    
                    # Determine which dimension is codebooks
                    # Typically: [channels, num_codebooks, num_frames] where channels=1 for mono
                    # Or: [num_codebooks, channels, num_frames]
                    if codes.shape[0] == 1:
                        # Likely [channels=1, num_codebooks, num_frames]
                        # Remove channel dimension: [num_codebooks, num_frames]
                        codes = codes[0]  # Remove channel dimension
                        num_codebooks = codes.shape[0]
                        for level in range(num_codebooks):
                            level_indices = codes[level, :].flatten().tolist()
                            codebook_indices.append(level_indices)
                    elif codes.shape[1] == 1:
                        # Likely [num_codebooks, channels=1, num_frames]
                        # Remove channel dimension: [num_codebooks, num_frames]
                        codes = codes[:, 0, :]  # Keep codebooks and frames, remove channels
                        num_codebooks = codes.shape[0]
                        for level in range(num_codebooks):
                            level_indices = codes[level, :].flatten().tolist()
                            codebook_indices.append(level_indices)
                    else:
                        # Ambiguous - try to find the dimension with smallest size (likely codebooks)
                        # EnCodec typically has 4 codebooks, so look for dimension with size 2-4
                        dim_sizes = codes.shape
                        codebook_dim = None
                        for i, size in enumerate(dim_sizes):
                            if 2 <= size <= 8:  # Reasonable range for codebooks
                                codebook_dim = i
                                break
                        
                        if codebook_dim is not None:
                            num_codebooks = dim_sizes[codebook_dim]
                            # Extract along the codebook dimension
                            for level in range(num_codebooks):
                                if codebook_dim == 0:
                                    level_indices = codes[level, :, :].flatten().tolist()
                                elif codebook_dim == 1:
                                    level_indices = codes[:, level, :].flatten().tolist()
                                else:
                                    level_indices = codes[:, :, level].flatten().tolist()
                                codebook_indices.append(level_indices)
                        else:
                            # Fallback: assume last dimension is frames, extract from others
                            # Assume middle dimensions are codebooks, last is frames
                            # Reshape to [num_codebooks, num_frames]
                            total_elements = codes.size
                            num_frames = codes.shape[-1]
                            num_codebooks = total_elements // num_frames
                            codes_reshaped = codes.reshape(num_codebooks, num_frames)
                            for level in range(num_codebooks):
                                level_indices = codes_reshaped[level, :].flatten().tolist()
                                codebook_indices.append(level_indices)
                elif codes.ndim == 3:
                    # Shape: [batch, num_codebooks, num_frames]
                    # Remove batch dimension: [num_codebooks, num_frames]
                    codes = codes[0]  # Remove batch dimension
                    num_codebooks = codes.shape[0]
                    for level in range(num_codebooks):
                        # Extract as 1D array and convert to list of integers
                        level_indices = codes[level, :].flatten().tolist()
                        codebook_indices.append(level_indices)
                elif codes.ndim == 2:
                    # Shape: [num_codebooks, num_frames] or [num_frames, num_codebooks]
                    if codes.shape[0] < codes.shape[1]:
                        # Likely [num_codebooks, num_frames]
                        num_codebooks = codes.shape[0]
                        for level in range(num_codebooks):
                            level_indices = codes[level, :].flatten().tolist()
                            codebook_indices.append(level_indices)
                    else:
                        # Likely [num_frames, num_codebooks] - transpose
                        num_codebooks = codes.shape[1]
                        for level in range(num_codebooks):
                            level_indices = codes[:, level].flatten().tolist()
                            codebook_indices.append(level_indices)
                else:
                    # Unexpected shape, try to handle
                    # Fallback: assume first dimension is codebooks
                    if codes.ndim > 0:
                        for level in range(codes.shape[0]):
                            level_indices = codes[level].flatten().tolist()
                            codebook_indices.append(level_indices)
            
            # Extract latent representations (encoder embeddings before quantization)
            # Pydantic expects List[List[float]], so we need a list of lists
            latents = []
            
            try:
                # Get embeddings from encoder output
                # embeddings shape: [batch, channels, num_frames, embedding_dim]
                if embeddings is not None:
                    # Convert to numpy
                    if hasattr(embeddings, 'cpu'):
                        embeddings_np = embeddings.cpu().numpy()
                    else:
                        embeddings_np = np.array(embeddings)
                    
                    # Handle different possible shapes
                    if len(embeddings_np.shape) == 4:
                        # Shape: [batch, channels, num_frames, embedding_dim]
                        # Remove batch and channel dimensions: [num_frames, embedding_dim]
                        embeddings_np = embeddings_np[0, 0]  # Take first batch and channel
                    elif len(embeddings_np.shape) == 3:
                        # Shape: [batch, num_frames, embedding_dim]
                        embeddings_np = embeddings_np[0]  # Remove batch dimension
                    elif len(embeddings_np.shape) == 2:
                        # Shape: [num_frames, embedding_dim] - already correct
                        pass
                    else:
                        # Unexpected shape, try to reshape
                        logger.warning(f"Unexpected embeddings shape: {embeddings_np.shape}")
                        # Try to get [num_frames, embedding_dim]
                        if embeddings_np.size > 0:
                            # Assume last dimension is embedding_dim
                            embedding_dim = embeddings_np.shape[-1]
                            num_frames = embeddings_np.size // embedding_dim
                            embeddings_np = embeddings_np.reshape(num_frames, embedding_dim)
                    
                    # Convert to list of lists: each frame is a list of embedding values
                    latents = embeddings_np.tolist()
                    
                    logger.info(f"Extracted latent vectors: {len(latents)} frames, {len(latents[0]) if latents else 0} dimensions")
                else:
                    latents = [[]]
            except Exception as e:
                logger.warning(f"Could not extract latent embeddings: {e}")
                latents = [[]]
            
            # Ensure latents is always a valid list of lists (never None or empty)
            # Filter out None values and ensure proper structure
            if not latents:
                latents = [[]]
            else:
                # Clean up latents: remove None elements and ensure all are lists
                cleaned_latents = []
                for item in latents:
                    if item is None:
                        cleaned_latents.append([])
                    elif isinstance(item, (list, tuple)):
                        # Filter out None values and convert to float
                        cleaned_item = [float(x) for x in item if x is not None]
                        cleaned_latents.append(cleaned_item)
                    else:
                        # Single value, wrap in list
                        cleaned_latents.append([float(item)] if item is not None else [])
                latents = cleaned_latents if cleaned_latents else [[]]
            
            # Get audio metadata
            # audio_array is now 1D (flattened), so use len() directly
            duration = len(audio_array) / sample_rate
            num_frames = len(audio_array)
            
            # Calculate compression metrics
            original_size = num_frames * 2  # 16-bit audio = 2 bytes per sample
            compressed_size = sum(len(level) for level in codebook_indices) * 1  # 1 byte per codebook index
            compression_ratio = compressed_size / original_size if original_size > 0 else 0
            bits_per_second = (compressed_size * 8) / duration if duration > 0 else 0
            
            # Final validation: ensure latents is always List[List[float]]
            if not latents:
                latents = [[]]
            elif not isinstance(latents[0], (list, tuple)) if latents else True:
                # If first element is not a list, wrap the whole thing
                latents = [latents] if latents else [[]]
            # Ensure no None elements in the structure
            final_latents = []
            for item in latents:
                if item is None:
                    final_latents.append([])
                elif isinstance(item, (list, tuple)):
                    final_latents.append([float(x) for x in item if x is not None])
                else:
                    final_latents.append([float(item)] if item is not None else [])
            latents = final_latents if final_latents else [[]]
            
            return {
                "codebook_indices": codebook_indices,
                "latents": latents,
                "audio_metadata": {
                    "duration": float(duration),
                    "sample_rate": sample_rate,
                    "num_frames": int(num_frames),
                    "num_codebooks": len(codebook_indices)
                },
                "compression_metrics": {
                    "compression_ratio": float(compression_ratio),
                    "bits_per_second": float(bits_per_second),
                    "original_size_bytes": int(original_size),
                    "compressed_size_bytes": int(compressed_size)
                }
            }
            
        except Exception as e:
            logger.error(f"Error encoding audio: {e}")
            raise
    
    def decode(self, codebook_indices: List[List[int]], audio_metadata: dict):
        """
        Decode codebook indices back to audio
        
        Args:
            codebook_indices: Multi-level codebook indices
            audio_metadata: Original audio metadata
            
        Returns:
            numpy array of decoded audio
        """
        if not self._is_loaded:
            self.load_model()
        
        try:
            # Convert codebook indices to tensor
            # Shape: [batch, num_codebooks, num_frames]
            codes = torch.tensor([codebook_indices], dtype=torch.long).to(self.device)
            
            # Get scales (use default or from metadata if available)
            scales = None
            if "scales" in audio_metadata:
                scales = torch.tensor([audio_metadata["scales"]], dtype=torch.float32).to(self.device)
            
            # Create padding mask
            num_frames = len(codebook_indices[0]) if codebook_indices else 0
            padding_mask = torch.ones((1, num_frames), dtype=torch.bool).to(self.device)
            
            # Decode
            with torch.no_grad():
                audio_values = self.model.decode(
                    codes,
                    scales,
                    padding_mask
                )[0]
            
            # Convert to numpy
            audio_array = audio_values.cpu().numpy()
            
            return audio_array
            
        except Exception as e:
            logger.error(f"Error decoding audio: {e}")
            raise
    
    def is_loaded(self):
        """Check if model is loaded"""
        return self._is_loaded

