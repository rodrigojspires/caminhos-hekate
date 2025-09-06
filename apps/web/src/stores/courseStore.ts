'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Course {
  id: string
  title: string
  description: string
  instructor: {
    id: string
    name: string
    avatar?: string
    bio?: string
  }
  thumbnail: string
  duration: number // in minutes
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags: string[]
  price: number
  originalPrice?: number
  rating: number
  reviewCount: number
  studentCount: number
  isPublished: boolean
  isFeatured: boolean
  createdAt: Date
  updatedAt: Date
  modules: CourseModule[]
  requirements?: string[]
  whatYouWillLearn?: string[]
  targetAudience?: string[]
}

interface CourseModule {
  id: string
  title: string
  description?: string
  order: number
  lessons: Lesson[]
  isLocked: boolean
  duration: number
}

interface Lesson {
  id: string
  title: string
  description?: string
  type: 'video' | 'text' | 'quiz' | 'assignment' | 'live'
  duration: number // in seconds for video, estimated reading time for text
  order: number
  isPreview: boolean
  isCompleted: boolean
  videoUrl?: string
  content?: string
  resources?: {
    id: string
    name: string
    type: string
    url: string
    size?: number
  }[]
  quiz?: {
    id: string
    questions: any[]
    passingScore: number
  }
  assignment?: {
    id: string
    instructions: string
    dueDate?: Date
    maxScore: number
  }
}

interface UserProgress {
  courseId: string
  lessonId: string
  progress: number // 0-100
  timeSpent: number // in seconds
  lastAccessedAt: Date
  isCompleted: boolean
  score?: number
}

interface Enrollment {
  id: string
  courseId: string
  userId: string
  enrolledAt: Date
  completedAt?: Date
  progress: number // 0-100
  certificateUrl?: string
  lastAccessedLessonId?: string
}

interface CourseFilters {
  category?: string
  level?: Course['level']
  priceRange?: {
    min: number
    max: number
  }
  duration?: {
    min: number
    max: number
  }
  rating?: number
  tags?: string[]
  instructor?: string
  isFree?: boolean
  isNew?: boolean
  hasCertificate?: boolean
}

interface CourseStore {
  // State
  courses: Course[]
  enrollments: Enrollment[]
  userProgress: UserProgress[]
  currentCourse: Course | null
  currentLesson: Lesson | null
  currentModule: CourseModule | null
  isLoading: boolean
  error: string | null
  filters: CourseFilters
  searchQuery: string
  sortBy: 'title' | 'rating' | 'price' | 'duration' | 'studentCount' | 'createdAt'
  sortOrder: 'asc' | 'desc'
  
  // Course Management
  setCourses: (courses: Course[]) => void
  addCourse: (course: Course) => void
  updateCourse: (id: string, updates: Partial<Course>) => void
  deleteCourse: (id: string) => void
  getCourse: (id: string) => Course | null
  
  // Enrollment Management
  enrollInCourse: (courseId: string, userId: string) => void
  unenrollFromCourse: (courseId: string, userId: string) => void
  getUserEnrollments: (userId: string) => Enrollment[]
  isUserEnrolled: (courseId: string, userId: string) => boolean
  
  // Progress Management
  updateProgress: (courseId: string, lessonId: string, progress: Partial<UserProgress>) => void
  markLessonComplete: (courseId: string, lessonId: string, userId: string) => void
  markLessonIncomplete: (courseId: string, lessonId: string, userId: string) => void
  getCourseProgress: (courseId: string, userId: string) => number
  getLessonProgress: (courseId: string, lessonId: string, userId: string) => UserProgress | null
  
  // Navigation
  setCurrentCourse: (course: Course | null) => void
  setCurrentLesson: (lesson: Lesson | null) => void
  setCurrentModule: (module: CourseModule | null) => void
  getNextLesson: (courseId: string, currentLessonId: string) => Lesson | null
  getPreviousLesson: (courseId: string, currentLessonId: string) => Lesson | null
  
  // Filtering and Search
  setFilters: (filters: Partial<CourseFilters>) => void
  clearFilters: () => void
  setSearchQuery: (query: string) => void
  setSorting: (sortBy: CourseStore['sortBy'], sortOrder: CourseStore['sortOrder']) => void
  getFilteredCourses: () => Course[]
  
  // Utility
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  
  // Statistics
  getStats: () => {
    totalCourses: number
    totalEnrollments: number
    averageRating: number
    totalDuration: number
    completionRate: number
    popularCategories: { category: string; count: number }[]
  }
}

const initialState = {
  courses: [],
  enrollments: [],
  userProgress: [],
  currentCourse: null,
  currentLesson: null,
  currentModule: null,
  isLoading: false,
  error: null,
  filters: {},
  searchQuery: '',
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const
}

