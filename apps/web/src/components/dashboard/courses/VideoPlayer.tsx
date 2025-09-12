"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipBack, SkipForward, Bookmark, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import Hls from 'hls.js'

interface VideoPlayerProps {
  src: string
  title: string
  duration?: number
  currentTime?: number
  onTimeUpdate?: (time: number) => void
  onProgress?: (progress: number) => void
  bookmarks?: Bookmark[]
  subtitles?: Subtitle[]
  playbackSpeed?: number
  autoPlay?: boolean
  className?: string
}

interface Bookmark {
  id: string
  time: number
  title: string
  note?: string
}

interface Subtitle {
  start: number
  end: number
  text: string
}

export function VideoPlayer({
  src,
  title,
  duration = 0,
  currentTime = 0,
  onTimeUpdate,
  onProgress,
  bookmarks = [],
  subtitles = [],
  playbackSpeed = 1,
  autoPlay = false,
  className
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([100])
  const [progress, setProgress] = useState([0])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('')
  const [speed, setSpeed] = useState(playbackSpeed)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const hlsRef = useRef<Hls | null>(null)

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume([newVolume])
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100
      setIsMuted(newVolume === 0)
    }
  }

  // Handle progress change
  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0]
    setProgress([newProgress])
    if (videoRef.current && duration) {
      const newTime = (newProgress / 100) * duration
      videoRef.current.currentTime = newTime
      onTimeUpdate?.(newTime)
    }
  }

  // Skip forward/backward
  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Change playback speed
  const changeSpeed = (newSpeed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed
      setSpeed(newSpeed)
    }
  }

  // Jump to bookmark
  const jumpToBookmark = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }

  // Handle mouse movement for controls
  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const current = video.currentTime
      const total = video.duration || duration
      if (total > 0) {
        const progressPercent = (current / total) * 100
        setProgress([progressPercent])
        onTimeUpdate?.(current)
        onProgress?.(progressPercent)
      }

      // Update subtitles
      if (showSubtitles && subtitles.length > 0) {
        const currentSub = subtitles.find(
          sub => current >= sub.start && current <= sub.end
        )
        setCurrentSubtitle(currentSub?.text || '')
      }
    }

    const handleLoadedMetadata = () => {
      if (currentTime > 0) {
        video.currentTime = currentTime
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', () => setIsPlaying(true))
    video.addEventListener('pause', () => setIsPlaying(false))

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', () => setIsPlaying(true))
      video.removeEventListener('pause', () => setIsPlaying(false))
    }
  }, [currentTime, duration, onTimeUpdate, onProgress, showSubtitles, subtitles])

  // Initialize HLS if needed
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    const isHlsSource = src.includes('.m3u8') || src.startsWith('http') && src.includes('m3u8')

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (isHlsSource) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari / native HLS
        video.src = src
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        })
        hlsRef.current = hls
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.ERROR, (_event, data) => {
          // Basic error logging; avoid crashing the player
          console.warn('HLS error', data)
        })
      } else {
        // Fallback: assign src anyway and let the browser try
        video.src = src
      }
    } else {
      // Non-HLS source
      video.src = src
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src])

  // Auto-hide controls
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  return (
    <TooltipProvider>
      <Card className={cn('relative overflow-hidden bg-black', className)}>
        <div 
          className="relative group"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            src={src}
            className="w-full h-auto"
            autoPlay={autoPlay}
            onClick={togglePlay}
          />

          {/* Subtitles */}
          {showSubtitles && currentSubtitle && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded text-center max-w-[80%]">
              {currentSubtitle}
            </div>
          )}

          {/* Bookmarks on timeline */}
          {bookmarks.map((bookmark) => {
            const position = duration > 0 ? (bookmark.time / duration) * 100 : 0
            return (
              <Tooltip key={bookmark.id}>
                <TooltipTrigger asChild>
                  <button
                    className="absolute bottom-16 w-2 h-2 bg-yellow-500 rounded-full transform -translate-x-1/2 hover:scale-150 transition-transform"
                    style={{ left: `${position}%` }}
                    onClick={() => jumpToBookmark(bookmark.time)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{bookmark.title}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(bookmark.time)}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}

          {/* Controls Overlay */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-0'
          )}>
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                variant="ghost"
                size="lg"
                className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 text-white"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </Button>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* Progress bar */}
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm min-w-[40px]">
                  {formatTime((progress[0] / 100) * duration)}
                </span>
                <Slider
                  value={progress}
                  onValueChange={handleProgressChange}
                  max={100}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-white text-sm min-w-[40px]">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={togglePlay} className="text-white hover:bg-white/20">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={() => skipTime(-10)} className="text-white hover:bg-white/20">
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={() => skipTime(10)} className="text-white hover:bg-white/20">
                    <SkipForward className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={toggleMute} className="text-white hover:bg-white/20">
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <Slider
                      value={volume}
                      onValueChange={handleVolumeChange}
                      max={100}
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowBookmarks(!showBookmarks)}
                    className="text-white hover:bg-white/20"
                  >
                    <Bookmark className="w-4 h-4" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="absolute top-4 right-4 bg-black/90 text-white p-4 rounded-lg space-y-3 min-w-[200px]">
              <div>
                <label className="block text-sm font-medium mb-2">Velocidade</label>
                <div className="grid grid-cols-3 gap-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speedOption) => (
                    <Button
                      key={speedOption}
                      variant={speed === speedOption ? "default" : "ghost"}
                      size="sm"
                      onClick={() => changeSpeed(speedOption)}
                      className="text-xs"
                    >
                      {speedOption}x
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Legendas</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSubtitles(!showSubtitles)}
                  className={cn(
                    "text-xs",
                    showSubtitles ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {showSubtitles ? 'ON' : 'OFF'}
                </Button>
              </div>
            </div>
          )}

          {/* Bookmarks Panel */}
          {showBookmarks && bookmarks.length > 0 && (
            <div className="absolute top-4 left-4 bg-black/90 text-white p-4 rounded-lg space-y-2 max-w-[300px] max-h-[400px] overflow-y-auto">
              <h3 className="font-medium mb-2">Marcadores</h3>
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-start space-x-2 p-2 hover:bg-white/10 rounded cursor-pointer"
                  onClick={() => jumpToBookmark(bookmark.time)}
                >
                  <Badge variant="secondary" className="text-xs">
                    {formatTime(bookmark.time)}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{bookmark.title}</p>
                    {bookmark.note && (
                      <p className="text-xs text-muted-foreground mt-1">{bookmark.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </TooltipProvider>
  )
}

export default VideoPlayer
