import apiClient from '@/lib/api-client';

export const fileService = {
  async uploadFile(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    console.log('📤 Uploading file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      endpoint: '/files/upload',
      baseURL: apiClient.defaults.baseURL
    });

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

    console.log('✅ File upload response:', response.data);
    return response.data.data;
  },

  async deleteFile(fileId: string) {
    const response = await apiClient.delete(`/files/${fileId}`);
    return response.data;
  },

  getFileUrl(filePath: string) {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';
    return `${baseUrl}${filePath}`;
  },
};
