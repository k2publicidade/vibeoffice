import { SavedProject, GenerationConfig } from "@/types/vibecanvas";

const STORAGE_KEY = "vibecanvas_projects_v1";

export const getProjects = (): SavedProject[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error("Failed to load projects", e);
        return [];
    }
};

export const saveProject = (config: GenerationConfig, briefing: string): SavedProject => {
    const projects = getProjects();

    const newProject: SavedProject = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        config,
        briefing
    };

    const updated = [newProject, ...projects];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newProject;
};

export const deleteProject = (id: string): void => {
    const projects = getProjects();
    const updated = projects.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const updateProject = (id: string, config: GenerationConfig, briefing: string): void => {
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index !== -1) {
        projects[index] = { ...projects[index], config, briefing };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
};
