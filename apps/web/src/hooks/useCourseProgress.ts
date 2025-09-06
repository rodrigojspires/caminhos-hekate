'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from './useAuth'

interface LessonProgress {
  lessonId: string
  courseId: string
  completed: boolean
  watchTime: number
  totalTime: number
  lastWatchedAt: Date
  completedAt?: Date
  bookmarks: number[]
  notes: string[]
}

interface CourseProgress {
  courseId: string
  userId: string
  enrolledAt: Date
  lastAccessedAt: Date
  completedLessons: number
  totalLessons: number
  progressPercentage: number
  completedAt?: Date
  certificateIssued: boolean
  timeSpent: number
  currentLesson?: string
  lessons: Record<string, LessonProgress>
}

interface CourseStats {
  totalCourses: number
  completedCourses: number
  inProgressCourses: number
  totalTimeSpent: number
  averageProgress: number
  certificatesEarned: number
  currentStreak: number
  longestStreak: number
}

interface UseCourseProgressReturn {
  courseProgress: Record<string, CourseProgress>
  stats: CourseStats
  isLoading: boolean
  error: string | null
  enrollInCourse: (courseId: string) => Promise<void>
  updateLessonProgress: (courseId: string, lessonId: string, progress: Partial<LessonProgress>) => Promise<void>
  markLessonComplete: (courseId: string, lessonId: string) => Promise<void>
  markLessonIncomplete: (courseId: string, lessonId: string) => Promise<void>
  updateWatchTime: (courseId: string, lessonId: string, watchTime: number, totalTime: number) => Promise<void>
  getCourseProgress: (courseId: string) => CourseProgress | null
  getLessonProgress: (courseId: string, lessonId: string) => LessonProgress | null
  getNextLesson: (courseId: string, currentLessonId?: string) => string | null
  getPreviousLesson: (courseId: string, currentLessonId?: string) => string | null
  resetCourseProgress: (courseId: string) => Promise<void>
  exportProgress: () => string
  importProgress: (data: string) => Promise<void>
}

const STORAGE_KEY = 'course_progress'
const STATS_STORAGE_KEY = 'course_stats'

