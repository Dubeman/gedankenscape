import { useEffect, useRef, useState } from 'react'
import './Spectrogram.css'

function Spectrogram({ audioUrl, isPlaying, onPlayPause, onTimeUpdate, onDurationChange, onSpectrogramReady }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const audioRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [viewMode, setViewMode] = useState('spectrogram') // 'spectrogram' or 'waveform' (internal to component)

  useEffect(() => {
    if (!audioUrl) return

    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8

    const audio = new Audio(audioUrl)
    audio.crossOrigin = 'anonymous'

    const source = audioContext.createMediaElementSource(audio)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    audioRef.current = audio
    analyserRef.current = analyser

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
      if (onDurationChange) {
        onDurationChange(audio.duration)
      }
      setIsReady(true)
      if (onSpectrogramReady) {
        onSpectrogramReady(containerRef)
      }
    })

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
      if (onTimeUpdate) {
        onTimeUpdate(audio.currentTime)
      }
    })

    audio.addEventListener('ended', () => {
      onPlayPause(false)
    })

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      audio.pause()
      audio.src = ''
      source.disconnect()
      analyser.disconnect()
      audioContext.close()
    }
  }, [audioUrl])

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play()
    } else if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    if (!canvasRef.current || !analyserRef.current || !isReady) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const analyser = analyserRef.current

    // Set canvas size
    const updateCanvasSize = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = 200
      }
    }
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const timeDataArray = new Uint8Array(bufferLength)

    // For spectrogram: store frequency data over time
    const spectrogramData = []
    const maxHistory = 300 // Store enough history for smooth scrolling

    const draw = () => {
      if (viewMode === 'spectrogram') {
        drawSpectrogram(ctx, canvas, analyser, dataArray, spectrogramData, maxHistory, bufferLength)
      } else {
        drawWaveform(ctx, canvas, analyser, timeDataArray)
      }
      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isReady, viewMode, isPlaying, currentTime])

  const drawSpectrogram = (ctx, canvas, analyser, dataArray, spectrogramData, maxHistory, bufferLength) => {
    analyser.getByteFrequencyData(dataArray)

    // Add current frequency data to history (only when playing or every few frames)
    if (isPlaying || spectrogramData.length === 0) {
      spectrogramData.push(new Uint8Array(dataArray))
    }

    // Keep only recent history
    if (spectrogramData.length > maxHistory) {
      spectrogramData.shift()
    }

    // Clear canvas
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (spectrogramData.length === 0) return

    // Draw spectrogram - map frequency bins to canvas height
    const columnWidth = canvas.width / spectrogramData.length
    const binHeight = canvas.height / bufferLength

    for (let i = 0; i < spectrogramData.length; i++) {
      const x = i * columnWidth
      const frame = spectrogramData[i]

      // Only draw every few bins to improve performance
      const binStep = Math.max(1, Math.floor(bufferLength / 200))

      for (let j = 0; j < frame.length; j += binStep) {
        const value = frame[j]
        const y = canvas.height - (j * binHeight)

        // Map frequency intensity to color
        // Lower frequencies at bottom, higher at top
        const intensity = value / 255
        
        // Create gradient from dark blue (low) to cyan (high)
        const hue = 200 + (intensity * 60)
        const saturation = Math.min(70, 20 + (intensity * 50))
        const lightness = Math.min(25, 8 + (intensity * 17))

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
        ctx.fillRect(x, y, columnWidth, binHeight * binStep)
      }
    }

    // Draw playhead
    if (audioRef.current && duration > 0) {
      const progress = currentTime / duration
      const playheadX = progress * canvas.width
      ctx.strokeStyle = '#888'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, canvas.height)
      ctx.stroke()
    }
  }

  const drawWaveform = (ctx, canvas, analyser, timeDataArray) => {
    analyser.getByteTimeDomainData(timeDataArray)

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.lineWidth = 1
    ctx.strokeStyle = '#444'
    ctx.beginPath()

    const sliceWidth = canvas.width / timeDataArray.length
    let x = 0

    for (let i = 0; i < timeDataArray.length; i++) {
      const v = timeDataArray[i] / 128.0
      const y = (v * canvas.height) / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.stroke()

    // Draw playhead
    if (audioRef.current && duration > 0) {
      const progress = currentTime / duration
      const playheadX = progress * canvas.width
      ctx.strokeStyle = '#888'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, canvas.height)
      ctx.stroke()
    }
  }

  const handleCanvasClick = (e) => {
    if (!audioRef.current || !isReady || !duration) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const progress = x / canvas.width
    const time = progress * duration

    audioRef.current.currentTime = time
    setCurrentTime(time)
    if (onTimeUpdate) {
      onTimeUpdate(time)
    }
  }

  return (
    <div className="spectrogram-container">
      <div className="spectrogram-wrapper" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="spectrogram-canvas"
          onClick={handleCanvasClick}
        />
      </div>
      <div className="spectrogram-controls">
        <button
          className="spectrogram-play-button"
          onClick={() => onPlayPause(!isPlaying)}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span className="spectrogram-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default Spectrogram

