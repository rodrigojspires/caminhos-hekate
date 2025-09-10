'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  Lock, 
  Globe, 
  MessageCircle, 
  Calendar,
  MoreVertical,
  Settings,
  UserPlus,
  LogOut
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Group } from './types'

interface GroupCardProps {
  group: Group
  currentUserId?: string
  onJoinGroup?: (groupId: string) => void
  onLeaveGroup?: (groupId: string) => void
  onManageGroup?: (groupId: string) => void
  className?: string
}

export function GroupCard({
  group,
  currentUserId,
  onJoinGroup,
  onLeaveGroup,
  onManageGroup,
  className = ''
}: GroupCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const isOwner = group.userRole === 'owner'
  const isAdmin = group.userRole === 'admin'
  const isModerator = group.userRole === 'moderator'
  const isMember = group.userRole && ['owner', 'admin', 'moderator', 'member'].includes(group.userRole)
  const canManage = isOwner || isAdmin

  const handleJoinGroup = async () => {
    if (!onJoinGroup) return
    setIsLoading(true)
    try {
      await onJoinGroup(group.id)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!onLeaveGroup) return
    setIsLoading(true)
    try {
      await onLeaveGroup(group.id)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageGroup = () => {
    if (onManageGroup) {
      onManageGroup(group.id)
    }
  }

  const getGroupInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatLastActivity = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'moderator':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const lastActivity = group.lastActivityAt ?? group.updatedAt ?? group.createdAt

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={group.imageUrl || group.image} alt={group.name} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
                {getGroupInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg truncate">{group.name}</h3>
                {group.isPrivate ? (
                  <Lock className="h-4 w-4 text-gray-500" />
                ) : (
                  <Globe className="h-4 w-4 text-gray-500" />
                )}
              </div>
              {group.userRole && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs mt-1 ${getRoleBadgeColor(group.userRole)}`}
                >
                  {group.userRole === 'owner' && 'Dono'}
                  {group.userRole === 'admin' && 'Admin'}
                  {group.userRole === 'moderator' && 'Moderador'}
                  {group.userRole === 'member' && 'Membro'}
                </Badge>
              )}
            </div>
          </div>
          
          {isMember && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canManage && (
                  <>
                    <DropdownMenuItem onClick={handleManageGroup}>
                      <Settings className="mr-2 h-4 w-4" />
                      Gerenciar Grupo
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Convidar Membros
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {!isOwner && (
                  <DropdownMenuItem 
                    onClick={handleLeaveGroup}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair do Grupo
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {group.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
            {group.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="py-3">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>
                {group.memberCount}
                {group.maxMembers && ` / ${group.maxMembers}`}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span>{group.messageCount}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{formatLastActivity(lastActivity)}</span>
          </div>
        </div>

        {group.members && group.members.length > 0 && (
          <div className="flex items-center space-x-2 mt-3">
            <span className="text-xs text-gray-500">Membros:</span>
            <div className="flex -space-x-2">
              {group.members.slice(0, 5).map((member) => (
                <Avatar key={member.id} className="h-6 w-6 border-2 border-white dark:border-gray-800">
                  <AvatarImage src={member.user.image} alt={member.user.name} />
                  <AvatarFallback className="text-xs">
                    {member.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {group.memberCount > 5 && (
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    +{group.memberCount - 5}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        {isMember ? (
          <Link href={`/groups/${group.id}`} className="w-full">
            <Button className="w-full" variant="default">
              <MessageCircle className="mr-2 h-4 w-4" />
              Abrir Chat
            </Button>
          </Link>
        ) : (
          <Button 
            className="w-full" 
            variant="outline"
            onClick={handleJoinGroup}
            disabled={isLoading || (group.maxMembers ? group.memberCount >= group.maxMembers : false)}
          >
            {isLoading ? (
              'Entrando...'
            ) : group.maxMembers && group.memberCount >= group.maxMembers ? (
              'Grupo Lotado'
            ) : (
              <>Entrar no Grupo</>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}