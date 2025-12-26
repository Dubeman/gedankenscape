import { useState, useEffect, useRef } from 'react'
import { trimAudio } from '../../utils/audioTrim'
import './TrimTool.css'

function TrimTool({ audioUrl, duration, waveformRef, onTrimmed }) {
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(duration)
  const [isTrimming, setIsTrimming] = useState(false)
  const trimOverlayRef = useRef(null)

  useEffect(() => {
    if (duration > 0) {
      setTrimEnd(duration)
      setTrimStart(0)
    }
  }, [duration])

  const handleTrim = async () => {
    if (!audioUrl || isTrimming) return
    
    const start = Math.max(0, Math.min(trimStart, duration))
    const end = Math.max(start, Math.min(trimEnd, duration))
    
    if (end - start < 0.1) {
      alert('Trim selection too short (minimum 0.1 seconds)')
      return
    }

    setIsTrimming(true)
    try {
      const trimmedUrl = await trimAudio(audioUrl, start, end)
      if (onTrimmed) {
        onTrimmed(trimmedUrl)
      }
    } catch (error) {
      console.error('Error trimming audio:', error)
      alert('Failed to trim audio')
    } finally {
      setIsTrimming(false)
    }
  }

  const getTrimStartPercent = () => {
    return duration > 0 ? (trimStart / duration) * 100 : 0
  }

  const getTrimEndPercent = () => {
    return duration > 0 ? (trimEnd / duration) * 100 : 0
  }

  const handleTrimMarkerDrag = (type, e) => {
    if (!waveformRef?.current || !trimOverlayRef?.current) return
    
    const waveformRect = waveformRef.current.getBoundingClientRect()
    const padding = 16 // 1rem padding
    const waveformWidth = waveformRect.width - (padding * 2)
    const offsetX = e.clientX - waveformRect.left - padding
    
    const x = Math.max(0, Math.min(offsetX, waveformWidth))
    const progress = x / waveformWidth
    const time = progress * duration

    if (type === 'start') {
      setTrimStart(Math.max(0, Math.min(time, trimEnd - 0.1)))
    } else {
      setTrimEnd(Math.max(trimStart + 0.1, Math.min(time, duration)))
    }
  }

  if (!duration || duration === 0 || !waveformRef?.current) return null

  return (
    <div className="trim-tool">
      <div className="trim-controls">
        <div className="trim-inputs">
          <div className="trim-input-group">
            <label>Start</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max={duration}
              value={trimStart.toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0
                setTrimStart(Math.max(0, Math.min(val, trimEnd - 0.1)))
              }}
              className="trim-input"
            />
          </div>
          <div className="trim-input-group">
            <label>End</label>
            <input
              type="number"
              step="0.1"
              min={trimStart + 0.1}
              max={duration}
              value={trimEnd.toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || duration
                setTrimEnd(Math.max(trimStart + 0.1, Math.min(val, duration)))
              }}
              className="trim-input"
            />
          </div>
        </div>
        <button
          className="trim-button"
          onClick={handleTrim}
          disabled={isTrimming || trimEnd - trimStart < 0.1}
        >
          {isTrimming ? 'Trimming...' : 'Trim'}
        </button>
      </div>
      <TrimOverlay
        waveformRef={waveformRef}
        trimStart={trimStart}
        trimEnd={trimEnd}
        duration={duration}
        onTrimMarkerDrag={handleTrimMarkerDrag}
      />
    </div>
  )
}

function TrimOverlay({ waveformRef, trimStart, trimEnd, duration, onTrimMarkerDrag }) {
  const overlayRef = useRef(null)

  const getTrimStartPercent = () => {
    return duration > 0 ? (trimStart / duration) * 100 : 0
  }

  const getTrimEndPercent = () => {
    return duration > 0 ? (trimEnd / duration) * 100 : 0
  }

  useEffect(() => {
    if (!waveformRef?.current || !overlayRef.current) return

    const waveformWrapper = document.getElementById('waveform-wrapper')
    if (!waveformWrapper) return

    const overlay = overlayRef.current
    const wrapperRect = waveformWrapper.getBoundingClientRect()
    
    overlay.style.position = 'fixed'
    overlay.style.top = `${wrapperRect.top}px`
    overlay.style.left = `${wrapperRect.left}px`
    overlay.style.width = `${wrapperRect.width}px`
    overlay.style.height = `${wrapperRect.height}px`
    overlay.style.zIndex = '10'
  }, [waveformRef])

  if (!waveformRef?.current) return null

  return (
    <div
      ref={overlayRef}
      className="trim-overlay"
    >
      <div
        className="trim-selection"
        style={{
          left: `${getTrimStartPercent()}%`,
          width: `${getTrimEndPercent() - getTrimStartPercent()}%`,
        }}
      />
      <div
        className="trim-marker trim-marker-start"
        style={{ left: `${getTrimStartPercent()}%` }}
        onMouseDown={(e) => {
          const handleMouseMove = (moveEvent) => {
            onTrimMarkerDrag('start', moveEvent)
          }
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
          e.preventDefault()
        }}
      />
      <div
        className="trim-marker trim-marker-end"
        style={{ left: `${getTrimEndPercent()}%` }}
        onMouseDown={(e) => {
          const handleMouseMove = (moveEvent) => {
            onTrimMarkerDrag('end', moveEvent)
          }
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }
          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
          e.preventDefault()
        }}
      />
    </div>
  )
}

export default TrimTool

