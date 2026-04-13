import { useState } from "react";
import { toast } from "sonner";

type RefreshConfig = {
  message: string;
  minDuration?: number;
  successMessage?: string;
};

export function useRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async (
    refreshFn: () => Promise<unknown> | Promise<unknown>[],
    config: RefreshConfig
  ) => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    const start = Date.now();

    try {
      // Show loading toast with enhanced styling
      const loadingToast = toast.loading(config.message, {
        duration: Infinity,
        position: "top-right",
        className: "border-l-4 border-l-primary",
      });

      // Execute refresh function(s)
      const result = await refreshFn();

      // Ensure minimum duration for better UX
      const elapsed = Date.now() - start;
      const minDuration = config.minDuration ?? 800; // Slightly longer for better perception
      if (elapsed < minDuration) {
        await new Promise(r => setTimeout(r, minDuration - elapsed));
      }

      // Dismiss loading toast and show success with enhanced styling
      toast.dismiss(loadingToast);
      toast.success(config.successMessage ?? "Data refreshed successfully", {
        duration: 5000, // Longer duration for success messages
        position: "top-right",
        className: "border-l-4 border-l-green-500",
      });

      return result;
    } catch (error) {
      toast.dismiss();
      toast.error("Refresh failed", {
        duration: 6000, // Longer for errors so users see them
        position: "top-right",
        className: "border-l-4 border-l-red-500",
      });
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refresh, isRefreshing };
}