import { useState, useEffect, useRef } from 'react'
import AudioPlayer from './components/AudioPlayer'
import Waveform from './components/Waveform'
import Spectrogram from './components/Spectrogram'
import AudioEditor from './components/AudioEditor'
import MockAIInput from './components/MockAIInput'
import { useLiveEffects } from './hooks/useLiveEffects'
import './App.css'

function App() {
  const [audioFile, setAudioFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [viewMode, setViewMode] = useState('waveform') // 'waveform' or 'spectrogram'
  
  const liveEffects = useLiveEffects(wavesurferRef, isReady)

  const handleFileLoad = (file) => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    const url = URL.createObjectURL(file)
    setAudioFile(file)
    setAudioUrl(url)
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleEditComplete = (editedUrl) => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(editedUrl)
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleWaveformReady = (ref) => {
    waveformRef.current = ref.current
  }

  const handleWavesurferReady = (ref) => {
    wavesurferRef.current = ref.current
    setIsReady(true)
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = (time) => {
    setCurrentTime(time)
  }

  const handleDurationChange = (dur) => {
    setDuration(dur)
  }

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && audioUrl) {
        e.preventDefault()
        setIsPlaying(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [audioUrl])

  return (
    <div className="app">
      <div className="app-content">
        {!audioUrl ? (
          <AudioPlayer onFileLoad={handleFileLoad} />
        ) : (
          <>
            <div className="audio-section">
              <div className="view-mode-toggle">
                <button
                  className={`view-toggle-button ${viewMode === 'waveform' ? 'active' : ''}`}
                  onClick={() => setViewMode('waveform')}
                >
                  Waveform
                </button>
                <button
                  className={`view-toggle-button ${viewMode === 'spectrogram' ? 'active' : ''}`}
                  onClick={() => setViewMode('spectrogram')}
                >
                  Spectrogram
                </button>
              </div>
              {viewMode === 'waveform' ? (
                <Waveform
                  audioUrl={audioUrl}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onTimeUpdate={handleTimeUpdate}
                  onDurationChange={handleDurationChange}
                  onWaveformReady={handleWaveformReady}
                  onWavesurferReady={handleWavesurferReady}
                />
              ) : (
                <Spectrogram
                  audioUrl={audioUrl}
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onTimeUpdate={handleTimeUpdate}
                  onDurationChange={handleDurationChange}
                  onSpectrogramReady={handleWaveformReady}
                />
              )}
              {duration > 0 && (
                <AudioEditor
                  audioUrl={audioUrl}
                  duration={duration}
                  waveformRef={waveformRef}
                  onEditComplete={handleEditComplete}
                  liveEffects={liveEffects}
                />
              )}
            </div>
            <MockAIInput audioUrl={audioUrl} />
          </>
        )}
      </div>
    </div>
  )
}

export default App

