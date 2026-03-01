export interface Note {
  note_id: number;
  owner_id: string;
  is_public_read: boolean;
  is_public_write: boolean;
  content: string;
  title: string | null;
  timestamp_created: number;
  timestamp_modified: number;
}

export interface NoteListResponse {
  status: string;
  data: Note[];
}

export interface SingleNoteResponse {
  status: string;
  data: Note | null;
}

export interface CreateNoteRequest {
  content: string;
  is_public_read: boolean;
  is_public_write: boolean;
  title?: string | null;
}

export interface UpdateNoteRequest {
  id: number;
  content: string;
  is_public_read: boolean;
  is_public_write: boolean;
  title?: string | null;
}

export interface ErrorResponse {
  error: string;
  message: string | null;
}
