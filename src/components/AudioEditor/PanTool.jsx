import { useState, useEffect } from 'react'
import { applyPan } from '../../utils/audioEffects'
import './PanTool.css'

function PanTool({ audioUrl, onProcessed, liveEffects }) {
  const [pan, setPan] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false)

  useEffect(() => {
    if (liveEffects) {
      const original = liveEffects.getOriginalValues()
      setPan(original.pan)
    }
  }, [liveEffects])

  useEffect(() => {
    if (liveEffects) {
      liveEffects.setPan(pan)
      setHasUncommittedChanges(pan !== liveEffects.getOriginalValues().pan)
    }
  }, [pan, liveEffects])

  const handleCommit = async () => {
    if (!audioUrl || isProcessing) return

    setIsProcessing(true)
    try {
      const processedUrl = await applyPan(audioUrl, pan)
      if (onProcessed) {
        onProcessed(processedUrl)
      }
      if (liveEffects) {
        liveEffects.commit()
        setHasUncommittedChanges(false)
      }
    } catch (error) {
      console.error('Error applying pan:', error)
      alert(error.message || 'Failed to apply pan. Pan only works with stereo audio.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    if (liveEffects) {
      const original = liveEffects.getOriginalValues()
      setPan(original.pan)
      setHasUncommittedChanges(false)
    }
  }

  const panPercent = Math.round(pan * 100)

  return (
    <div className="pan-tool">
      <div className="pan-controls">
        <div className="pan-slider-group">
          <label className="pan-label">Pan {hasUncommittedChanges && <span className="uncommitted-indicator">●</span>}</label>
          <div className="pan-labels">
            <span>L</span>
            <span>C</span>
            <span>R</span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={pan}
            onChange={(e) => setPan(parseFloat(e.target.value))}
            className="pan-slider"
          />
          <div className="pan-display">
            <span>{panPercent > 0 ? `R ${panPercent}%` : panPercent < 0 ? `L ${Math.abs(panPercent)}%` : 'Center'}</span>
          </div>
        </div>
        <div className="pan-actions">
          {hasUncommittedChanges && (
            <button
              className="pan-button pan-button-reset"
              onClick={handleReset}
            >
              Reset
            </button>
          )}
          <button
            className="pan-button"
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

export default PanTool

