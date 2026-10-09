import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StudioBooking } from '@/types/studio'
import { toast } from 'sonner'

export function useStudio() {
    const [bookings, setBookings] = useState<StudioBooking[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchBookings = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('studio_bookings' as any)
                .select('*')
                .order('booking_date', { ascending: false })
                .order('start_time', { ascending: false })

            if (error) throw error
            setBookings(data as any as StudioBooking[])
        } catch (error) {
            console.error('Error fetching bookings:', error)
            toast.error('Erro ao carregar agendamentos')
        } finally {
            setLoading(false)
        }
    }, [])

    const createBooking = async (booking: Omit<StudioBooking, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            const { data, error } = await supabase
                .from('studio_bookings' as any)
                .insert({
                    ...booking,
                    created_by: user.id
                })
                .select()
                .single()

            if (error) throw error

            setBookings(prev => [data as any as StudioBooking, ...prev.filter(b => b.id !== (data as unknown as StudioBooking).id)])
            toast.success('Sessão agendada com sucesso!')
            return data
        } catch (error) {
            console.error('Error creating booking:', error)
            toast.error((error as { code?: string }).code === '23P01' ? 'Este estúdio já está reservado nesse horário.' : 'Erro ao criar agendamento. Confira os horários.')
            throw error
        }
    }

    const updateBooking = async (id: string, updates: Partial<StudioBooking>) => {
        try {
            const { data, error } = await supabase
                .from('studio_bookings' as any)
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            setBookings(prev => prev.map(b => b.id === id ? (data as any as StudioBooking) : b))
            toast.success('Sessão atualizada!')
            return data
        } catch (error) {
            console.error('Error updating booking:', error)
            toast.error('Erro ao atualizar agendamento')
            throw error
        }
    }

    const deleteBooking = async (id: string) => {
        try {
            const { error } = await supabase
                .from('studio_bookings' as any)
                .delete()
                .eq('id', id)

            if (error) throw error

            setBookings(prev => prev.filter(b => b.id !== id))
            toast.success('Sessão removida!')
            return true
        } catch (error) {
            console.error('Error deleting booking:', error)
            toast.error('Erro ao remover agendamento')
            throw error
        }
    }

    // Initial fetch
    useEffect(() => {
        fetchBookings()

        // Subscribe to realtime changes
        const channel = supabase
            .channel('studio_bookings_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'studio_bookings' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setBookings(prev => [payload.new as StudioBooking, ...prev.filter(b => b.id !== payload.new.id)])
                    } else if (payload.eventType === 'UPDATE') {
                        setBookings(prev => prev.map(b => b.id === payload.new.id ? (payload.new as StudioBooking) : b))
                    } else if (payload.eventType === 'DELETE') {
                        setBookings(prev => prev.filter(b => b.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchBookings])

    return {
        bookings,
        loading,
        refresh: fetchBookings,
        createBooking,
        updateBooking,
        deleteBooking
    }
}
