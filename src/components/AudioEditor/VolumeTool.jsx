import { useState, useEffect } from 'react'
import { applyVolume } from '../../utils/audioEffects'
import './VolumeTool.css'

function VolumeTool({ audioUrl, onProcessed, liveEffects }) {
  const [volume, setVolume] = useState(1.0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false)

  useEffect(() => {
    if (liveEffects) {
      const original = liveEffects.getOriginalValues()
      setVolume(original.volume)
    }
  }, [liveEffects])

  useEffect(() => {
    if (liveEffects) {
      liveEffects.setVolume(volume)
      setHasUncommittedChanges(volume !== liveEffects.getOriginalValues().volume)
    }
  }, [volume, liveEffects])

  const handleCommit = async () => {
    if (!audioUrl || isProcessing) return

    setIsProcessing(true)
    try {
      const processedUrl = await applyVolume(audioUrl, volume)
      if (onProcessed) {
        onProcessed(processedUrl)
      }
      if (liveEffects) {
        liveEffects.commit()
        setHasUncommittedChanges(false)
      }
    } catch (error) {
      console.error('Error applying volume:', error)
      alert('Failed to apply volume')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    if (liveEffects) {
      const original = liveEffects.getOriginalValues()
      setVolume(original.volume)
      setHasUncommittedChanges(false)
    }
  }

  const volumePercent = Math.round(volume * 100)
  const volumeDb = (20 * Math.log10(volume)).toFixed(1)

  return (
    <div className="volume-tool">
      <div className="volume-controls">
        <div className="volume-slider-group">
          <label className="volume-label">Volume {hasUncommittedChanges && <span className="uncommitted-indicator">●</span>}</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="volume-slider"
          />
          <div className="volume-display">
            <span>{volumePercent}%</span>
            <span className="volume-db">{volumeDb} dB</span>
          </div>
        </div>
        <div className="volume-actions">
          {hasUncommittedChanges && (
            <button
              className="volume-button volume-button-reset"
              onClick={handleReset}
            >
              Reset
            </button>
          )}
          <button
            className="volume-button"
            onClick={handleCommit}
            disabled={isProcessing || !hasUncommittedChanges}
          >
            {isProcessing ? 'Processing...' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VolumeTool

