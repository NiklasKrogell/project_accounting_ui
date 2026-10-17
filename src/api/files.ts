import { api, apiBlob } from './client';

// The company's stored files (see the backend's /api/files). Only what the UI
// uses so far: reading a file's bytes, which always go through the API, and
// deleting one. A purchase invoice's file can be deleted only while the
// invoice is new or rejected (409 otherwise).
export const filesApi = {
  content: (id: string) => apiBlob(`/api/files/${id}/content`),
  remove: (id: string) => api<void>(`/api/files/${id}`, { method: 'DELETE' }),
};