export const useCourseStore = create<CourseStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Course Management
      setCourses: (courses) => set({ courses }),
      
      addCourse: (course) => set((state) => ({
        courses: [...state.courses, course]
      })),
      
      updateCourse: (id, updates) => set((state) => ({
        courses: state.courses.map(course => 
          course.id === id ? { ...course, ...updates } : course
        )
      })),
      
      deleteCourse: (id) => set((state) => ({
        courses: state.courses.filter(course => course.id !== id),
        enrollments: state.enrollments.filter(enrollment => enrollment.courseId !== id),
        userProgress: state.userProgress.filter(progress => progress.courseId !== id)
      })),
      
      getCourse: (id) => {
        const { courses } = get()
        return courses.find(course => course.id === id) || null
      },
      
      // Enrollment Management
      enrollInCourse: (courseId, userId) => {
        const { enrollments } = get()
        const existingEnrollment = enrollments.find(
          e => e.courseId === courseId && e.userId === userId
        )
        
        if (!existingEnrollment) {
          const newEnrollment: Enrollment = {
            id: `${courseId}-${userId}-${Date.now()}`,
            courseId,
            userId,
            enrolledAt: new Date(),
            progress: 0
          }
          
          set((state) => ({
            enrollments: [...state.enrollments, newEnrollment]
          }))
        }
      },
      
      unenrollFromCourse: (courseId, userId) => set((state) => ({
        enrollments: state.enrollments.filter(
          e => !(e.courseId === courseId && e.userId === userId)
        ),
        userProgress: state.userProgress.filter(
          p => !(p.courseId === courseId)
        )
      })),
      
      getUserEnrollments: (userId) => {
        const { enrollments } = get()
        return enrollments.filter(enrollment => enrollment.userId === userId)
      },
      
      isUserEnrolled: (courseId, userId) => {
        const { enrollments } = get()
        return enrollments.some(
          e => e.courseId === courseId && e.userId === userId
        )
      },
      
      // Progress Management
      updateProgress: (courseId, lessonId, progressUpdate) => {
        set((state) => {
          const existingProgressIndex = state.userProgress.findIndex(
            p => p.courseId === courseId && p.lessonId === lessonId
          )
          
          if (existingProgressIndex >= 0) {
            const updatedProgress = [...state.userProgress]
            updatedProgress[existingProgressIndex] = {
              ...updatedProgress[existingProgressIndex],
              ...progressUpdate,
              lastAccessedAt: new Date()
            }
            return { userProgress: updatedProgress }
          } else {
            const newProgress: UserProgress = {
              courseId,
              lessonId,
              progress: 0,
              timeSpent: 0,
              lastAccessedAt: new Date(),
              isCompleted: false,
              ...progressUpdate
            }
            return { userProgress: [...state.userProgress, newProgress] }
          }
        })
        
        // Update enrollment progress
        const { userProgress, enrollments } = get()
        const courseProgress = userProgress.filter(p => p.courseId === courseId)
        const totalLessons = courseProgress.length
        const completedLessons = courseProgress.filter(p => p.isCompleted).length
        const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
        
        set((state) => ({
          enrollments: state.enrollments.map(enrollment => 
            enrollment.courseId === courseId 
              ? { ...enrollment, progress: overallProgress }
              : enrollment
          )
        }))
      },
      
      markLessonComplete: (courseId, lessonId, userId) => {
        get().updateProgress(courseId, lessonId, {
          progress: 100,
          isCompleted: true
        })
      },
      
      markLessonIncomplete: (courseId, lessonId, userId) => {
        get().updateProgress(courseId, lessonId, {
          isCompleted: false
        })
      },
      
      getCourseProgress: (courseId, userId) => {
        const { enrollments } = get()
        const enrollment = enrollments.find(
          e => e.courseId === courseId && e.userId === userId
        )
        return enrollment?.progress || 0
      },
      
      getLessonProgress: (courseId, lessonId, userId) => {
        const { userProgress } = get()
        return userProgress.find(
          p => p.courseId === courseId && p.lessonId === lessonId
        ) || null
      },
      
      // Navigation
      setCurrentCourse: (course) => set({ currentCourse: course }),
      setCurrentLesson: (lesson) => set({ currentLesson: lesson }),
      setCurrentModule: (module) => set({ currentModule: module }),
      
      getNextLesson: (courseId, currentLessonId) => {
        const { courses } = get()
        const course = courses.find(c => c.id === courseId)
        if (!course) return null
        
        let allLessons: Lesson[] = []
        course.modules.forEach(module => {
          allLessons = [...allLessons, ...module.lessons]
        })
        
        allLessons.sort((a, b) => a.order - b.order)
        
        const currentIndex = allLessons.findIndex(l => l.id === currentLessonId)
        return currentIndex >= 0 && currentIndex < allLessons.length - 1 
          ? allLessons[currentIndex + 1] 
          : null
      },
      
      getPreviousLesson: (courseId, currentLessonId) => {
        const { courses } = get()
        const course = courses.find(c => c.id === courseId)
        if (!course) return null
        
        let allLessons: Lesson[] = []
        course.modules.forEach(module => {
          allLessons = [...allLessons, ...module.lessons]
        })
        
        allLessons.sort((a, b) => a.order - b.order)
        
        const currentIndex = allLessons.findIndex(l => l.id === currentLessonId)
        return currentIndex > 0 ? allLessons[currentIndex - 1] : null
      },
      
      // Filtering and Search
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      
      clearFilters: () => set({ filters: {} }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
      
      getFilteredCourses: () => {
        const { courses, filters, searchQuery, sortBy, sortOrder } = get()
        
        let filtered = [...courses]
        
        // Apply search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(course => 
            course.title.toLowerCase().includes(query) ||
            course.description.toLowerCase().includes(query) ||
            course.instructor.name.toLowerCase().includes(query) ||
            course.tags.some(tag => tag.toLowerCase().includes(query))
          )
        }
        
        // Apply filters
        if (filters.category) {
          filtered = filtered.filter(course => course.category === filters.category)
        }
        
        if (filters.level) {
          filtered = filtered.filter(course => course.level === filters.level)
        }
        
        if (filters.priceRange) {
          filtered = filtered.filter(course => 
            course.price >= filters.priceRange!.min && 
            course.price <= filters.priceRange!.max
          )
        }
        
        if (filters.duration) {
          filtered = filtered.filter(course => 
            course.duration >= filters.duration!.min && 
            course.duration <= filters.duration!.max
          )
        }
        
        if (filters.rating) {
          filtered = filtered.filter(course => course.rating >= filters.rating!)
        }
        
        if (filters.tags && filters.tags.length > 0) {
          filtered = filtered.filter(course => 
            filters.tags!.some(tag => course.tags.includes(tag))
          )
        }
        
        if (filters.instructor) {
          filtered = filtered.filter(course => course.instructor.id === filters.instructor)
        }
        
        if (filters.isFree !== undefined) {
          filtered = filtered.filter(course => 
            filters.isFree ? course.price === 0 : course.price > 0
          )
        }
        
        if (filters.isNew) {
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          filtered = filtered.filter(course => course.createdAt > thirtyDaysAgo)
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
          let aValue: any
          let bValue: any
          
          switch (sortBy) {
            case 'title':
              aValue = a.title.toLowerCase()
              bValue = b.title.toLowerCase()
              break
            case 'rating':
              aValue = a.rating
              bValue = b.rating
              break
            case 'price':
              aValue = a.price
              bValue = b.price
              break
            case 'duration':
              aValue = a.duration
              bValue = b.duration
              break
            case 'studentCount':
              aValue = a.studentCount
              bValue = b.studentCount
              break
            case 'createdAt':
              aValue = a.createdAt.getTime()
              bValue = b.createdAt.getTime()
              break
            default:
              return 0
          }
          
          if (sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
          } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
          }
        })
        
        return filtered
      },
      
      // Utility
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
      
      // Statistics
      getStats: () => {
        const { courses, enrollments } = get()
        
        const totalCourses = courses.length
        const totalEnrollments = enrollments.length
        
        const averageRating = courses.length > 0 
          ? courses.reduce((sum, course) => sum + course.rating, 0) / courses.length
          : 0
        
        const totalDuration = courses.reduce((sum, course) => sum + course.duration, 0)
        
        const completedEnrollments = enrollments.filter(e => e.progress === 100).length
        const completionRate = totalEnrollments > 0 
          ? (completedEnrollments / totalEnrollments) * 100
          : 0
        
        const categoryCount: Record<string, number> = {}
        courses.forEach(course => {
          categoryCount[course.category] = (categoryCount[course.category] || 0) + 1
        })
        
        const popularCategories = Object.entries(categoryCount)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
        
        return {
          totalCourses,
          totalEnrollments,
          averageRating,
          totalDuration,
          completionRate,
          popularCategories
        }
      }
    }),
    {
      name: 'course-store',
      partialize: (state: CourseStore) => ({
        enrollments: state.enrollments,
        userProgress: state.userProgress,
        filters: state.filters,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      })
    }
  )
);

export default useCourseStore;