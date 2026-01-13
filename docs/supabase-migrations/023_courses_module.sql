-- Create Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT, -- URL to image
    instructor TEXT,
    duration INTEGER, -- Total duration in minutes (calculated or manual)
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
    tags TEXT[], -- Array of strings for categories/tags
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Modules Table (to organize lessons)
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- Denormalized for easier access
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('video', 'html', 'quiz')) DEFAULT 'video',
    content_url TEXT, -- YouTube URL or HTML file URL
    content TEXT, -- Markdown content or HTML snippet if not using URL
    duration INTEGER, -- Duration in minutes
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create User Course Progress Table
CREATE TABLE IF NOT EXISTS user_course_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id) -- Prevent duplicate progress for same lesson
);

-- Add triggers for updated_at
CREATE TRIGGER update_courses_modtime
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- RLS Policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;

-- Read policies (Public/Authenticated)
CREATE POLICY "Public read courses" ON courses
    FOR SELECT USING (true);

CREATE POLICY "Public read modules" ON modules
    FOR SELECT USING (true);

CREATE POLICY "Public read lessons" ON lessons
    FOR SELECT USING (true);

CREATE POLICY "Users can track their own progress" ON user_course_progress
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin policies (using direct role check like other migrations)
CREATE POLICY "Admins can insert/update/delete courses" ON courses
    FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

CREATE POLICY "Admins can insert/update/delete modules" ON modules
    FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');

CREATE POLICY "Admins can insert/update/delete lessons" ON lessons
    FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'Admin');