export function useCourseProgress(): UseCourseProgressReturn {
  const { user } = useAuth()
  const [courseProgress, setCourseProgress] = useState<Record<string, CourseProgress>>({})
  const [stats, setStats] = useState<CourseStats>({
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    totalTimeSpent: 0,
    averageProgress: 0,
    certificatesEarned: 0,
    currentStreak: 0,
    longestStreak: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load progress from localStorage
  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const savedProgress = localStorage.getItem(`${STORAGE_KEY}_${user.id}`)
      const savedStats = localStorage.getItem(`${STATS_STORAGE_KEY}_${user.id}`)
      
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress)
        // Convert date strings back to Date objects
        Object.values(parsed).forEach((progress: any) => {
          progress.enrolledAt = new Date(progress.enrolledAt)
          progress.lastAccessedAt = new Date(progress.lastAccessedAt)
          if (progress.completedAt) {
            progress.completedAt = new Date(progress.completedAt)
          }
          Object.values(progress.lessons).forEach((lesson: any) => {
            lesson.lastWatchedAt = new Date(lesson.lastWatchedAt)
            if (lesson.completedAt) {
              lesson.completedAt = new Date(lesson.completedAt)
            }
          })
        })
        setCourseProgress(parsed)
      }
      
      if (savedStats) {
        setStats(JSON.parse(savedStats))
      }
    } catch (err) {
      console.error('Error loading course progress:', err)
      setError('Erro ao carregar progresso dos cursos')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Save progress to localStorage
  const saveProgress = useCallback((newProgress: Record<string, CourseProgress>) => {
    if (!user) return
    
    try {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newProgress))
    } catch (err) {
      console.error('Error saving course progress:', err)
      setError('Erro ao salvar progresso')
    }
  }, [user])

  // Save stats to localStorage
  const saveStats = useCallback((newStats: CourseStats) => {
    if (!user) return
    
    try {
      localStorage.setItem(`${STATS_STORAGE_KEY}_${user.id}`, JSON.stringify(newStats))
    } catch (err) {
      console.error('Error saving course stats:', err)
    }
  }, [user])

  // Calculate stats from progress data
  const calculateStats = useCallback((progressData: Record<string, CourseProgress>): CourseStats => {
    const courses = Object.values(progressData)
    const totalCourses = courses.length
    const completedCourses = courses.filter(c => c.completedAt).length
    const inProgressCourses = courses.filter(c => !c.completedAt && c.completedLessons > 0).length
    const totalTimeSpent = courses.reduce((sum, c) => sum + c.timeSpent, 0)
    const averageProgress = totalCourses > 0 
      ? courses.reduce((sum, c) => sum + c.progressPercentage, 0) / totalCourses 
      : 0
    const certificatesEarned = courses.filter(c => c.certificateIssued).length

    // Calculate streaks (simplified - based on consecutive days with activity)
    const today = new Date()
    const activeDays = courses
      .map(c => c.lastAccessedAt)
      .filter(date => {
        const diffTime = Math.abs(today.getTime() - date.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays <= 30 // Active in last 30 days
      })
      .sort((a, b) => b.getTime() - a.getTime())

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    // Simplified streak calculation
    if (activeDays.length > 0) {
      const lastActivity = activeDays[0]
      const daysSinceLastActivity = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceLastActivity <= 1) {
        currentStreak = Math.min(activeDays.length, 7) // Max 7 day streak for demo
      }
      
      longestStreak = Math.min(activeDays.length, 14) // Max 14 day streak for demo
    }

    return {
      totalCourses,
      completedCourses,
      inProgressCourses,
      totalTimeSpent,
      averageProgress,
      certificatesEarned,
      currentStreak,
      longestStreak
    }
  }, [])

  // Update stats whenever progress changes
  useEffect(() => {
    const newStats = calculateStats(courseProgress)
    setStats(newStats)
    saveStats(newStats)
  }, [courseProgress, calculateStats, saveStats])

  // Enroll in course
  const enrollInCourse = useCallback(async (courseId: string) => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    try {
      const now = new Date()
      const newProgress: CourseProgress = {
        courseId,
        userId: user.id,
        enrolledAt: now,
        lastAccessedAt: now,
        completedLessons: 0,
        totalLessons: 0, // This should be fetched from course data
        progressPercentage: 0,
        certificateIssued: false,
        timeSpent: 0,
        lessons: {}
      }

      const updatedProgress = {
        ...courseProgress,
        [courseId]: newProgress
      }

      setCourseProgress(updatedProgress)
      saveProgress(updatedProgress)
      setError(null)
    } catch (err) {
      console.error('Error enrolling in course:', err)
      setError('Erro ao se inscrever no curso')
    }
  }, [user, courseProgress, saveProgress])

  // Update lesson progress
  const updateLessonProgress = useCallback(async (
    courseId: string, 
    lessonId: string, 
    progress: Partial<LessonProgress>
  ) => {
    if (!user) return

    try {
      const courseData = courseProgress[courseId]
      if (!courseData) {
        await enrollInCourse(courseId)
        return
      }

      const existingLesson = courseData.lessons[lessonId] || {
        lessonId,
        courseId,
        completed: false,
        watchTime: 0,
        totalTime: 0,
        lastWatchedAt: new Date(),
        bookmarks: [],
        notes: []
      }

      const updatedLesson = {
        ...existingLesson,
        ...progress,
        lastWatchedAt: new Date()
      }

      const updatedLessons = {
        ...courseData.lessons,
        [lessonId]: updatedLesson
      }

      const completedCount = Object.values(updatedLessons).filter(l => l.completed).length
      const totalLessons = Math.max(Object.keys(updatedLessons).length, courseData.totalLessons)
      const progressPercentage = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0

      const updatedCourse = {
        ...courseData,
        lessons: updatedLessons,
        completedLessons: completedCount,
        totalLessons,
        progressPercentage,
        lastAccessedAt: new Date(),
        currentLesson: lessonId,
        completedAt: progressPercentage === 100 ? new Date() : courseData.completedAt
      }

      const updatedProgress = {
        ...courseProgress,
        [courseId]: updatedCourse
      }

      setCourseProgress(updatedProgress)
      saveProgress(updatedProgress)
      setError(null)
    } catch (err) {
      console.error('Error updating lesson progress:', err)
      setError('Erro ao atualizar progresso da aula')
    }
  }, [user, courseProgress, saveProgress, enrollInCourse])

  // Mark lesson as complete
  const markLessonComplete = useCallback(async (courseId: string, lessonId: string) => {
    await updateLessonProgress(courseId, lessonId, {
      completed: true,
      completedAt: new Date()
    })
  }, [updateLessonProgress])

  // Mark lesson as incomplete
  const markLessonIncomplete = useCallback(async (courseId: string, lessonId: string) => {
    await updateLessonProgress(courseId, lessonId, {
      completed: false,
      completedAt: undefined
    })
  }, [updateLessonProgress])

  // Update watch time
  const updateWatchTime = useCallback(async (
    courseId: string, 
    lessonId: string, 
    watchTime: number, 
    totalTime: number
  ) => {
    const courseData = courseProgress[courseId]
    if (!courseData) return

    const currentLesson = courseData.lessons[lessonId]
    const timeSpentDiff = watchTime - (currentLesson?.watchTime || 0)

    await updateLessonProgress(courseId, lessonId, {
      watchTime,
      totalTime
    })

    // Update course time spent
    const updatedCourse = {
      ...courseData,
      timeSpent: courseData.timeSpent + Math.max(0, timeSpentDiff)
    }

    const updatedProgress = {
      ...courseProgress,
      [courseId]: updatedCourse
    }

    setCourseProgress(updatedProgress)
    saveProgress(updatedProgress)
  }, [courseProgress, updateLessonProgress, saveProgress])

  // Get course progress
  const getCourseProgress = useCallback((courseId: string): CourseProgress | null => {
    return courseProgress[courseId] || null
  }, [courseProgress])

  // Get lesson progress
  const getLessonProgress = useCallback((courseId: string, lessonId: string): LessonProgress | null => {
    const course = courseProgress[courseId]
    return course?.lessons[lessonId] || null
  }, [courseProgress])

  // Get next lesson
  const getNextLesson = useCallback((courseId: string, currentLessonId?: string): string | null => {
    const course = courseProgress[courseId]
    if (!course) return null

    const lessonIds = Object.keys(course.lessons).sort()
    if (!currentLessonId) return lessonIds[0] || null

    const currentIndex = lessonIds.indexOf(currentLessonId)
    return currentIndex >= 0 && currentIndex < lessonIds.length - 1 
      ? lessonIds[currentIndex + 1] 
      : null
  }, [courseProgress])

  // Get previous lesson
  const getPreviousLesson = useCallback((courseId: string, currentLessonId?: string): string | null => {
    const course = courseProgress[courseId]
    if (!course) return null

    const lessonIds = Object.keys(course.lessons).sort()
    if (!currentLessonId) return null

    const currentIndex = lessonIds.indexOf(currentLessonId)
    return currentIndex > 0 ? lessonIds[currentIndex - 1] : null
  }, [courseProgress])

  // Reset course progress
  const resetCourseProgress = useCallback(async (courseId: string) => {
    if (!user) return

    try {
      const updatedProgress = { ...courseProgress }
      delete updatedProgress[courseId]

      setCourseProgress(updatedProgress)
      saveProgress(updatedProgress)
      setError(null)
    } catch (err) {
      console.error('Error resetting course progress:', err)
      setError('Erro ao resetar progresso do curso')
    }
  }, [user, courseProgress, saveProgress])

  // Export progress
  const exportProgress = useCallback((): string => {
    return JSON.stringify({
      courseProgress,
      stats,
      exportedAt: new Date().toISOString(),
      userId: user?.id
    }, null, 2)
  }, [courseProgress, stats, user])

  // Import progress
  const importProgress = useCallback(async (data: string) => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    try {
      const parsed = JSON.parse(data)
      
      if (parsed.userId !== user.id) {
        setError('Os dados importados pertencem a outro usuário')
        return
      }

      // Convert date strings back to Date objects
      Object.values(parsed.courseProgress).forEach((progress: any) => {
        progress.enrolledAt = new Date(progress.enrolledAt)
        progress.lastAccessedAt = new Date(progress.lastAccessedAt)
        if (progress.completedAt) {
          progress.completedAt = new Date(progress.completedAt)
        }
        Object.values(progress.lessons).forEach((lesson: any) => {
          lesson.lastWatchedAt = new Date(lesson.lastWatchedAt)
          if (lesson.completedAt) {
            lesson.completedAt = new Date(lesson.completedAt)
          }
        })
      })

      setCourseProgress(parsed.courseProgress)
      setStats(parsed.stats)
      saveProgress(parsed.courseProgress)
      saveStats(parsed.stats)
      setError(null)
    } catch (err) {
      console.error('Error importing progress:', err)
      setError('Erro ao importar progresso')
    }
  }, [user, saveProgress, saveStats])

  return {
    courseProgress,
    stats,
    isLoading,
    error,
    enrollInCourse,
    updateLessonProgress,
    markLessonComplete,
    markLessonIncomplete,
    updateWatchTime,
    getCourseProgress,
    getLessonProgress,
    getNextLesson,
    getPreviousLesson,
    resetCourseProgress,
    exportProgress,
    importProgress
  }
}

export default useCourseProgress