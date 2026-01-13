export type SessionType = 'Gravacao' | 'Mix/Master' | 'Edicao' | 'Producao';

export interface Person {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    contactRole?: string;
}

export interface StudioBooking {
    id: string;
    track_title: string;
    studio_name: string;
    booking_date: string; // YYYY-MM-DD
    start_time: string; // HH:mm
    end_time: string; // HH:mm
    workstation_id?: string;
    session_types: SessionType[];

    // JSONB fields
    producers: Person[];
    artists: Person[];
    composers: Person[];

    notes?: string;
    status: 'scheduled' | 'completed' | 'cancelled';

    created_by?: string;
    created_at?: string;
    updated_at?: string;
}
