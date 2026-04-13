import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProgressProps {
  message: string;
  progress?: number;
  estimatedTime?: string;
  onCancel?: () => void;
  className?: string;
}

export function LoadingProgress({
  message,
  progress,
  estimatedTime,
  onCancel,
  className
}: LoadingProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (progress !== undefined) {
      // Smooth animation to target progress
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Indeterminate progress animation
      const interval = setInterval(() => {
        setAnimatedProgress(prev => (prev + 2) % 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [progress]);

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 w-80 max-w-sm",
      "bg-background border border-border rounded-lg shadow-lg p-4",
      "animate-in slide-in-from-top-2 fade-in-0 duration-300",
      className
    )}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {message}
          </p>
          {estimatedTime && (
            <p className="text-xs text-muted-foreground mt-1">
              {estimatedTime}
            </p>
          )}
        </div>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Progress
        value={progress !== undefined ? animatedProgress : undefined}
        className="h-2"
      />

      {progress !== undefined && (
        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
          <span>{Math.round(animatedProgress)}%</span>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}

// Hook for managing loading progress
export function useLoadingProgress() {
  const [progress, setProgress] = useState<{
    message: string;
    progress?: number;
    estimatedTime?: string;
    onCancel?: () => void;
  } | null>(null);

  const startProgress = (config: {
    message: string;
    estimatedTime?: string;
    onCancel?: () => void;
  }) => {
    setProgress({ ...config, progress: 0 });
  };

  const updateProgress = (value: number) => {
    setProgress(prev => prev ? { ...prev, progress: value } : null);
  };

  const endProgress = () => {
    setProgress(null);
  };

  const LoadingProgressComponent = progress ? (
    <LoadingProgress
      message={progress.message}
      progress={progress.progress}
      estimatedTime={progress.estimatedTime}
      onCancel={progress.onCancel}
    />
  ) : null;

  return {
    startProgress,
    updateProgress,
    endProgress,
    LoadingProgressComponent,
    isLoading: progress !== null
  };
}