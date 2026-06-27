import api from './api';
import { Project, CreateProjectForm, ProgressUpdate } from '../types';

export const projectService = {
  async list(params?: { status?: string; search?: string; department_id?: number; dept?: string }) {
    const res = await api.get('/projects', { params });
    return res.data;
  },

  async get(id: number): Promise<{ project: Project; progress: ProgressUpdate[]; overdue: boolean; progress_percentage: number }> {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  },

  async create(data: CreateProjectForm): Promise<Project> {
    const res = await api.post('/projects', data);
    return res.data;
  },

  async update(id: number, data: Partial<CreateProjectForm>): Promise<Project> {
    const res = await api.put(`/projects/${id}`, data);
    return res.data;
  },

  async complete(id: number): Promise<Project> {
    const res = await api.patch(`/projects/${id}/complete`);
    return res.data;
  },

  async markBilled(id: number): Promise<Project> {
    const res = await api.patch(`/projects/${id}/billed`);
    return res.data;
  },

  async changeDeadline(id: number, deadline: string): Promise<Project> {
    const res = await api.patch(`/projects/${id}/deadline`, { deadline });
    return res.data;
  },

  async subAssign(id: number, subAssignedTo: number): Promise<Project> {
    const res = await api.patch(`/projects/${id}/sub-assign`, { sub_assigned_to: subAssignedTo });
    return res.data;
  },

  async getProgress(projectId: number): Promise<ProgressUpdate[]> {
    const res = await api.get(`/projects/${projectId}/progress`);
    return res.data;
  },

  async addProgress(projectId: number, data: { text: string; percentage: number; progress_date?: string }): Promise<ProgressUpdate> {
    const res = await api.post(`/projects/${projectId}/progress`, data);
    return res.data;
  },
};
