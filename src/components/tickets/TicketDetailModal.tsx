'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  FileText,
  Tag,
  User,
  MessageSquare,
  Send,
  Lock,
  Trash2,
  Paperclip,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PremiumModal,
  PremiumModalHeader,
  PremiumModalTitle,
  PremiumModalDescription,
  PremiumModalBody,
  PremiumModalFooter,
} from '@/components/ui/premium-modal'
import { Ticket, TicketComment } from '@/types/tickets'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TicketDetailModalProps {
  ticket: Ticket | null
  open: boolean
  onClose: () => void
  comments: TicketComment[]
  onAddComment: (content: string, isInternal: boolean) => void
  onDeleteComment: (commentId: string) => void
  getUserById: (userId: string) => { name: string; avatar?: string } | null
}

const statusConfig = {
  open: { label: 'Aberto', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertCircle },
  analyzing: { label: 'Em Análise', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock },
  in_progress: { label: 'Em Execução', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Clock },
  completed: { label: 'Concluído', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 },
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'text-zinc-400', icon: ShieldAlert },
  medium: { label: 'Média', color: 'text-blue-400', icon: ShieldAlert },
  high: { label: 'Alta', color: 'text-orange-400', icon: AlertCircle },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

const commentVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
}

export function TicketDetailModal({
  ticket,
  open,
  onClose,
  comments,
  onAddComment,
  onDeleteComment,
  getUserById,
}: TicketDetailModalProps) {
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new comment is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments.length])

  if (!ticket) return null

  const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.open
  const priority = priorityConfig[ticket.priority as keyof typeof priorityConfig] || priorityConfig.low
  const StatusIcon = status.icon
  const PriorityIcon = priority.icon

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      onAddComment(newComment.trim(), isInternal)
      setNewComment('')
      setIsInternal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const formatCommentTime = (date: Date) => {
    const d = new Date(date)
    const now = new Date()
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)

    if (diffHours < 24) {
      return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
    }
    return format(d, "d 'de' MMM 'às' HH:mm", { locale: ptBR })
  }

  return (
    <PremiumModal open={open} onClose={onClose} size="xl">
      <PremiumModalHeader>
        <div className="flex items-center gap-3 mb-1">
          <Badge className={cn("rounded-full border-none px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider", status.bg, status.color)}>
            {status.label}
          </Badge>
          <span className="text-xs text-zinc-500 font-mono">#{ticket.id}</span>
        </div>
        <PremiumModalTitle>
          {ticket.title}
        </PremiumModalTitle>
        <PremiumModalDescription>
          Criado em {format(new Date(ticket.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </PremiumModalDescription>
      </PremiumModalHeader>

      <PremiumModalBody className="max-h-[70vh] overflow-hidden flex flex-col">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 flex-1 overflow-hidden flex flex-col"
        >
          {/* Description */}
          <motion.div variants={itemVariants} className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Descrição</span>
            </div>
            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 leading-relaxed text-zinc-300">
              {ticket.description || 'Nenhuma descrição fornecida.'}
            </div>
          </motion.div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div variants={itemVariants} className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", status.bg)}>
                <StatusIcon className={cn("h-4 w-4", status.color)} />
              </div>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Status</p>
                <p className="text-sm font-medium text-zinc-200">{status.label}</p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <PriorityIcon className={cn("h-4 w-4", priority.color)} />
              </div>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Prioridade</p>
                <p className="text-sm font-medium text-zinc-200">{priority.label}</p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <Tag className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Categoria</p>
                <p className="text-sm font-medium text-zinc-300">{ticket.category}</p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <User className="h-4 w-4 text-zinc-500" />
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Solicitante</p>
                <p className="text-sm font-medium text-zinc-300 truncate">
                  {getUserById(ticket.requester)?.name || 'Desconhecido'}
                </p>
              </div>
            </motion.div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Comments Section */}
          <motion.div variants={itemVariants} className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">Comentários</span>
                <Badge variant="outline" className="rounded-full text-[10px] border-zinc-700 text-zinc-500">
                  {comments.length}
                </Badge>
              </div>
            </div>

            {/* Comments List */}
            <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollRef}>
              <div className="space-y-4 pb-4">
                <AnimatePresence mode="popLayout">
                  {comments.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-zinc-500"
                    >
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhum comentário ainda</p>
                      <p className="text-xs mt-1">Seja o primeiro a comentar</p>
                    </motion.div>
                  ) : (
                    comments.map((comment, index) => {
                      const user = getUserById(comment.userId)
                      const isCurrentUser = comment.userId === 'current-user'

                      return (
                        <motion.div
                          key={comment.id}
                          variants={commentVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "group flex gap-3",
                            comment.isInternal && "opacity-80"
                          )}
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white text-xs">
                              {getInitials(user?.name || 'U')}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-zinc-200">
                                {user?.name || 'Usuário'}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {formatCommentTime(comment.createdAt)}
                              </span>
                              {comment.isInternal && (
                                <Badge className="rounded-full bg-amber-500/10 text-amber-400 border-none text-[9px] px-2 py-0">
                                  <Lock className="h-2.5 w-2.5 mr-1" />
                                  Interno
                                </Badge>
                              )}
                              {comment.updatedAt && (
                                <span className="text-[10px] text-zinc-600 italic">
                                  (editado)
                                </span>
                              )}
                            </div>

                            <div className={cn(
                              "rounded-xl p-3 text-sm",
                              comment.isInternal
                                ? "bg-amber-500/5 border border-amber-500/20 text-zinc-300"
                                : "bg-zinc-800/50 border border-zinc-700/50 text-zinc-300"
                            )}>
                              {comment.content}

                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-zinc-700/50">
                                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Paperclip className="h-3 w-3" />
                                    {comment.attachments.map((file, i) => (
                                      <span key={i} className="hover:text-zinc-300 cursor-pointer">
                                        {file}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            {isCurrentUser && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-zinc-500 hover:text-zinc-300"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800">
                                    <DropdownMenuItem
                                      className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                                      onClick={() => onDeleteComment(comment.id)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* New Comment Input */}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="space-y-3">
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"
                  className="min-h-[80px] bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 resize-none focus:ring-1 focus:ring-[#fc7a67]/50"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={isInternal}
                        onCheckedChange={setIsInternal}
                        className="data-[state=checked]:bg-amber-500"
                      />
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Comentário interno
                      </span>
                    </label>
                    {isInternal && (
                      <span className="text-[10px] text-amber-500/80">
                        Apenas equipe pode ver
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="rounded-full px-6 bg-gradient-to-br from-[#fc7a67] to-[#ff0300] text-white hover:from-[#ff0300] hover:to-[#cc0200] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </PremiumModalBody>

      <PremiumModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          className="rounded-full px-8 h-12 border-zinc-700 hover:bg-zinc-800 hover:text-foreground transition-all"
        >
          Fechar
        </Button>
      </PremiumModalFooter>
    </PremiumModal>
  )
}
