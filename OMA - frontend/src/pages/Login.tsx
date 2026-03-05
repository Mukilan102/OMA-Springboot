import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Clock } from "lucide-react";
import { HeroBackground } from "../components/HeroBackground";
import { MaintenanceBanner } from "../components/MaintenanceBanner";

import logo from "../assets/logo.png";
import "../styles/login-background.css";
import apiClient, { ApiError } from "../config/api";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [estimatedMaintenanceMinutes, setEstimatedMaintenanceMinutes] = useState(30);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRetryLocked = retryCountdown > 0;

  // Start a countdown timer that ticks every second
  const startRetryTimer = useCallback((seconds: number) => {
    // Clear any existing timer
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    setRetryCountdown(seconds);
    retryTimerRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          if (retryTimerRef.current) clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, []);

  // Check system health and if user is already logged in (once on mount)
  useEffect(() => {
    let isMounted = true;  // Prevent state updates after unmount
    
    const checkSystemHealth = async () => {
      try {
        const response = await apiClient.fetch("/credential/health");
        if (isMounted && response.ok) {
          const healthData = await response.json();
          if (healthData.maintenance) {
            setMaintenanceMode(true);
            setEstimatedMaintenanceMinutes(healthData.estimatedMaintenanceMinutes || 30);
          }
        }
      } catch (err) {
        // Health check failed (network, parsing, etc.), continue normally
      }
    };

    const checkIfAlreadyLoggedIn = async () => {
      try {
        // Call lightweight auth check endpoint
        const response = await apiClient.fetch("/credential/check");
        
        // Only redirect if response is successful AND component is still mounted
        if (isMounted && response.ok) {
          // User already logged in, show redirect message and navigate
          setRedirectMessage("You have already logged in. Redirecting to dashboard...");
          setTimeout(() => {
            navigate("/dashboard");
          }, 1000);
        }
        // If 401 or any other error, stay on login page (don't redirect anywhere)
      } catch (err) {
        // User not logged in, stay on login page
      }
    };

    // Check health and auth on mount (run only once)
    checkSystemHealth();
    checkIfAlreadyLoggedIn();
    
    // Cleanup: mark as unmounted to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRetryLocked) return;
    setError("");
    setIsLoading(true);

    try {
      const response = await apiClient.fetch("/credential/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password
        })
      });

      if (!response.ok) {
        const apiError = await apiClient.parseError(response);

        // Handle rate limiting (429)
        if (response.status === 429) {
          // Use retry metadata if available, fall back to 60s
          const waitSeconds = apiError.retryAfterSeconds ?? 60;
          startRetryTimer(waitSeconds);
          setError("Too many login attempts.");
        } else {
          setError(apiError.message || "Login failed. Please check your credentials.");
        }

        setIsLoading(false);
        return;
      }

      if (response.status === 401) {
        // Unauthorized (wrong credentials)
        setError("Invalid username or password.");
        setIsLoading(false);
        return;
      }

      if (response.status === 200) {
        // Success - parse response and navigate to dashboard
        const responseData = await response.json();
        
        // Small delay to ensure cookie is set
        setTimeout(() => {
          navigate("/dashboard");
        }, 100);
        return;
      }

      // Other errors
      const errorText = await response.text();
      setError(errorText || "Login failed. Please try again.");
      setIsLoading(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.retryAfterSeconds) startRetryTimer(err.retryAfterSeconds);
      } else {
        setError(err instanceof Error ? err.message : "An error occurred during login");
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full">
      {/* Redirect Loading Screen */}
      {redirectMessage && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#008489] border-t-transparent mx-auto"></div>
            <p className="text-lg text-[#4A4A4A] font-medium">{redirectMessage}</p>
          </div>
        </div>
      )}

      {/* Full-screen animated background (mobile) / Left half (desktop)--- */}
      <div className="absolute inset-0 lg:relative lg:w-1/2 overflow-hidden">
        <HeroBackground />
        
        <div className="absolute inset-0 z-20 hidden lg:flex flex-col items-center justify-center animate-fade-in">
          <img
            src={logo}
            alt="OMA Tool Logo"
            className="h-16 sm:h-20 lg:h-32 w-auto mb-2 lg:mb-6 drop-shadow-2xl animate-fade-in-down"
          />
          <h1 className="text-white text-3xl sm:text-4xl lg:text-6xl font-light tracking-wider animate-fade-in-up"
              style={{ textShadow: '0 0 20px rgba(0, 132, 137, 0.4)' }}>
            OMA
          </h1>
        </div>
      </div>

      {/* Mobile: logo area spacer - hidden on desktop */}
      <div className="lg:hidden flex-shrink-0" />

      {/* Right Side / Bottom - Login Form */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-6 pb-8 sm:p-8 overflow-y-auto">
        {/* Logo for mobile - hidden on desktop */}
        <div className="lg:hidden mb-6 text-center">
          <img
            src={logo}
            alt="OMA Tool Logo"
            className="h-12 sm:h-16 w-auto mx-auto mb-2 drop-shadow-lg"
          />
          <h1 className="text-[#002D72] text-2xl sm:text-3xl font-light tracking-wider">
            OMA
          </h1>
        </div>

        <div className="w-full max-w-md space-y-5 sm:space-y-8 animate-fade-in-up bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 lg:bg-white lg:backdrop-blur-none lg:rounded-none lg:shadow-none shadow-xl">

          <MaintenanceBanner 
            visible={maintenanceMode} 
            estimatedMinutes={estimatedMaintenanceMinutes}
          />

          <div className="space-y-2 sm:items-center animate-fade-in-up animate-delay-100">
            <h2 className="text-2xl sm:text-3xl font-light text-[#002D72]">Welcome back</h2>
            <p className="text-sm sm:text-base text-[#4A4A4A]">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 animate-fade-in-up animate-delay-200">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl space-y-1.5">
                <p className="text-sm font-medium">{error}</p>
                {isRetryLocked && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Try again in <strong>{retryCountdown}</strong> second{retryCountdown !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#4A4A4A]">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="your.username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading || maintenanceMode}
                className="h-12 border-gray-300 focus:border-[#008489] focus:ring-[#008489]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#4A4A4A]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || maintenanceMode}
                className="h-12 border-gray-300 focus:border-[#008489] focus:ring-[#008489]"
              />
            </div>

            

            <Button
              type="submit"
              disabled={isLoading || isRetryLocked || maintenanceMode}
              className="w-full h-12 bg-[#008489] hover:bg-[#006b6f] text-white disabled:opacity-50"
            >
              {maintenanceMode
                ? "Service Unavailable"
                : isLoading
                ? "Signing in..."
                : isRetryLocked
                  ? `Locked (${retryCountdown}s)`
                  : "Sign In"}
            </Button>

          </form>

          <p className="text-xs text-center text-gray-400 mt-2">
            By signing in you agree to our{" "}
            <Link to="/privacy-policy" className="underline hover:text-gray-600">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms-of-service" className="underline hover:text-gray-600">
              Terms of Service
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
