import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { authService } from "@/services/auth";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { setRole } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authService
      .me()
      .then((session) => {
        if (!session?.user) {
          throw new Error("No authenticated session found");
        }
        setRole(session.user.role);
        navigate("/overview");
      })
      .catch((err) => {
        console.error("Google login error:", err);
        setError("Failed to complete Google login. Please try again.");
      });
  }, [navigate, setRole]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="text-blue-500 underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Completing Google login...</p>
      </div>
    </div>
  );
}
