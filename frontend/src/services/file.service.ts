import apiClient from '@/lib/api-client';

export const fileService = {
  async uploadFile(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response.data.data;
  },

  async getConversationFiles(params: {
    conversationWith?: string;
    groupId?: string;
    fileType?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get('/files', { params });
    return response.data;
  },

  async deleteFile(fileId: string) {
    const response = await apiClient.delete(`/files/${fileId}`);
    return response.data;
  },

  getFileUrl(filePath: string) {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    if (!baseUrl) {
      console.warn('VITE_API_URL is missing, file URLs may be incorrect');
    }
    return `${baseUrl}${filePath}`;
  },
};
