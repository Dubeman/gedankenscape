import { useState, useEffect } from 'react'
import { applyLowPassFilter } from '../../utils/audioEffects'
import './FilterTool.css'

function FilterTool({ audioUrl, onProcessed, liveEffects }) {
  const [cutoff, setCutoff] = useState(20000)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasUncommittedChanges, setHasUncommittedChanges] = useState(false)

  useEffect(() => {
    if (liveEffects) {
      const original = liveEffects.getOriginalValues()
      setCutoff(original.cutoff)
    }
  }, [liveEffects])

  useEffect(() => {
    if (liveEffects) {
      liveEffects.setFilter(cutoff)
      setHasUncommittedChanges(cutoff !== liveEffects.getOriginalValues().cutoff)
    }
  }, [cutoff, liveEffects])

  const handleCommit = async () => {
    if (!audioUrl || isProcessing) return

    setIsProcessing(true)
    try {
      const processedUrl = await applyLowPassFilter(audioUrl, cutoff)
      if (onProcessed) {
        onProcessed(processedUrl)
      }
      if (liveEffects) {
        liveEffects.commit()
        setHasUncommittedChanges(false)
      }
    } catch (error) {
      console.error('Error applying filter:', error)
      alert('Failed to apply filter')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    if (liveEffects) {
      const original = liveEffects.getOriginalValues()
      setCutoff(original.cutoff)
      setHasUncommittedChanges(false)
    }
  }

  return (
    <div className="filter-tool">
      <div className="filter-controls">
        <div className="filter-slider-group">
          <label className="filter-label">Cutoff Frequency {hasUncommittedChanges && <span className="uncommitted-indicator">●</span>}</label>
          <input
            type="range"
            min="20"
            max="20000"
            step="10"
            value={cutoff}
            onChange={(e) => setCutoff(parseFloat(e.target.value))}
            className="filter-slider"
          />
          <div className="filter-display">
            <span>{cutoff < 1000 ? `${cutoff} Hz` : `${(cutoff / 1000).toFixed(1)} kHz`}</span>
          </div>
        </div>
        <div className="filter-actions">
          {hasUncommittedChanges && (
            <button
              className="filter-button filter-button-reset"
              onClick={handleReset}
            >
              Reset
            </button>
          )}
          <button
            className="filter-button"
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

export default FilterTool

