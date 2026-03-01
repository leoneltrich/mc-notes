import { apiClient } from './client';
import type { NoteListResponse, SingleNoteResponse, CreateNoteRequest, UpdateNoteRequest } from '../types/api';

export const NotesApi = {
  getAll: () => apiClient<NoteListResponse>('/notes'),
  getById: (id: number) => apiClient<SingleNoteResponse>(`/notes/${id}`),
  create: (data: CreateNoteRequest) => apiClient<{ description: string }>('/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (data: UpdateNoteRequest) => apiClient<{ description: string }>('/notes', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiClient<{ description: string }>(`/notes/${id}`, {
    method: 'DELETE',
  }),
};
