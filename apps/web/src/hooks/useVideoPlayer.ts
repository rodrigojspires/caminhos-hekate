'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface VideoPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  playbackRate: number
  isLoading: boolean
  hasError: boolean
  errorMessage?: string
  buffered: TimeRanges | null
  isWaiting: boolean
}

interface VideoPlayerControls {
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  toggleFullscreen: () => void
  skipForward: (seconds?: number) => void
  skipBackward: (seconds?: number) => void
  reset: () => void
}

interface VideoPlayerOptions {
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  volume?: number
  playbackRate?: number
  skipInterval?: number
  onTimeUpdate?: (currentTime: number) => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onError?: (error: string) => void
  onProgress?: (progress: number) => void
  onVolumeChange?: (volume: number) => void
  onPlaybackRateChange?: (rate: number) => void
}

interface UseVideoPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  state: VideoPlayerState
  controls: VideoPlayerControls
  progress: number
  formattedCurrentTime: string
  formattedDuration: string
  isNearEnd: boolean
}

export function useVideoPlayer(options: VideoPlayerOptions = {}): UseVideoPlayerReturn {
  const {
    autoPlay = false,
    loop = false,
    muted = false,
    volume = 1,
    playbackRate = 1,
    skipInterval = 10,
    onTimeUpdate,
    onPlay,
    onPause,
    onEnded,
    onError,
    onProgress,
    onVolumeChange,
    onPlaybackRateChange
  } = options

  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume,
    isMuted: muted,
    isFullscreen: false,
    playbackRate,
    isLoading: true,
    hasError: false,
    buffered: null,
    isWaiting: false
  })

  // Format time helper
  const formatTime = useCallback((time: number): string => {
    if (isNaN(time)) return '0:00'
    
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setState(prev => ({
      ...prev,
      duration: video.duration,
      isLoading: false,
      hasError: false
    }))
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const currentTime = video.currentTime
    setState(prev => ({ ...prev, currentTime }))
    
    onTimeUpdate?.(currentTime)
    onProgress?.(video.duration > 0 ? (currentTime / video.duration) * 100 : 0)
  }, [onTimeUpdate, onProgress])

  const handlePlay = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true, isWaiting: false }))
    onPlay?.()
  }, [onPlay])

  const handlePause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }))
    onPause?.()
  }, [onPause])

  const handleEnded = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }))
    onEnded?.()
  }, [onEnded])

  const handleError = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    const errorMessage = video.error?.message || 'Erro desconhecido no vídeo'
    setState(prev => ({
      ...prev,
      hasError: true,
      errorMessage,
      isLoading: false,
      isPlaying: false
    }))
    onError?.(errorMessage)
  }, [onError])

  const handleWaiting = useCallback(() => {
    setState(prev => ({ ...prev, isWaiting: true }))
  }, [])

  const handleCanPlay = useCallback(() => {
    setState(prev => ({ ...prev, isWaiting: false, isLoading: false }))
  }, [])

  const handleProgress = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setState(prev => ({ ...prev, buffered: video.buffered }))
  }, [])

  const handleVolumeChange = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setState(prev => ({
      ...prev,
      volume: video.volume,
      isMuted: video.muted
    }))
    onVolumeChange?.(video.volume)
  }, [onVolumeChange])

  const handleRateChange = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    setState(prev => ({ ...prev, playbackRate: video.playbackRate }))
    onPlaybackRateChange?.(video.playbackRate)
  }, [onPlaybackRateChange])

  // Fullscreen handlers
  const handleFullscreenChange = useCallback(() => {
    setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }))
  }, [])

  // Controls
  const play = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      await video.play()
    } catch (error) {
      console.error('Error playing video:', error)
      handleError()
    }
  }, [handleError])

  const pause = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.pause()
  }, [])

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause()
    } else {
      play()
    }
  }, [state.isPlaying, play, pause])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.max(0, Math.min(time, video.duration))
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    const video = videoRef.current
    if (!video) return

    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    video.volume = clampedVolume
    
    if (clampedVolume > 0 && video.muted) {
      video.muted = false
    }
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current
    if (!video) return

    const clampedRate = Math.max(0.25, Math.min(2, rate))
    video.playbackRate = clampedRate
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await video.requestFullscreen()
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }, [])

  const skipForward = useCallback((seconds = skipInterval) => {
    const video = videoRef.current
    if (!video) return

    seek(video.currentTime + seconds)
  }, [seek, skipInterval])

  const skipBackward = useCallback((seconds = skipInterval) => {
    const video = videoRef.current
    if (!video) return

    seek(video.currentTime - seconds)
  }, [seek, skipInterval])

  const reset = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = 0
    video.pause()
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      hasError: false,
      errorMessage: undefined
    }))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current
      if (!video || !document.contains(video)) return

      // Only handle shortcuts when video is focused or in fullscreen
      if (document.activeElement !== video && !document.fullscreenElement) return

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          event.preventDefault()
          skipBackward(event.shiftKey ? 5 : skipInterval)
          break
        case 'ArrowRight':
          event.preventDefault()
          skipForward(event.shiftKey ? 5 : skipInterval)
          break
        case 'ArrowUp':
          event.preventDefault()
          setVolume(Math.min(1, state.volume + 0.1))
          break
        case 'ArrowDown':
          event.preventDefault()
          setVolume(Math.max(0, state.volume - 0.1))
          break
        case 'KeyM':
          event.preventDefault()
          toggleMute()
          break
        case 'KeyF':
          event.preventDefault()
          toggleFullscreen()
          break
        case 'Home':
          event.preventDefault()
          seek(0)
          break
        case 'End':
          event.preventDefault()
          seek(state.duration)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, skipBackward, skipForward, setVolume, toggleMute, toggleFullscreen, seek, state.volume, state.duration, skipInterval])

  // Setup video element event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Set initial properties
    video.autoplay = autoPlay
    video.loop = loop
    video.muted = muted
    video.volume = volume
    video.playbackRate = playbackRate

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('ratechange', handleRateChange)
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('ratechange', handleRateChange)
      
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [autoPlay, loop, muted, volume, playbackRate, handleLoadedMetadata, handleTimeUpdate, handlePlay, handlePause, handleEnded, handleError, handleWaiting, handleCanPlay, handleProgress, handleVolumeChange, handleRateChange, handleFullscreenChange])

  // Computed values
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0
  const formattedCurrentTime = formatTime(state.currentTime)
  const formattedDuration = formatTime(state.duration)
  const isNearEnd = state.duration > 0 && (state.duration - state.currentTime) < 30 // Last 30 seconds

  const controls: VideoPlayerControls = {
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleFullscreen,
    skipForward,
    skipBackward,
    reset
  }

  return {
    videoRef,
    state,
    controls,
    progress,
    formattedCurrentTime,
    formattedDuration,
    isNearEnd
  }
}

export default useVideoPlayer