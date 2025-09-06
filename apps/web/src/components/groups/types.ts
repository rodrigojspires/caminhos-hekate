// Group Types
export interface Group {
  id: string
  name: string
  description?: string
  image?: string
  isPrivate: boolean
  maxMembers?: number
  memberCount: number
  messageCount: number
  category?: string
  tags: string[]
  isActive: boolean
  lastActivityAt?: Date
  createdAt: Date
  updatedAt: Date
  owner: {
    id: string
    name: string
    image?: string
  }
  userRole?: 'owner' | 'admin' | 'member'
  userMembership?: {
    id: string
    role: 'owner' | 'admin' | 'member'
    joinedAt: Date
    isActive: boolean
  }
}

export interface GroupMember {
  id: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
  lastActiveAt?: Date
  isActive: boolean
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

export interface GroupMessage {
  id: string
  content: string
  attachments?: {
    id: string
    name: string
    url: string
    type: string
    size: number
  }[]
  replyTo?: {
    id: string
    content: string
    author: {
      name: string
    }
  }
  reactions: {
    emoji: string
    count: number
    users: {
      id: string
      name: string
    }[]
  }[]
  isEdited: boolean
  editedAt?: Date
  createdAt: Date
  author: {
    id: string
    name: string
    image?: string
  }
}

export interface GroupInvite {
  id: string
  token: string
  email?: string
  message?: string
  expiresAt?: Date
  maxUses?: number
  usedCount: number
  isActive: boolean
  createdAt: Date
  createdBy: {
    id: string
    name: string
    email: string
  }
}

export interface CreateGroupData {
  name: string
  description?: string
  image?: File
  isPrivate: boolean
  maxMembers?: number
  category?: string
  tags: string[]
}

export interface GroupFilters {
  search?: string
  category?: string
  isPrivate?: boolean
  userGroups?: boolean
}

export interface GroupSortOptions {
  field: 'activity' | 'name' | 'members' | 'created'
  direction: 'asc' | 'desc'
}

export interface MessageFilters {
  search?: string
  authorId?: string
  hasAttachments?: boolean
  dateFrom?: Date
  dateTo?: Date
}

export interface MemberFilters {
  search?: string
  role?: 'owner' | 'admin' | 'member'
  isActive?: boolean
}