BEGIN;
CREATE TABLE public.music_genres (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 80)
);
CREATE UNIQUE INDEX music_genres_name_unique ON public.music_genres(lower(btrim(name)));
ALTER TABLE public.music_genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY genres_read ON public.music_genres FOR SELECT TO authenticated USING(public.office_role() IS NOT NULL);
CREATE POLICY genres_admin ON public.music_genres FOR ALL TO authenticated USING(public.office_role()='Admin') WITH CHECK(public.office_role()='Admin');
GRANT SELECT, INSERT, DELETE ON public.music_genres TO authenticated;
REVOKE ALL ON public.music_genres FROM anon;
INSERT INTO public.music_genres(name) VALUES
('Funk Carioca / Mandelão'),
('Sertanejo Universitário'),
('Sertanejo Raiz / Modão'),
('Samba'),
('Pagode'),
('MPB (Música Popular Brasileira)'),
('Bossa Nova'),
('Forró / Piseiro'),
('Axé Music'),
('Rap Nacional / Trap BR'),
('Tropicália'),
('Chorinho'),
('Brega Funk'),
('Rock Brasileiro'),
('Tecnobrega'),
('Pop'),
('Rock'),
('Hip Hop'),
('Jazz'),
('Eletrônica'),
('Clássica'),
('Heavy Metal'),
('Indie'),
('Lo-Fi'),
('R&B'),
('Soul'),
('Reggae'),
('Country (EUA)'),
('Folk'),
('Blues'),
('Funk Americano (70s)'),
('Disco'),
('Punk'),
('Techno'),
('House'),
('Trance'),
('Ambiente'),
('Latina (Reggaeton/Salsa)'),
('K-Pop'),
('J-Pop'),
('Gospel'),
('Trilha Sonora'),
('Trap Internacional'),
('Dubstep'),
('Drum & Bass'),
('Grunge'),
('Rock Psicodélico'),
('Synthwave'),
('Industrial'),
('Ska'),
('Ópera'),
('Afrobeat');
CREATE TABLE public.calendar_day_colors (
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 day date NOT NULL,
 color text NOT NULL CHECK(color IN ('#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#ec4899')),
 PRIMARY KEY(user_id,day)
);
ALTER TABLE public.calendar_day_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY day_colors_owner ON public.calendar_day_colors FOR ALL TO authenticated USING(user_id=auth.uid() AND public.office_role() IS NOT NULL) WITH CHECK(user_id=auth.uid() AND public.office_role() IS NOT NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_day_colors TO authenticated;
REVOKE ALL ON public.calendar_day_colors FROM anon;
COMMIT;
