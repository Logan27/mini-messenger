import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderSrc?: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  blurDataURL?: string;
}

/**
 * LazyImage component with progressive loading and blur placeholder
 *
 * Features:
 * - Intersection Observer for lazy loading
 * - Blur placeholder while loading
 * - Responsive images with srcset support
 * - WebP format support with automatic fallback
 * - Smooth fade-in transition
 */
export const LazyImage = ({
  src,
  alt,
  className,
  placeholderSrc,
  srcSet,
  sizes,
  width,
  height,
  objectFit = 'cover',
  onClick,
  onLoad,
  onError,
  loading = 'lazy',
  blurDataURL,
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager' || !imgRef.current) {
      return;
    }

    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '50px', // Start loading 50px before image enters viewport
      threshold: 0.01,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          // Disconnect observer after image is in view
          if (observerRef.current && imgRef.current) {
            observerRef.current.unobserve(imgRef.current);
          }
        }
      });
    }, options);

    observerRef.current.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
  };

  // Determine which source to show
  const currentSrc = isInView ? src : (blurDataURL || placeholderSrc || '');
  const currentSrcSet = isInView ? srcSet : undefined;

  // Generate blur hash CSS
  const blurStyle = blurDataURL && !isLoaded
    ? {
        backgroundImage: `url(${blurDataURL})`,
        backgroundSize: objectFit,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {};

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        className
      )}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
      }}
    >
      {/* Blur placeholder background */}
      {blurDataURL && !isLoaded && (
        <div
          className="absolute inset-0 transform scale-110 filter blur-xl"
          style={blurStyle}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {!hasError ? (
        <img
          ref={imgRef}
          src={currentSrc}
          srcSet={currentSrcSet}
          sizes={sizes}
          alt={alt}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            onClick && 'cursor-pointer'
          )}
          style={{
            objectFit,
          }}
          width={width}
          height={height}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          onClick={onClick}
          decoding="async"
        />
      ) : (
        /* Error fallback */
        <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
          <div className="text-center p-4">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {!isLoaded && !hasError && isInView && !blurDataURL && (
        <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden="true" />
      )}
    </div>
  );
};

/**
 * Helper hook for generating srcset and sizes attributes
 */
export const useResponsiveImage = (
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
) => {
  const generateSrcSet = (format: 'webp' | 'jpg' = 'webp') => {
    return widths.map((width) => `${baseUrl}_${width}w.${format} ${width}w`).join(', ');
  };

  const generateSizes = (breakpoints: string[] = [
    '(max-width: 640px) 100vw',
    '(max-width: 1024px) 50vw',
    '33vw',
  ]) => {
    return breakpoints.join(', ');
  };

  return {
    srcSet: generateSrcSet(),
    sizes: generateSizes(),
  };
};
