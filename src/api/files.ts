import { apiBlob } from './client';

// The company's stored files (see the backend's /api/files). Only what the UI
// uses so far: reading a file's bytes, which always go through the API.
export const filesApi = {
  content: (id: string) => apiBlob(`/api/files/${id}/content`),
};
