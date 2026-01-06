'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Link2,
  Copy,
  Check,
  X,
  Globe,
  Lock,
  Eye,
  Edit3,
  Settings,
  Search,
  UserPlus,
  Trash2,
  ChevronDown,
  FileText,
  Folder,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PremiumModal,
  PremiumModalHeader,
  PremiumModalTitle,
  PremiumModalDescription,
  PremiumModalBody,
  PremiumModalFooter,
} from '@/components/ui/premium-modal'
import { DriveItem, SharedAccess, SharePermission } from '@/types/drive'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ShareModalProps {
  item: DriveItem | null
  open: boolean
  onClose: () => void
  shares: SharedAccess[]
  onShare: (userId: string, permission: SharePermission) => void
  onUnshare: (userId: string) => void
  onUpdatePermission: (userId: string, permission: SharePermission) => void
  onTogglePublic: () => void
  onCopyLink: () => string
  availableUsers: { id: string; name: string; email: string; avatar?: string; sector: string }[]
  getUserById: (userId: string) => Promise<{ name: string; avatar?: string; email: string } | null>
}

const permissionConfig: Record<SharePermission, { label: string; icon: React.ReactNode; description: string }> = {
  view: { label: 'Visualizar', icon: <Eye className="h-4 w-4" />, description: 'Pode visualizar' },
  edit: { label: 'Editar', icon: <Edit3 className="h-4 w-4" />, description: 'Pode editar' },
  manage: { label: 'Gerenciar', icon: <Settings className="h-4 w-4" />, description: 'Controle total' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export function ShareModal({
  item,
  open,
  onClose,
  shares,
  onShare,
  onUnshare,
  onUpdatePermission,
  onTogglePublic,
  onCopyLink,
  availableUsers,
  getUserById,
}: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPermission, setSelectedPermission] = useState<SharePermission>('view')
  const [linkCopied, setLinkCopied] = useState(false)
  const [showUserList, setShowUserList] = useState(false)

  if (!item) return null

  // Filtrar usuários disponíveis (não compartilhados ainda)
  const sharedUserIds = shares.map(s => s.userId)
  const filteredUsers = useMemo(() => {
    return availableUsers
      .filter(u => !sharedUserIds.includes(u.id))
      .filter(u =>
        searchQuery
          ? u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
  }, [availableUsers, sharedUserIds, searchQuery])

  const handleCopyLink = () => {
    const link = onCopyLink()
    navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleShareUser = (userId: string) => {
    onShare(userId, selectedPermission)
    setSearchQuery('')
    setShowUserList(false)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const ItemIcon = item.type === 'folder' ? Folder : FileText

  return (
    <PremiumModal open={open} onClose={onClose} size="lg">
      <PremiumModalHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#fc7a67]/20 to-[#ff0300]/10 flex items-center justify-center">
            <ItemIcon className="h-5 w-5 text-[#fc7a67]" />
          </div>
          <div>
            <PremiumModalTitle className="text-lg">
              Compartilhar
            </PremiumModalTitle>
            <PremiumModalDescription className="text-xs">
              {item.name}
            </PremiumModalDescription>
          </div>
        </div>
      </PremiumModalHeader>

      <PremiumModalBody>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Acesso Público */}
          <motion.div variants={itemVariants} className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center",
                  item.isPublic ? "bg-green-500/10" : "bg-zinc-800"
                )}>
                  {item.isPublic ? (
                    <Globe className="h-5 w-5 text-green-400" />
                  ) : (
                    <Lock className="h-5 w-5 text-zinc-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    {item.isPublic ? 'Acesso Público' : 'Acesso Restrito'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.isPublic
                      ? 'Qualquer pessoa com o link pode acessar'
                      : 'Apenas pessoas adicionadas podem acessar'}
                  </p>
                </div>
              </div>
              <Switch
                checked={item.isPublic || false}
                onCheckedChange={onTogglePublic}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </motion.div>

          {/* Copiar Link */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  value={`vibeoffice.app/drive/share/${item.id}`}
                  readOnly
                  className="pl-10 pr-4 bg-zinc-800/50 border-zinc-700 text-zinc-300 text-sm"
                />
              </div>
              <Button
                onClick={handleCopyLink}
                className={cn(
                  "rounded-lg transition-all",
                  linkCopied
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-zinc-700 hover:bg-zinc-600"
                )}
              >
                {linkCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </motion.div>

          <Separator className="bg-zinc-800" />

          {/* Adicionar Pessoas */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <UserPlus className="h-4 w-4" />
              <span className="text-sm font-medium">Adicionar pessoas</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowUserList(true)
                  }}
                  onFocus={() => setShowUserList(true)}
                  className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-300 placeholder:text-zinc-500"
                />
              </div>
              <Select value={selectedPermission} onValueChange={(v) => setSelectedPermission(v as SharePermission)}>
                <SelectTrigger className="w-[140px] bg-zinc-800/50 border-zinc-700 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {Object.entries(permissionConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-zinc-300">
                      <div className="flex items-center gap-2">
                        {config.icon}
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de usuários para adicionar */}
            <AnimatePresence>
              {showUserList && filteredUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl bg-zinc-800/30 border border-zinc-700/50 overflow-hidden"
                >
                  <ScrollArea className="max-h-[180px]">
                    <div className="p-2 space-y-1">
                      {filteredUsers.slice(0, 5).map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleShareUser(user.id)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700/50 transition-colors group"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-zinc-200 group-hover:text-white">
                              {user.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {user.email} • {user.sector}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500 group-hover:border-[#fc7a67]/50 group-hover:text-[#fc7a67]">
                            Adicionar
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Lista de pessoas com acesso */}
          {shares.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Pessoas com acesso</span>
                <Badge variant="outline" className="rounded-full text-[10px] border-zinc-700 text-zinc-500">
                  {shares.length}
                </Badge>
              </div>

              <ScrollArea className="max-h-[200px] pr-4 -mr-4">
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {shares.map((share) => {
                      // Buscar usuário na lista local em vez de Promise
                      const user = availableUsers.find(u => u.id === share.userId)
                      if (!user) return null

                      return (
                        <motion.div
                          key={share.userId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30 group"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar ?? undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white text-sm">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200 truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {user.email}
                            </p>
                          </div>

                          <Select
                            value={share.permission}
                            onValueChange={(v) => onUpdatePermission(share.userId, v as SharePermission)}
                          >
                            <SelectTrigger className="w-[120px] h-8 bg-zinc-800/50 border-zinc-700 text-zinc-300 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              {Object.entries(permissionConfig).map(([key, config]) => (
                                <SelectItem key={key} value={key} className="text-zinc-300 text-xs">
                                  <div className="flex items-center gap-2">
                                    {config.icon}
                                    {config.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUnshare(share.userId)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </motion.div>
          )}

          {/* Estado vazio */}
          {shares.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-8">
              <Users className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500">
                Este {item.type === 'folder' ? 'pasta' : 'arquivo'} ainda não foi compartilhado
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Adicione pessoas acima para compartilhar
              </p>
            </motion.div>
          )}
        </motion.div>
      </PremiumModalBody>

      <PremiumModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          className="rounded-full px-6 border-zinc-700 hover:bg-zinc-800"
        >
          Fechar
        </Button>
      </PremiumModalFooter>
    </PremiumModal>
  )
}
