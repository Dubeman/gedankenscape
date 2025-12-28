// Shared utility for converting AudioBuffer to WAV
export function audioBufferToWav(buffer) {
  const length = buffer.length
  const numberOfChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2
  const blockAlign = numberOfChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = length * blockAlign
  const bufferSize = 44 + dataSize
  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, bufferSize - 8, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }

  return arrayBuffer
}

// Load audio from URL and return AudioBuffer
async function loadAudioBuffer(audioUrl) {
  const response = await fetch(audioUrl)
  const arrayBuffer = await response.arrayBuffer()
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  return await audioContext.decodeAudioData(arrayBuffer)
}

// Reverse audio
export async function reverseAudio(audioUrl) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await loadAudioBuffer(audioUrl)
    
    const reversedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      const reversedData = reversedBuffer.getChannelData(channel)
      for (let i = 0; i < channelData.length; i++) {
        reversedData[i] = channelData[channelData.length - 1 - i]
      }
    }

    const wav = audioBufferToWav(reversedBuffer)
    const blob = new Blob([wav], { type: 'audio/wav' })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error reversing audio:', error)
    throw error
  }
}

// Apply volume change
export async function applyVolume(audioUrl, volume) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await loadAudioBuffer(audioUrl)
    
    const processedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    const gain = Math.max(0, Math.min(2, volume)) // Clamp between 0 and 2

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      const processedData = processedBuffer.getChannelData(channel)
      for (let i = 0; i < channelData.length; i++) {
        processedData[i] = channelData[i] * gain
      }
    }

    const wav = audioBufferToWav(processedBuffer)
    const blob = new Blob([wav], { type: 'audio/wav' })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error applying volume:', error)
    throw error
  }
}

// Apply low-pass filter
export async function applyLowPassFilter(audioUrl, cutoffFrequency) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await loadAudioBuffer(audioUrl)
    
    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer

    const filter = offlineContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = Math.max(20, Math.min(20000, cutoffFrequency))
    filter.Q.value = 1

    source.connect(filter)
    filter.connect(offlineContext.destination)
    source.start(0)

    const processedBuffer = await offlineContext.startRendering()

    const wav = audioBufferToWav(processedBuffer)
    const blob = new Blob([wav], { type: 'audio/wav' })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error applying filter:', error)
    throw error
  }
}

// Apply pan
export async function applyPan(audioUrl, panValue) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await loadAudioBuffer(audioUrl)
    
    // Only process stereo audio
    if (audioBuffer.numberOfChannels !== 2) {
      throw new Error('Pan only works with stereo audio')
    }

    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer

    const panner = offlineContext.createStereoPanner()
    panner.pan.value = Math.max(-1, Math.min(1, panValue))

    source.connect(panner)
    panner.connect(offlineContext.destination)
    source.start(0)

    const processedBuffer = await offlineContext.startRendering()

    const wav = audioBufferToWav(processedBuffer)
    const blob = new Blob([wav], { type: 'audio/wav' })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error applying pan:', error)
    throw error
  }
}

