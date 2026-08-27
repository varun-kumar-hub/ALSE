import { create } from 'zustand';
import { ProjectItem, getProjects, createProject, updateProject, deleteProject } from '../services/database';
import { ProjectFile } from '../services/types';

interface ProjectState {
  projects: ProjectItem[];
  activeProjectId: string | null;
  projectFiles: Map<string, ProjectFile[]>;
  isLoading: boolean;

  // Actions
  loadProjects: () => Promise<void>;
  setActiveProjectId: (id: string | null) => void;
  createProjectItem: (name: string, description?: string, instructions?: string) => Promise<ProjectItem>;
  updateProjectInstructions: (id: string, instructions: string) => Promise<void>;
  deleteProjectItem: (id: string) => Promise<void>;
  addProjectFileItem: (projectId: string, file: ProjectFile) => void;
  removeProjectFileItem: (projectId: string, fileId: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProjectId: null,
  projectFiles: new Map(),
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const list = await getProjects();
      set({ projects: list, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveProjectId: (id) => set({ activeProjectId: id }),

  createProjectItem: async (name, description, instructions) => {
    const created = await createProject(name, description, instructions);
    set((state) => ({
      projects: [created, ...state.projects],
      activeProjectId: created.id,
    }));
    return created;
  },

  updateProjectInstructions: async (id, instructions) => {
    await updateProject(id, { instructions });
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, instructions } : p)),
    }));
  },

  deleteProjectItem: async (id) => {
    await deleteProject(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    }));
  },

  addProjectFileItem: (projectId, file) => {
    set((state) => {
      const updatedMap = new Map(state.projectFiles);
      const existing = updatedMap.get(projectId) || [];
      updatedMap.set(projectId, [file, ...existing]);
      return { projectFiles: updatedMap };
    });
  },

  removeProjectFileItem: (projectId, fileId) => {
    set((state) => {
      const updatedMap = new Map(state.projectFiles);
      const existing = updatedMap.get(projectId) || [];
      updatedMap.set(
        projectId,
        existing.filter((f) => f.id !== fileId)
      );
      return { projectFiles: updatedMap };
    });
  },
}));
