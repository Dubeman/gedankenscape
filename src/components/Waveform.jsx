import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import './Waveform.css'

function Waveform({ audioUrl, isPlaying, onPlayPause, onTimeUpdate, onDurationChange, onWaveformReady }) {
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#444',
      progressColor: '#888',
      cursorColor: '#aaa',
      barWidth: 2,
      barRadius: 1,
      responsive: true,
      height: 120,
      normalize: true,
      backend: 'WebAudio',
    })

    wavesurfer.load(audioUrl)

    wavesurfer.on('ready', () => {
      setIsReady(true)
      const dur = wavesurfer.getDuration()
      setDuration(dur)
      onDurationChange(dur)
      if (onWaveformReady) {
        onWaveformReady(waveformRef)
      }
    })

    wavesurfer.on('play', () => {
      onPlayPause(true)
    })

    wavesurfer.on('pause', () => {
      onPlayPause(false)
    })

    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time)
      onTimeUpdate(time)
    })

    wavesurfer.on('seek', (time) => {
      setCurrentTime(time)
      onTimeUpdate(time)
    })

    wavesurferRef.current = wavesurfer

    return () => {
      wavesurfer.destroy()
    }
  }, [audioUrl])

  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return

    if (isPlaying) {
      wavesurferRef.current.play()
    } else {
      wavesurferRef.current.pause()
    }
  }, [isPlaying, isReady])

  const handleWaveformClick = (e) => {
    if (wavesurferRef.current && isReady) {
      const rect = waveformRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const progress = x / rect.width
      const time = progress * wavesurferRef.current.getDuration()
      wavesurferRef.current.seekTo(progress)
    }
  }

  return (
    <div className="waveform-container">
      <div className="waveform-wrapper" id="waveform-wrapper">
        <div
          ref={waveformRef}
          className="waveform"
          onClick={handleWaveformClick}
        />
      </div>
      <div className="waveform-controls">
        <button
          className="waveform-play-button"
          onClick={() => onPlayPause(!isPlaying)}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span className="waveform-time">
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

export default Waveform

