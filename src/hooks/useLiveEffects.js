import { useEffect, useRef } from 'react'

export function useLiveEffects(wavesurferRef, isReady) {
  const effectsRef = useRef({
    gain: null,
    filter: null,
    panner: null,
    audioContext: null,
    originalValues: {
      volume: 1.0,
      cutoff: 20000,
      pan: 0
    },
    currentValues: {
      volume: 1.0,
      cutoff: 20000,
      pan: 0
    }
  })

  useEffect(() => {
    if (!wavesurferRef?.current || !isReady) return

    const wavesurfer = wavesurferRef.current
    
    // Wait for backend to be ready
    const setupEffects = () => {
      if (wavesurfer.backend && wavesurfer.backend.ac) {
        const audioContext = wavesurfer.backend.ac
        effectsRef.current.audioContext = audioContext

        // Create effect nodes
        const gainNode = audioContext.createGain()
        const filterNode = audioContext.createBiquadFilter()
        const pannerNode = audioContext.createStereoPanner()

        // Set initial values
        gainNode.gain.value = 1.0
        filterNode.type = 'lowpass'
        filterNode.frequency.value = 20000
        filterNode.Q.value = 1
        pannerNode.pan.value = 0

        effectsRef.current.gain = gainNode
        effectsRef.current.filter = filterNode
        effectsRef.current.panner = pannerNode

        // Connect effects in chain (don't connect to destination yet)
        gainNode.connect(filterNode)
        filterNode.connect(pannerNode)
        // We'll connect pannerNode to destination when intercepting

        // Store original play method for cleanup
        const originalPlay = wavesurfer.play.bind(wavesurfer)
        let isIntercepted = false
        let currentSource = null
        
        // Hook into wavesurfer's play event to intercept audio routing
        const handlePlay = () => {
          // Wait a bit for source to be created
          setTimeout(() => {
            if (wavesurfer.backend && wavesurfer.backend.source && !isIntercepted) {
              currentSource = wavesurfer.backend.source
              
              try {
                // Find where source is currently connected
                // WaveSurfer typically connects source -> gain -> destination
                // We need to insert our effects in between
                
                // Disconnect source from whatever it's connected to
                currentSource.disconnect()
                
                // Connect source through our effects chain
                currentSource.connect(gainNode)
                
                // Connect effects chain to audio context destination
                // This preserves WaveSurfer's pause functionality
                if (!pannerNode.isConnected) {
                  pannerNode.connect(audioContext.destination)
                }
                
                isIntercepted = true
              } catch (e) {
                console.warn('Could not intercept audio source:', e)
              }
            }
          }, 10)
        }
        
        wavesurfer.on('play', handlePlay)
        
        // Reset interception when audio stops
        const handlePause = () => {
          isIntercepted = false
          currentSource = null
          // Disconnect effects chain when paused
          try {
            if (pannerNode.isConnected) {
              pannerNode.disconnect()
            }
            // Also disconnect source from gainNode to fully stop audio
            if (currentSource && gainNode) {
              try {
                currentSource.disconnect(gainNode)
              } catch (e) {
                // Source might already be disconnected
              }
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        
        wavesurfer.on('pause', handlePause)
        wavesurfer.on('finish', handlePause)
        
        // Store original play for potential cleanup
        effectsRef.current.originalPlay = originalPlay
      }
    }

    // Try to setup immediately, or wait a bit
    if (wavesurfer.backend && wavesurfer.backend.ac) {
      setupEffects()
    } else {
      const timeout = setTimeout(setupEffects, 100)
      return () => clearTimeout(timeout)
    }

    return () => {
      // Cleanup
      if (effectsRef.current.gain) {
        try {
          effectsRef.current.gain.disconnect()
        } catch (e) {}
      }
      if (effectsRef.current.filter) {
        try {
          effectsRef.current.filter.disconnect()
        } catch (e) {}
      }
      if (effectsRef.current.panner) {
        try {
          effectsRef.current.panner.disconnect()
        } catch (e) {}
      }
    }
  }, [wavesurferRef, isReady])

  const setVolume = (volume) => {
    if (effectsRef.current.gain) {
      effectsRef.current.gain.gain.value = volume
      effectsRef.current.currentValues.volume = volume
    }
  }

  const setFilter = (cutoff) => {
    if (effectsRef.current.filter) {
      effectsRef.current.filter.frequency.value = Math.max(20, Math.min(20000, cutoff))
      effectsRef.current.currentValues.cutoff = cutoff
    }
  }

  const setPan = (pan) => {
    if (effectsRef.current.panner) {
      effectsRef.current.panner.pan.value = Math.max(-1, Math.min(1, pan))
      effectsRef.current.currentValues.pan = pan
    }
  }

  const getCurrentValues = () => {
    return { ...effectsRef.current.currentValues }
  }

  const getOriginalValues = () => {
    return { ...effectsRef.current.originalValues }
  }

  const hasChanges = () => {
    const current = effectsRef.current.currentValues
    const original = effectsRef.current.originalValues
    return (
      current.volume !== original.volume ||
      current.cutoff !== original.cutoff ||
      current.pan !== original.pan
    )
  }

  const reset = () => {
    setVolume(effectsRef.current.originalValues.volume)
    setFilter(effectsRef.current.originalValues.cutoff)
    setPan(effectsRef.current.originalValues.pan)
  }

  const commit = () => {
    effectsRef.current.originalValues = { ...effectsRef.current.currentValues }
  }

  return {
    setVolume,
    setFilter,
    setPan,
    getCurrentValues,
    getOriginalValues,
    hasChanges,
    reset,
    commit
  }
}
