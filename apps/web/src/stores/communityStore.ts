'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  avatar?: string
  role: 'student' | 'instructor' | 'admin' | 'moderator'
  reputation: number
  badges: string[]
  joinedAt: Date
}

interface Post {
  id: string
  title: string
  content: string
  excerpt?: string
  author: User
  category: string
  tags: string[]
  type: 'discussion' | 'question' | 'announcement' | 'resource' | 'showcase'
  status: 'draft' | 'published' | 'archived' | 'deleted'
  isPinned: boolean
  isFeatured: boolean
  isLocked: boolean
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  
  // Engagement
  likes: string[] // user IDs
  dislikes: string[] // user IDs
  views: number
  shares: number
  bookmarks: string[] // user IDs
  
  // Content
  attachments?: {
    id: string
    name: string
    type: string
    url: string
    size: number
  }[]
  
  // Moderation
  reports: {
    id: string
    userId: string
    reason: string
    description?: string
    createdAt: Date
  }[]
  
  // Course relation
  courseId?: string
  lessonId?: string
}

interface Comment {
  id: string
  postId: string
  parentId?: string // for replies
  content: string
  author: User
  createdAt: Date
  updatedAt: Date
  
  // Engagement
  likes: string[] // user IDs
  dislikes: string[] // user IDs
  
  // Status
  isEdited: boolean
  isDeleted: boolean
  isBestAnswer: boolean
  isPinned: boolean
  
  // Moderation
  reports: {
    id: string
    userId: string
    reason: string
    description?: string
    createdAt: Date
  }[]
  
  // Nested replies
  replies?: Comment[]
}

interface CommunityFilters {
  category?: string
  type?: Post['type']
  tags?: string[]
  author?: string
  courseId?: string
  dateRange?: {
    start: Date
    end: Date
  }
  hasAnswers?: boolean
  isAnswered?: boolean
  minLikes?: number
  sortBy?: 'newest' | 'oldest' | 'popular' | 'trending' | 'unanswered'
}

interface UserActivity {
  userId: string
  posts: number
  comments: number
  likes: number
  reputation: number
  badges: string[]
  lastActive: Date
}

interface CommunityStats {
  totalPosts: number
  totalComments: number
  totalUsers: number
  activeUsers: number
  topCategories: { category: string; count: number }[]
  topTags: { tag: string; count: number }[]
  recentActivity: {
    posts: number
    comments: number
    users: number
  }
}

interface CommunityStore {
  // State
  posts: Post[]
  comments: Comment[]
  users: User[]
  currentPost: Post | null
  isLoading: boolean
  error: string | null
  filters: CommunityFilters
  searchQuery: string
  
  // Post Management
  setPosts: (posts: Post[]) => void
  addPost: (post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'dislikes' | 'views' | 'shares' | 'bookmarks' | 'reports'>) => string
  updatePost: (id: string, updates: Partial<Post>) => void
  deletePost: (id: string) => void
  getPost: (id: string) => Post | null
  publishPost: (id: string) => void
  archivePost: (id: string) => void
  pinPost: (id: string, isPinned: boolean) => void
  lockPost: (id: string, isLocked: boolean) => void
  
  // Comment Management
  setComments: (comments: Comment[]) => void
  addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'dislikes' | 'isEdited' | 'isDeleted' | 'reports'>) => string
  updateComment: (id: string, updates: Partial<Comment>) => void
  deleteComment: (id: string) => void
  getComment: (id: string) => Comment | null
  getPostComments: (postId: string) => Comment[]
  markBestAnswer: (commentId: string, postId: string) => void
  pinComment: (commentId: string, isPinned: boolean) => void
  
  // Engagement
  likePost: (postId: string, userId: string) => void
  unlikePost: (postId: string, userId: string) => void
  dislikePost: (postId: string, userId: string) => void
  undislikePost: (postId: string, userId: string) => void
  bookmarkPost: (postId: string, userId: string) => void
  unbookmarkPost: (postId: string, userId: string) => void
  sharePost: (postId: string) => void
  viewPost: (postId: string) => void
  
  likeComment: (commentId: string, userId: string) => void
  unlikeComment: (commentId: string, userId: string) => void
  dislikeComment: (commentId: string, userId: string) => void
  undislikeComment: (commentId: string, userId: string) => void
  
  // User Management
  setUsers: (users: User[]) => void
  addUser: (user: User) => void
  updateUser: (id: string, updates: Partial<User>) => void
  getUser: (id: string) => User | null
  getUserActivity: (userId: string) => UserActivity
  
  // Moderation
  reportPost: (postId: string, userId: string, reason: string, description?: string) => void
  reportComment: (commentId: string, userId: string, reason: string, description?: string) => void
  getReportedPosts: () => Post[]
  getReportedComments: () => Comment[]
  
  // Search and Filtering
  setFilters: (filters: Partial<CommunityFilters>) => void
  clearFilters: () => void
  setSearchQuery: (query: string) => void
  getFilteredPosts: () => Post[]
  searchPosts: (query: string) => Post[]
  
  // Navigation
  setCurrentPost: (post: Post | null) => void
  
  // Statistics
  getStats: () => CommunityStats
  getTrendingPosts: (limit?: number) => Post[]
  getPopularTags: (limit?: number) => string[]
  getTopContributors: (limit?: number) => User[]
  
  // Utility
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  posts: [],
  comments: [],
  users: [],
  currentPost: null,
  isLoading: false,
  error: null,
  filters: {},
  searchQuery: ''
}

