import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const AuthenticatedImage = ({ src, alt, className, onClick }: AuthenticatedImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        // Build full URL if src is a relative path
        let imageUrl = src;
        if (!src.startsWith('http')) {
          // If API_URL already contains /api and src starts with /api, remove duplicate
          if (API_URL.endsWith('/api') && src.startsWith('/api/')) {
            imageUrl = `${API_URL}${src.substring(4)}`; // Remove /api from src
          } else {
            imageUrl = `${API_URL}${src}`;
          }
        }

        const response = await apiClient.get(imageUrl, {
          responseType: 'blob',
        });

        const blobUrl = URL.createObjectURL(response.data);
        setImageSrc(blobUrl);
      } catch (err) {
        console.error('Failed to load image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (src) {
      fetchImage();
    }

    // Cleanup blob URL on unmount
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <span className="text-muted-foreground text-sm">Failed to load</span>
      </div>
    );
  }

  return <img src={imageSrc} alt={alt} className={className} onClick={onClick} />;
};
