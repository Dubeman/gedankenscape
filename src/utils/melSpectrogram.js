/**
 * Mel-scale conversion utilities for audio visualization
 * Mel scale is perceptually more accurate than linear frequency scale
 */

/**
 * Convert frequency in Hz to mel scale
 * @param {number} hz - Frequency in Hz
 * @returns {number} - Frequency in mel scale
 */
export function hzToMel(hz) {
  return 2595 * Math.log10(1 + hz / 700)
}

/**
 * Convert mel scale to frequency in Hz
 * @param {number} mel - Frequency in mel scale
 * @returns {number} - Frequency in Hz
 */
export function melToHz(mel) {
  return 700 * (Math.pow(10, mel / 2595) - 1)
}

/**
 * Create a mel filter bank
 * @param {number} fftSize - Size of FFT (number of frequency bins)
 * @param {number} sampleRate - Audio sample rate in Hz
 * @param {number} nMelBins - Number of mel bins to create (default: 80)
 * @returns {Float32Array[]} - Array of filter bank weights (nMelBins × fftBins)
 */
export function createMelFilterBank(fftSize, sampleRate, nMelBins = 80) {
  const fftBins = fftSize / 2
  const nyquist = sampleRate / 2
  
  // Convert frequency range to mel scale
  const melMin = hzToMel(0)
  const melMax = hzToMel(nyquist)
  
  // Create evenly spaced mel points
  const melPoints = []
  for (let i = 0; i <= nMelBins + 1; i++) {
    melPoints.push(melMin + (melMax - melMin) * (i / (nMelBins + 1)))
  }
  
  // Convert mel points back to Hz
  const hzPoints = melPoints.map(mel => melToHz(mel))
  
  // Create filter bank
  const filterBank = []
  
  for (let i = 0; i < nMelBins; i++) {
    const filter = new Float32Array(fftBins)
    const leftHz = hzPoints[i]
    const centerHz = hzPoints[i + 1]
    const rightHz = hzPoints[i + 2]
    
    // Calculate which FFT bins correspond to these frequencies
    const leftBin = Math.floor((leftHz / nyquist) * fftBins)
    const centerBin = Math.floor((centerHz / nyquist) * fftBins)
    const rightBin = Math.floor((rightHz / nyquist) * fftBins)
    
    // Create triangular filter
    for (let j = leftBin; j < centerBin; j++) {
      if (j >= 0 && j < fftBins) {
        filter[j] = (j - leftBin) / (centerBin - leftBin)
      }
    }
    
    for (let j = centerBin; j < rightBin; j++) {
      if (j >= 0 && j < fftBins) {
        filter[j] = 1 - (j - centerBin) / (rightBin - centerBin)
      }
    }
    
    filterBank.push(filter)
  }
  
  return filterBank
}

/**
 * Apply mel filter bank to FFT frequency data
 * @param {Uint8Array} fftData - FFT frequency data (from analyser.getByteFrequencyData)
 * @param {Float32Array[]} melFilterBank - Mel filter bank from createMelFilterBank
 * @returns {Float32Array} - Mel-scale frequency data
 */
export function applyMelFilterBank(fftData, melFilterBank) {
  const nMelBins = melFilterBank.length
  const melData = new Float32Array(nMelBins)
  
  for (let i = 0; i < nMelBins; i++) {
    let sum = 0
    const filter = melFilterBank[i]
    
    for (let j = 0; j < fftData.length && j < filter.length; j++) {
      // Convert byte data (0-255) to linear scale, apply filter, accumulate
      const magnitude = fftData[j] / 255.0
      sum += magnitude * filter[j]
    }
    
    melData[i] = sum
  }
  
  return melData
}

/**
 * Convert mel-scale data back to 0-255 range for visualization
 * @param {Float32Array} melData - Mel-scale frequency data
 * @returns {Uint8Array} - Normalized data in 0-255 range
 */
export function normalizeMelData(melData) {
  const normalized = new Uint8Array(melData.length)
  
  // Find max for normalization
  let max = 0
  for (let i = 0; i < melData.length; i++) {
    if (melData[i] > max) max = melData[i]
  }
  
  // Normalize to 0-255
  const scale = max > 0 ? 255 / max : 1
  for (let i = 0; i < melData.length; i++) {
    normalized[i] = Math.min(255, Math.max(0, Math.round(melData[i] * scale)))
  }
  
  return normalized
}

