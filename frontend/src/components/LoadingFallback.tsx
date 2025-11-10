import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingFallbackProps {
  fullScreen?: boolean;
  className?: string;
}

/**
 * Loading fallback component for lazy-loaded routes and components
 * Used with React.lazy() and Suspense boundaries
 */
export function LoadingFallback({ fullScreen = false, className }: LoadingFallbackProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen ? "min-h-screen" : "min-h-[400px]",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Minimal loading fallback for inline components
 */
export function InlineLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

/**
 * Page-level loading fallback with full screen height
 */
export function PageLoadingFallback() {
  return <LoadingFallback fullScreen />;
}

export default LoadingFallback;
