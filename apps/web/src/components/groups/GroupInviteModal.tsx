'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  Link,
  Copy,
  Users,
  Clock,
  Send,
  Plus,
  X
} from 'lucide-react'
import { toast } from 'sonner'

type MemberRole = 'ADMIN' | 'MODERATOR' | 'MEMBER'
type InviteType = 'EMAIL' | 'LINK'

interface GroupInviteModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  groupName: string
  currentUserRole: MemberRole | 'OWNER'
}

export function GroupInviteModal({ 
  isOpen, 
  onClose, 
  groupId, 
  groupName,
  currentUserRole 
}: GroupInviteModalProps) {
  const [activeTab, setActiveTab] = useState<InviteType>('EMAIL')
  const [emailList, setEmailList] = useState<string[]>([''])
  const [inviteRole, setInviteRole] = useState<MemberRole>('MEMBER')
  const [customMessage, setCustomMessage] = useState('')
  const [linkExpiry, setLinkExpiry] = useState('7d')
  const [maxUses, setMaxUses] = useState('10')
  const [generatedLink, setGeneratedLink] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)

  const canInviteAdmins = currentUserRole === 'OWNER'
  const canInviteModerators = ['OWNER', 'ADMIN'].includes(currentUserRole)

  const handleAddEmail = () => {
    if (emailList.length < 10) {
      setEmailList([...emailList, ''])
    }
  }

  const handleRemoveEmail = (index: number) => {
    if (emailList.length > 1) {
      setEmailList(emailList.filter((_, i) => i !== index))
    }
  }

  const handleEmailChange = (index: number, value: string) => {
    const newEmailList = [...emailList]
    newEmailList[index] = value
    setEmailList(newEmailList)
  }

  const validateEmails = () => {
    const validEmails = emailList.filter(email => {
      const trimmed = email.trim()
      return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    })
    
    if (validEmails.length === 0) {
      toast.error('Pelo menos um email válido é obrigatório')
      return false
    }
    
    return validEmails
  }

  const handleSendEmailInvites = async () => {
    const validEmails = validateEmails()
    if (!validEmails) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/groups/${groupId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'EMAIL',
          emails: validEmails,
          role: inviteRole,
          message: customMessage.trim() || undefined
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao enviar convites')
      }

      const data = await response.json()
      toast.success(`${data.sent} convite(s) enviado(s) com sucesso!`)
      
      // Reset form
      setEmailList([''])
      setCustomMessage('')
      onClose()
    } catch (error: any) {
      console.error('Erro ao enviar convites:', error)
      toast.error(error.message || 'Erro ao enviar convites')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateLink = async () => {
    try {
      setIsGeneratingLink(true)
      const response = await fetch(`/api/groups/${groupId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'LINK',
          role: inviteRole,
          expiresIn: linkExpiry,
          maxUses: parseInt(maxUses) || undefined
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao gerar link')
      }

      const data = await response.json()
      const fullLink = `${window.location.origin}/dashboard/grupos/convite/${data.code}`
      setGeneratedLink(fullLink)
      toast.success('Link de convite gerado!')
    } catch (error: any) {
      console.error('Erro ao gerar link:', error)
      toast.error(error.message || 'Erro ao gerar link')
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    toast.success('Link copiado para a área de transferência!')
  }

  const handleClose = () => {
    setEmailList([''])
    setCustomMessage('')
    setGeneratedLink('')
    setInviteRole('MEMBER')
    setActiveTab('EMAIL')
    onClose()
  }

  const getExpiryText = (value: string) => {
    switch (value) {
      case '1h': return '1 hora'
      case '24h': return '24 horas'
      case '7d': return '7 dias'
      case '30d': return '30 dias'
      case 'never': return 'Nunca'
      default: return value
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Convidar para {groupName}
          </DialogTitle>
          <DialogDescription>
            Convide novos membros para participar do seu grupo.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InviteType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="EMAIL" className="flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Por Email
            </TabsTrigger>
            <TabsTrigger value="LINK" className="flex items-center">
              <Link className="w-4 h-4 mr-2" />
              Link de Convite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="EMAIL" className="space-y-4">
            <div>
              <Label>Emails dos Convidados</Label>
              <div className="space-y-2 mt-2">
                {emailList.map((email, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      placeholder="email@exemplo.com"
                      className="flex-1"
                    />
                    {emailList.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveEmail(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {emailList.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEmail}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Email
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="role">Função do Membro</Label>
              <Select value={inviteRole} onValueChange={(value: MemberRole) => setInviteRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Membro</SelectItem>
                  {canInviteModerators && (
                    <SelectItem value="MODERATOR">Moderador</SelectItem>
                  )}
                  {canInviteAdmins && (
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">Mensagem Personalizada (Opcional)</Label>
              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Adicione uma mensagem pessoal ao convite..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {customMessage.length}/500 caracteres
              </p>
            </div>
          </TabsContent>

          <TabsContent value="LINK" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="linkRole">Função do Membro</Label>
                <Select value={inviteRole} onValueChange={(value: MemberRole) => setInviteRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Membro</SelectItem>
                    {canInviteModerators && (
                      <SelectItem value="MODERATOR">Moderador</SelectItem>
                    )}
                    {canInviteAdmins && (
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expiry">Expiração</Label>
                <Select value={linkExpiry} onValueChange={setLinkExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hora</SelectItem>
                    <SelectItem value="24h">24 horas</SelectItem>
                    <SelectItem value="7d">7 dias</SelectItem>
                    <SelectItem value="30d">30 dias</SelectItem>
                    <SelectItem value="never">Nunca expira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="maxUses">Máximo de Usos</Label>
              <Input
                id="maxUses"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="10"
                min="1"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe vazio para uso ilimitado
              </p>
            </div>

            {!generatedLink ? (
              <Button 
                onClick={handleGenerateLink} 
                disabled={isGeneratingLink}
                className="w-full"
              >
                <Link className="w-4 h-4 mr-2" />
                {isGeneratingLink ? 'Gerando...' : 'Gerar Link de Convite'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-green-800 font-medium">Link Gerado</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-green-700">
                        <Clock className="w-3 h-3 mr-1" />
                        Expira: {getExpiryText(linkExpiry)}
                      </Badge>
                      <Badge variant="outline" className="text-blue-700">
                        <Users className="w-3 h-3 mr-1" />
                        Max: {maxUses || '∞'} usos
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={generatedLink}
                      readOnly
                      className="font-mono text-sm bg-white"
                    />
                    <Button onClick={handleCopyLink} size="sm">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setGeneratedLink('')} 
                  variant="outline"
                  className="w-full"
                >
                  Gerar Novo Link
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {activeTab === 'EMAIL' && (
            <Button 
              onClick={handleSendEmailInvites} 
              disabled={isSubmitting}
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Enviando...' : 'Enviar Convites'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}