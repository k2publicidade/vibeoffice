import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Layers } from 'lucide-react'

interface CreateModuleModalProps {
    open: boolean
    onClose: () => void
    onSave: (title: string) => Promise<void>
    initialTitle?: string
}

export function CreateModuleModal({ open, onClose, onSave, initialTitle = '' }: CreateModuleModalProps) {
    const [title, setTitle] = useState(initialTitle)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setTitle(initialTitle)
    }, [initialTitle, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setLoading(true)
        try {
            await onSave(title)
            onClose()
            setTitle('')
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border border-white/10 text-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="text-red-500" size={20} />
                        {initialTitle ? 'Editar Módulo' : 'Novo Módulo'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Organize suas aulas em módulos para melhor estrutura.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="module-title" className="text-zinc-300">Título do Módulo</Label>
                        <Input
                            id="module-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white"
                            placeholder="Ex: Introdução ao Curso"
                            autoFocus
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-white/5">
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !title.trim()}
                            className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20"
                        >
                            {loading ? 'Salvando...' : 'Salvar Módulo'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
