import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Clock } from "lucide-react";

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
  const canvasRef = useRef<HTMLDivElement>(null);
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

  // Check if user is already logged in
  useEffect(() => {
    const checkIfAlreadyLoggedIn = async () => {
      try {
        // Call lightweight auth check endpoint (much faster than /survey/survey_score)
        const response = await apiClient.fetch("/credential/check");
        
        // If response is 200, user is already authenticated
        if (response.status === 200) {
          // User already logged in, redirect to dashboard
          navigate("/dashboard");
          return;
        }
      } catch (err) {
        // User not logged in, stay on login page
      }
    };

    checkIfAlreadyLoggedIn();
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
    const container = canvasRef.current;
    if (!container) return;

    // Create network nodes
    const nodeCount = 20;
    const nodes: HTMLDivElement[] = [];
    
    for (let i = 0; i < nodeCount; i++) {
      const node = document.createElement('div');
      node.className = 'network-node';
      node.style.left = `${Math.random() * 100}%`;
      node.style.top = `${Math.random() * 100}%`;
      node.style.animationDelay = `${Math.random() * 4}s`;
      container.appendChild(node);
      nodes.push(node);
    }

    // Create particles
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 3}s`;
      container.appendChild(particle);
    }

    // Create hexagons
    const hexCount = 8;
    for (let i = 0; i < hexCount; i++) {
      const hex = document.createElement('div');
      hex.className = 'hexagon';
      hex.style.left = `${Math.random() * 90}%`;
      hex.style.top = `${Math.random() * 90}%`;
      hex.style.animationDelay = `${Math.random() * 25}s`;
      container.appendChild(hex);
    }

    // Create data streams
    const streamCount = 5;
    for (let i = 0; i < streamCount; i++) {
      const stream = document.createElement('div');
      stream.className = 'data-stream';
      stream.style.left = `${Math.random() * 100}%`;
      stream.style.animationDelay = `${Math.random() * 3}s`;
      stream.style.animationDuration = `${3 + Math.random() * 2}s`;
      container.appendChild(stream);
    }

    // Create geometric shapes
    const shapes = ['circle', 'square'];
    for (let i = 0; i < 6; i++) {
      const shape = document.createElement('div');
      shape.className = `geometric-shape ${shapes[Math.floor(Math.random() * shapes.length)]}`;
      shape.style.width = `${50 + Math.random() * 100}px`;
      shape.style.height = `${50 + Math.random() * 100}px`;
      shape.style.left = `${Math.random() * 90}%`;
      shape.style.top = `${Math.random() * 90}%`;
      shape.style.animationDelay = `${Math.random() * 20}s`;
      shape.style.animationDuration = `${15 + Math.random() * 10}s`;
      container.appendChild(shape);
    }

    return () => {
      // Cleanup
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full">
      {/* Full-screen animated background (mobile) / Left half (desktop) */}
      <div className="absolute inset-0 lg:relative lg:w-1/2 overflow-hidden">
        <div className="login-background">
          {/* Grid Overlay */}
          <div className="grid-overlay" />
          
          {/* Glowing Orbs */}
          <div className="glow-orb glow-orb-1" />
          <div className="glow-orb glow-orb-2" />
          <div className="glow-orb glow-orb-3" />
          
          {/* Scan Line */}
          <div className="scan-line" />
          
          {/* Animated Elements Container */}
          <div ref={canvasRef} className="particles" />
        </div>
        
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center animate-fade-in">
          <img
            src={logo}
            alt="OMA Tool Logo"
            className="h-16 sm:h-20 lg:h-32 w-auto mb-2 lg:mb-6 drop-shadow-2xl animate-fade-in-down"
            style={{ filter: 'drop-shadow(0 0 30px rgba(99, 179, 237, 0.5))' }}
          />
          <h1 className="text-white text-3xl sm:text-4xl lg:text-6xl font-light tracking-wider animate-fade-in-up animate-delay-200"
              style={{ textShadow: '0 0 40px rgba(99, 179, 237, 0.6), 0 0 20px rgba(99, 179, 237, 0.4)' }}>
            OMA
          </h1>
        </div>
      </div>

      {/* Mobile: logo area spacer so form doesn't overlap the logo */}
      <div className="h-44 sm:h-52 lg:hidden flex-shrink-0" />

      {/* Right Side / Bottom - Login Form */}
      <div className="relative z-10 flex-1 flex items-start lg:items-center justify-center px-6 pt-6 pb-8 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-5 sm:space-y-8 animate-fade-in-up bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 lg:bg-white lg:backdrop-blur-none lg:rounded-none lg:shadow-none shadow-xl">

          <div className="space-y-2 sm:items-centeranimate-fade-in-up animate-delay-100">
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
                disabled={isLoading}
                className="h-12 border-gray-300 focus:border-[#002D72] focus:ring-[#002D72]"
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
                disabled={isLoading}
                className="h-12 border-gray-300 focus:border-[#002D72] focus:ring-[#002D72]"
              />
            </div>

            

            <Button
              type="submit"
              disabled={isLoading || isRetryLocked}
              className="w-full h-12 bg-[#002D72] hover:bg-[#001f52] text-white disabled:opacity-50"
            >
              {isLoading
                ? "Signing in..."
                : isRetryLocked
                  ? `Locked (${retryCountdown}s)`
                  : "Sign In"}
            </Button>

          </form>
        </div>
      </div>
    </div>
  );
}
