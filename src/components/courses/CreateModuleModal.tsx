import { useState, useEffect } from 'react'
import {
    PremiumModal,
    PremiumModalHeader,
    PremiumModalTitle,
    PremiumModalDescription,
    PremiumModalBody,
    PremiumModalFooter,
} from '@/components/ui/premium-modal'
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
        <PremiumModal open={open} onClose={onClose} size="md">
            <PremiumModalHeader>
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/20">
                        <Layers className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                        <PremiumModalTitle>
                            {initialTitle ? 'Editar Módulo' : 'Novo Módulo'}
                        </PremiumModalTitle>
                        <PremiumModalDescription>
                            Organize suas aulas em módulos para melhor estrutura.
                        </PremiumModalDescription>
                    </div>
                </div>
            </PremiumModalHeader>

            <form onSubmit={handleSubmit}>
                <PremiumModalBody>
                    <div className="space-y-2">
                        <Label htmlFor="module-title" className="text-zinc-300">Título do Módulo</Label>
                        <Input
                            id="module-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 text-white h-11"
                            placeholder="Ex: Introdução ao Curso"
                            autoFocus
                        />
                    </div>
                </PremiumModalBody>

                <PremiumModalFooter>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="w-full sm:w-auto min-w-[120px] h-11 rounded-full border-zinc-700"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !title.trim()}
                            className="w-full sm:w-auto min-w-[140px] h-11 rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-medium disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar Módulo'}
                        </Button>
                    </div>
                </PremiumModalFooter>
            </form>
        </PremiumModal>
    )
}
