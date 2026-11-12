-- Studio sessions may cross midnight (e.g. 22:00 -> 05:00 next day).
-- A session whose end_time is earlier than start_time ends on the following day.
ALTER TABLE public.studio_bookings DROP CONSTRAINT IF EXISTS valid_session_time;
ALTER TABLE public.studio_bookings DROP CONSTRAINT IF EXISTS studio_bookings_check;
ALTER TABLE public.studio_bookings
  ADD CONSTRAINT valid_session_time CHECK (end_time <> start_time);

-- Overlap guard must use the real end instant, rolling to the next day when needed.
ALTER TABLE public.studio_bookings DROP CONSTRAINT IF EXISTS no_studio_overlap;
ALTER TABLE public.studio_bookings
  ADD CONSTRAINT no_studio_overlap EXCLUDE USING gist (
    studio_name WITH =,
    tsrange(
      booking_date + start_time,
      booking_date + end_time + CASE WHEN end_time < start_time THEN interval '1 day' ELSE interval '0' END,
      '[)'
    ) WITH &&
  ) WHERE (status <> 'cancelled');
