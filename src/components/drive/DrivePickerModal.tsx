'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DriveGrid } from '@/components/drive/DriveGrid'
import { useDrive } from '@/hooks/useDrive'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { getSignedUrl } from '@/lib/supabase/storage'
import { toast } from 'sonner'

interface DrivePickerModalProps {
    open: boolean
    onClose: () => void
    onSelect: (url: string) => void
    title?: string
    acceptedMimeTypes?: string[] // Optional filtering
}

export function DrivePickerModal({ open, onClose, onSelect, title = 'Selecionar Arquivo', acceptedMimeTypes }: DrivePickerModalProps) {
    const [selecting, setSelecting] = useState(false)
    const {
        items,
        currentFolderId,
        navigateToFolder,
        goBack,
        getItemById,
        breadcrumbs
        // Assuming useDrive exposes these. If not, I might need to check useDrive again.
        // I recall checking useDrive.ts and it had these.
    } = useDrive()

    const handleFileClick = async (fileId: string) => {
        if (selecting) return
        const file = getItemById(fileId)
        if (file && file.url) {
            // If acceptedMimeTypes is provided, validate
            if (acceptedMimeTypes && acceptedMimeTypes.length > 0) {
                const isAccepted = acceptedMimeTypes.some(type => {
                    if (type.endsWith('/*')) {
                        const baseType = type.split('/')[0]
                        return file.mimeType?.startsWith(baseType)
                    }
                    return file.mimeType === type
                })

                if (!isAccepted) {
                    toast.error('Selecione um arquivo do formato solicitado')
                    return
                }
            }
            setSelecting(true)
            try {
                const signedUrl = await getSignedUrl('drive-files', file.url)
                onSelect(signedUrl)
                onClose()
            } catch {
                toast.error('Não foi possível acessar o arquivo selecionado')
            } finally { setSelecting(false) }
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-4xl w-[95vw] h-[80vh] flex flex-col bg-[#0a0a0a] border-[#2a2a2a] text-white p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b border-[#2a2a2a] flex flex-row items-center gap-4 bg-[#111]">
                    <div className="flex items-center gap-2 flex-1">
                        {currentFolderId && (
                            <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8 text-gray-400">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        )}
                        <DialogTitle>{title}</DialogTitle>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={selecting}>Cancelar</Button>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 bg-black/50">
                    {/* We reuse DriveGrid. It handles folder navigation internally if we pass the right props.
               However, DriveGrid expects `currentFolderId` and `onFolderOpen` from props controlled by us or useDrive. 
               The useDrive hook instance here is independent from the main Drive page's instance, which is good.
           */}
                    <DriveGrid
                        items={items}
                        currentFolderId={currentFolderId}
                        onFolderOpen={navigateToFolder}
                        onFileClick={selecting ? undefined : handleFileClick}
                        // Disable actions we don't want in a picker
                        onFileDelete={undefined}
                        onFileDownload={undefined}
                        onFileShare={undefined}
                        onMoveItem={undefined}
                        onUpload={undefined} // Maybe allow upload inside picker later? For now, keep it simple.
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
