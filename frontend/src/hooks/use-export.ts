import { useState } from "react";
import { toast } from "sonner";
import { useLoadingProgress } from "@/components/ui/loading-progress";

export function useExport() {
  const { startProgress, updateProgress, endProgress, LoadingProgressComponent } = useLoadingProgress();
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async (
    endpoint: string,
    filename: string,
    options: {
      entityName: string;
      estimatedTime?: string;
    }
  ) => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      // Start progress indicator
      startProgress({
        message: `Exporting ${options.entityName}...`,
        estimatedTime: options.estimatedTime || "30 seconds",
        onCancel: () => {
          setIsExporting(false);
          endProgress();
          toast.info("Export cancelled");
        }
      });

      // Simulate progress updates (in real app, this would come from server)
      const progressInterval = setInterval(() => {
        updateProgress(Math.min(Date.now() % 90 + 10, 95)); // Random progress 10-95%
      }, 200);

      // Make the actual request
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('crm-auth-token') ?? ""}`
        }
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the CSV data
      const csvData = await response.text();

      // Create and download the file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      // Complete progress
      updateProgress(100);
      setTimeout(() => {
        endProgress();
        toast.success(`${options.entityName} exported successfully`, {
          duration: 5000,
          position: "top-right",
          className: "border-l-4 border-l-green-500",
        });
      }, 500);

    } catch (error) {
      endProgress();
      toast.error(`Failed to export ${options.entityName}`, {
        duration: 6000,
        position: "top-right",
        className: "border-l-4 border-l-red-500",
      });
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportData,
    isExporting,
    LoadingProgressComponent
  };
}
