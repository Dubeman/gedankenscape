import { useState } from 'react'
import { reverseAudio } from '../../utils/audioEffects'
import './ReverseTool.css'

function ReverseTool({ audioUrl, onProcessed }) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleReverse = async () => {
    if (!audioUrl || isProcessing) return

    setIsProcessing(true)
    try {
      const reversedUrl = await reverseAudio(audioUrl)
      if (onProcessed) {
        onProcessed(reversedUrl)
      }
    } catch (error) {
      console.error('Error reversing audio:', error)
      alert('Failed to reverse audio')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="reverse-tool">
      <div className="reverse-controls">
        <p className="reverse-description">Reverse the entire audio</p>
        <button
          className="reverse-button"
          onClick={handleReverse}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Reverse'}
        </button>
      </div>
    </div>
  )
}

export default ReverseTool

