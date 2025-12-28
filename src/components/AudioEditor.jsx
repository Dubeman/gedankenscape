import { useState } from 'react'
import TrimTool from './AudioEditor/TrimTool'
import ReverseTool from './AudioEditor/ReverseTool'
import VolumeTool from './AudioEditor/VolumeTool'
import FilterTool from './AudioEditor/FilterTool'
import PanTool from './AudioEditor/PanTool'
import './AudioEditor/AudioEditor.css'

function AudioEditor({ audioUrl, duration, waveformRef, onEditComplete, liveEffects }) {
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
        <button
          className={`editor-tool-button ${activeTool === 'reverse' ? 'active' : ''}`}
          onClick={() => setActiveTool(activeTool === 'reverse' ? null : 'reverse')}
        >
          Reverse
        </button>
        <button
          className={`editor-tool-button ${activeTool === 'volume' ? 'active' : ''}`}
          onClick={() => setActiveTool(activeTool === 'volume' ? null : 'volume')}
        >
          Volume
        </button>
        <button
          className={`editor-tool-button ${activeTool === 'filter' ? 'active' : ''}`}
          onClick={() => setActiveTool(activeTool === 'filter' ? null : 'filter')}
        >
          Filter
        </button>
        <button
          className={`editor-tool-button ${activeTool === 'pan' ? 'active' : ''}`}
          onClick={() => setActiveTool(activeTool === 'pan' ? null : 'pan')}
        >
          Pan
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
      {activeTool === 'reverse' && (
        <ReverseTool
          audioUrl={audioUrl}
          onProcessed={onEditComplete}
        />
      )}
      {activeTool === 'volume' && (
        <VolumeTool
          audioUrl={audioUrl}
          onProcessed={onEditComplete}
          liveEffects={liveEffects}
        />
      )}
      {activeTool === 'filter' && (
        <FilterTool
          audioUrl={audioUrl}
          onProcessed={onEditComplete}
          liveEffects={liveEffects}
        />
      )}
      {activeTool === 'pan' && (
        <PanTool
          audioUrl={audioUrl}
          onProcessed={onEditComplete}
          liveEffects={liveEffects}
        />
      )}
    </div>
  )
}

export default AudioEditor

