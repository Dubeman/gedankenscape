import { useRef } from 'react'
import './AudioPlayer.css'

function AudioPlayer({ onFileLoad }) {
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('audio/')) {
      onFileLoad(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dropZoneRef.current.classList.remove('dragover')
    
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dropZoneRef.current.classList.add('dragover')
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dropZoneRef.current.classList.remove('dragover')
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files[0]
    handleFileSelect(file)
  }

  return (
    <div
      ref={dropZoneRef}
      className="audio-player"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      <div className="audio-player-content">
        <div className="audio-player-icon">🎵</div>
        <p className="audio-player-text">Drop audio file here</p>
        <p className="audio-player-hint">or click to browse</p>
      </div>
    </div>
  )
}

export default AudioPlayer

