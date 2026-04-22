import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "@/services/auth";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. Token is missing.");
        return;
      }

      try {
        const result = await authService.verifyEmail(token);
        setStatus("success");
        setMessage(result.message || "Email verified successfully!");
        
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (error: any) {
        setStatus("error");
        setMessage(error?.message || "Verification failed. The link may be expired or invalid.");
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="text-center">
            {status === "loading" && (
              <>
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
                <h2 className="text-xl font-semibold">Verifying your email...</h2>
                <p className="mt-2 text-muted-foreground">Please wait while we verify your email address.</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-green-600">Email Verified!</h2>
                <p className="mt-2 text-muted-foreground">{message}</p>
                <p className="mt-4 text-sm text-muted-foreground">Redirecting to login...</p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-red-600">Verification Failed</h2>
                <p className="mt-2 text-muted-foreground">{message}</p>
                <button
                  onClick={() => navigate("/login")}
                  className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Go to Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}