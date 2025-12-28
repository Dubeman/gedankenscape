import { audioBufferToWav } from './audioEffects'

export async function trimAudio(audioUrl, startTime, endTime) {
  try {
    const response = await fetch(audioUrl)
    const arrayBuffer = await response.arrayBuffer()
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const sampleRate = audioBuffer.sampleRate
    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)
    const length = endSample - startSample

    const trimmedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      sampleRate
    )

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      const trimmedData = trimmedBuffer.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        trimmedData[i] = channelData[startSample + i]
      }
    }

    // Convert to WAV
    const wav = audioBufferToWav(trimmedBuffer)
    const blob = new Blob([wav], { type: 'audio/wav' })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Error trimming audio:', error)
    throw error
  }
}