export const useCommunityStore = create<CommunityStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Post Management
      setPosts: (posts) => set({ posts }),
      
      addPost: (postData) => {
        const now = new Date()
        const newPost: Post = {
          ...postData,
          id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
          likes: [],
          dislikes: [],
          views: 0,
          shares: 0,
          bookmarks: [],
          reports: []
        }
        
        set((state) => ({
          posts: [newPost, ...state.posts]
        }))
        
        return newPost.id
      },
      
      updatePost: (id, updates) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === id 
            ? { ...post, ...updates, updatedAt: new Date() }
            : post
        )
      })),
      
      deletePost: (id) => set((state) => ({
        posts: state.posts.filter(post => post.id !== id),
        comments: state.comments.filter(comment => comment.postId !== id)
      })),
      
      getPost: (id) => {
        const { posts } = get()
        return posts.find(post => post.id === id) || null
      },
      
      publishPost: (id) => {
        get().updatePost(id, {
          status: 'published',
          publishedAt: new Date()
        })
      },
      
      archivePost: (id) => {
        get().updatePost(id, { status: 'archived' })
      },
      
      pinPost: (id, isPinned) => {
        get().updatePost(id, { isPinned })
      },
      
      lockPost: (id, isLocked) => {
        get().updatePost(id, { isLocked })
      },
      
      // Comment Management
      setComments: (comments) => set({ comments }),
      
      addComment: (commentData) => {
        const now = new Date()
        const newComment: Comment = {
          ...commentData,
          id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
          likes: [],
          dislikes: [],
          isEdited: false,
          isDeleted: false,
          isBestAnswer: false,
          isPinned: false,
          reports: []
        }
        
        set((state) => ({
          comments: [...state.comments, newComment]
        }))
        
        return newComment.id
      },
      
      updateComment: (id, updates) => set((state) => ({
        comments: state.comments.map(comment => 
          comment.id === id 
            ? { 
                ...comment, 
                ...updates, 
                updatedAt: new Date(),
                isEdited: updates.content ? true : comment.isEdited
              }
            : comment
        )
      })),
      
      deleteComment: (id) => {
        get().updateComment(id, { isDeleted: true })
      },
      
      getComment: (id) => {
        const { comments } = get()
        return comments.find(comment => comment.id === id) || null
      },
      
      getPostComments: (postId) => {
        const { comments } = get()
        return comments
          .filter(comment => comment.postId === postId && !comment.isDeleted)
          .sort((a, b) => {
            // Pinned comments first
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            // Best answers next
            if (a.isBestAnswer && !b.isBestAnswer) return -1
            if (!a.isBestAnswer && b.isBestAnswer) return 1
            // Then by creation date
            return a.createdAt.getTime() - b.createdAt.getTime()
          })
      },
      
      markBestAnswer: (commentId, postId) => {
        const { comments } = get()
        
        set((state) => ({
          comments: state.comments.map(comment => {
            if (comment.postId === postId) {
              return {
                ...comment,
                isBestAnswer: comment.id === commentId
              }
            }
            return comment
          })
        }))
      },
      
      pinComment: (commentId, isPinned) => {
        get().updateComment(commentId, { isPinned })
      },
      
      // Engagement
      likePost: (postId, userId) => set((state) => ({
        posts: state.posts.map(post => {
          if (post.id === postId) {
            const likes = post.likes.includes(userId) 
              ? post.likes 
              : [...post.likes, userId]
            const dislikes = post.dislikes.filter(id => id !== userId)
            return { ...post, likes, dislikes }
          }
          return post
        })
      })),
      
      unlikePost: (postId, userId) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === postId 
            ? { ...post, likes: post.likes.filter(id => id !== userId) }
            : post
        )
      })),
      
      dislikePost: (postId, userId) => set((state) => ({
        posts: state.posts.map(post => {
          if (post.id === postId) {
            const dislikes = post.dislikes.includes(userId) 
              ? post.dislikes 
              : [...post.dislikes, userId]
            const likes = post.likes.filter(id => id !== userId)
            return { ...post, likes, dislikes }
          }
          return post
        })
      })),
      
      undislikePost: (postId, userId) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === postId 
            ? { ...post, dislikes: post.dislikes.filter(id => id !== userId) }
            : post
        )
      })),
      
      bookmarkPost: (postId, userId) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === postId && !post.bookmarks.includes(userId)
            ? { ...post, bookmarks: [...post.bookmarks, userId] }
            : post
        )
      })),
      
      unbookmarkPost: (postId, userId) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === postId 
            ? { ...post, bookmarks: post.bookmarks.filter(id => id !== userId) }
            : post
        )
      })),
      
      sharePost: (postId) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === postId 
            ? { ...post, shares: post.shares + 1 }
            : post
        )
      })),
      
      viewPost: (postId) => set((state) => ({
        posts: state.posts.map(post => 
          post.id === postId 
            ? { ...post, views: post.views + 1 }
            : post
        )
      })),
      
      likeComment: (commentId, userId) => set((state) => ({
        comments: state.comments.map(comment => {
          if (comment.id === commentId) {
            const likes = comment.likes.includes(userId) 
              ? comment.likes 
              : [...comment.likes, userId]
            const dislikes = comment.dislikes.filter(id => id !== userId)
            return { ...comment, likes, dislikes }
          }
          return comment
        })
      })),
      
      unlikeComment: (commentId, userId) => set((state) => ({
        comments: state.comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, likes: comment.likes.filter(id => id !== userId) }
            : comment
        )
      })),
      
      dislikeComment: (commentId, userId) => set((state) => ({
        comments: state.comments.map(comment => {
          if (comment.id === commentId) {
            const dislikes = comment.dislikes.includes(userId) 
              ? comment.dislikes 
              : [...comment.dislikes, userId]
            const likes = comment.likes.filter(id => id !== userId)
            return { ...comment, likes, dislikes }
          }
          return comment
        })
      })),
      
      undislikeComment: (commentId, userId) => set((state) => ({
        comments: state.comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, dislikes: comment.dislikes.filter(id => id !== userId) }
            : comment
        )
      })),
      
      // User Management
      setUsers: (users) => set({ users }),
      
      addUser: (user) => set((state) => ({
        users: [...state.users, user]
      })),
      
      updateUser: (id, updates) => set((state) => ({
        users: state.users.map(user => 
          user.id === id ? { ...user, ...updates } : user
        )
      })),
      
      getUser: (id) => {
        const { users } = get()
        return users.find(user => user.id === id) || null
      },
      
      getUserActivity: (userId) => {
        const { posts, comments } = get()
        
        const userPosts = posts.filter(post => post.author.id === userId)
        const userComments = comments.filter(comment => comment.author.id === userId)
        
        const totalLikes = userPosts.reduce((sum, post) => sum + post.likes.length, 0) +
                          userComments.reduce((sum, comment) => sum + comment.likes.length, 0)
        
        const user = get().getUser(userId)
        
        return {
          userId,
          posts: userPosts.length,
          comments: userComments.length,
          likes: totalLikes,
          reputation: user?.reputation || 0,
          badges: user?.badges || [],
          lastActive: new Date() // This would come from actual user activity tracking
        }
      },
      
      // Moderation
      reportPost: (postId, userId, reason, description) => {
        const report = {
          id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          reason,
          description,
          createdAt: new Date()
        }
        
        set((state) => ({
          posts: state.posts.map(post => 
            post.id === postId 
              ? { ...post, reports: [...post.reports, report] }
              : post
          )
        }))
      },
      
      reportComment: (commentId, userId, reason, description) => {
        const report = {
          id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          reason,
          description,
          createdAt: new Date()
        }
        
        set((state) => ({
          comments: state.comments.map(comment => 
            comment.id === commentId 
              ? { ...comment, reports: [...comment.reports, report] }
              : comment
          )
        }))
      },
      
      getReportedPosts: () => {
        const { posts } = get()
        return posts.filter(post => post.reports.length > 0)
      },
      
      getReportedComments: () => {
        const { comments } = get()
        return comments.filter(comment => comment.reports.length > 0)
      },
      
      // Search and Filtering
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      
      clearFilters: () => set({ filters: {} }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      getFilteredPosts: () => {
        const { posts, filters } = get()
        
        let filtered = posts.filter(post => post.status === 'published')
        
        if (filters.category) {
          filtered = filtered.filter(post => post.category === filters.category)
        }
        
        if (filters.type) {
          filtered = filtered.filter(post => post.type === filters.type)
        }
        
        if (filters.tags && filters.tags.length > 0) {
          filtered = filtered.filter(post => 
            filters.tags!.some(tag => post.tags.includes(tag))
          )
        }
        
        if (filters.author) {
          filtered = filtered.filter(post => post.author.id === filters.author)
        }
        
        if (filters.courseId) {
          filtered = filtered.filter(post => post.courseId === filters.courseId)
        }
        
        if (filters.dateRange) {
          filtered = filtered.filter(post => 
            post.createdAt >= filters.dateRange!.start &&
            post.createdAt <= filters.dateRange!.end
          )
        }
        
        if (filters.minLikes) {
          filtered = filtered.filter(post => post.likes.length >= filters.minLikes!)
        }
        
        // Apply sorting
        const sortBy = filters.sortBy || 'newest'
        
        switch (sortBy) {
          case 'oldest':
            filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            break
          case 'popular':
            filtered.sort((a, b) => b.likes.length - a.likes.length)
            break
          case 'trending':
            // Simple trending algorithm based on recent engagement
            filtered.sort((a, b) => {
              const aScore = a.likes.length + a.views + a.shares
              const bScore = b.likes.length + b.views + b.shares
              return bScore - aScore
            })
            break
          case 'unanswered':
            const { comments } = get()
            filtered = filtered.filter(post => {
              const postComments = comments.filter(c => c.postId === post.id && !c.isDeleted)
              return postComments.length === 0
            })
            filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            break
          default: // newest
            filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        }
        
        // Pinned posts always come first
        const pinned = filtered.filter(post => post.isPinned)
        const regular = filtered.filter(post => !post.isPinned)
        
        return [...pinned, ...regular]
      },
      
      searchPosts: (query) => {
        const { posts } = get()
        
        if (!query.trim()) return posts
        
        const lowercaseQuery = query.toLowerCase()
        return posts.filter(post => 
          post.status === 'published' && (
            post.title.toLowerCase().includes(lowercaseQuery) ||
            post.content.toLowerCase().includes(lowercaseQuery) ||
            post.author.name.toLowerCase().includes(lowercaseQuery) ||
            post.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
          )
        )
      },
      
      // Navigation
      setCurrentPost: (post) => set({ currentPost: post }),
      
      // Statistics
      getStats: () => {
        const { posts, comments, users } = get()
        
        const publishedPosts = posts.filter(post => post.status === 'published')
        const activeComments = comments.filter(comment => !comment.isDeleted)
        
        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        const recentPosts = publishedPosts.filter(post => post.createdAt > sevenDaysAgo)
        const recentComments = activeComments.filter(comment => comment.createdAt > sevenDaysAgo)
        const recentUsers = users.filter(user => user.joinedAt > sevenDaysAgo)
        
        // Top categories
        const categoryCount: Record<string, number> = {}
        publishedPosts.forEach(post => {
          categoryCount[post.category] = (categoryCount[post.category] || 0) + 1
        })
        
        const topCategories = Object.entries(categoryCount)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
        
        // Top tags
        const tagCount: Record<string, number> = {}
        publishedPosts.forEach(post => {
          post.tags.forEach(tag => {
            tagCount[tag] = (tagCount[tag] || 0) + 1
          })
        })
        
        const topTags = Object.entries(tagCount)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        
        return {
          totalPosts: publishedPosts.length,
          totalComments: activeComments.length,
          totalUsers: users.length,
          activeUsers: users.length, // This would be calculated based on recent activity
          topCategories,
          topTags,
          recentActivity: {
            posts: recentPosts.length,
            comments: recentComments.length,
            users: recentUsers.length
          }
        }
      },
      
      getTrendingPosts: (limit = 10) => {
        const { posts } = get()
        
        return posts
          .filter(post => post.status === 'published')
          .sort((a, b) => {
            const aScore = a.likes.length + a.views + a.shares
            const bScore = b.likes.length + b.views + b.shares
            return bScore - aScore
          })
          .slice(0, limit)
      },
      
      getPopularTags: (limit = 20) => {
        const { posts } = get()
        
        const tagCount: Record<string, number> = {}
        posts
          .filter(post => post.status === 'published')
          .forEach(post => {
            post.tags.forEach(tag => {
              tagCount[tag] = (tagCount[tag] || 0) + 1
            })
          })
        
        return Object.entries(tagCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)
          .map(([tag]) => tag)
      },
      
      getTopContributors: (limit = 10) => {
        const { users, posts, comments } = get()
        
        return users
          .map(user => {
            const userPosts = posts.filter(post => post.author.id === user.id && post.status === 'published')
            const userComments = comments.filter(comment => comment.author.id === user.id && !comment.isDeleted)
            const totalLikes = userPosts.reduce((sum, post) => sum + post.likes.length, 0) +
                              userComments.reduce((sum, comment) => sum + comment.likes.length, 0)
            
            return {
              ...user,
              score: userPosts.length * 3 + userComments.length + totalLikes
            }
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
      },
      
      // Utility
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState)
    }),
    {
      name: 'community-store',
      partialize: (state: CommunityStore) => ({
        posts: state.posts,
        comments: state.comments,
        users: state.users,
        filters: state.filters
      })
    }
  )
)

export default useCommunityStore