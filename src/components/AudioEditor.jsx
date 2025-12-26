import { useState } from 'react'
import TrimTool from './AudioEditor/TrimTool'
import './AudioEditor/AudioEditor.css'

function AudioEditor({ audioUrl, duration, waveformRef, onEditComplete }) {
  const [activeTool, setActiveTool] = useState(null)

  return (
    <div className="audio-editor">
      <div className="editor-tools">
        <button
          className={`editor-tool-button ${activeTool === 'trim' ? 'active' : ''}`}
          onClick={() => setActiveTool(activeTool === 'trim' ? null : 'trim')}
        >
          Trim
        </button>
      </div>
      {activeTool === 'trim' && (
        <TrimTool
          audioUrl={audioUrl}
          duration={duration}
          waveformRef={waveformRef}
          onTrimmed={onEditComplete}
        />
      )}
    </div>
  )
}

export default AudioEditor

