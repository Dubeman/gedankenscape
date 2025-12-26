import { useState } from 'react'
import './MockAIInput.css'

function MockAIInput({ audioUrl }) {
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastPrompt, setLastPrompt] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    setLastPrompt(input)
    setIsProcessing(true)
    setInput('')

    // Mock AI processing delay
    setTimeout(() => {
      setIsProcessing(false)
      // In the future, this would trigger actual AI processing
      console.log('Mock AI processing:', lastPrompt)
    }, 2000)
  }

  return (
    <div className="mock-ai-input-container">
      <form onSubmit={handleSubmit} className="mock-ai-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the change... (e.g., 'darker, more space')"
          className="mock-ai-input"
          disabled={isProcessing}
        />
        <button
          type="submit"
          className="mock-ai-button"
          disabled={isProcessing || !input.trim()}
        >
          {isProcessing ? '...' : '→'}
        </button>
      </form>
      {isProcessing && (
        <div className="mock-ai-status">
          Processing: "{lastPrompt}"
        </div>
      )}
    </div>
  )
}

export default MockAIInput

