# Login & Dashboard Code Logic Explanation

## Summary of Cleanup
- **Removed**: Unused `canvasRef` import and entire unused canvas animation `useEffect` from Login.tsx
- **Kept**: All functional code that actively manages authentication, redirects, and maintenance mode

---

## Login.tsx - Complete Logic Breakdown

### 1. **Imports & Dependencies**
```tsx
import { useState, useEffect, useRef, useCallback } from "react";
```
- **useState**: Manages form inputs (username, password, errors, timers)
- **useEffect**: Runs side effects (auth checks, cleanup)
- **useRef**: Persists timer interval reference across renders
- **useCallback**: Optimizes retry timer function to prevent unnecessary recreations

### 2. **State Variables**
```tsx
const [username, setUsername] = useState("");           // Username input field value
const [password, setPassword] = useState("");           // Password input field value
const [error, setError] = useState("");                 // Error message display
const [isLoading, setIsLoading] = useState(false);      // Login button loading state
const [retryCountdown, setRetryCountdown] = useState(0); // Rate limit timer countdown
const [maintenanceMode, setMaintenanceMode] = useState(false); // BERT server status
const [estimatedMaintenanceMinutes, setEstimatedMaintenanceMinutes] = useState(30); // Expected maintenance duration
const [redirectMessage, setRedirectMessage] = useState<string | null>(null); // Loading screen message
const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null); // Persistent timer reference
```

### 3. **Retry Timer Function**
```tsx
const isRetryLocked = retryCountdown > 0; // Disables form when timer > 0

const startRetryTimer = useCallback((seconds: number) => {
  // Clear previous timer if exists
  if (retryTimerRef.current) clearInterval(retryTimerRef.current);
  
  // Set initial countdown
  setRetryCountdown(seconds);
  
  // Create new timer that decrements every second
  retryTimerRef.current = setInterval(() => {
    setRetryCountdown((prev) => {
      if (prev <= 1) {
        // When hitting 0, clear the interval and reset
        if (retryTimerRef.current) clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
        return 0;
      }
      return prev - 1; // Decrement countdown
    });
  }, 1000);
}, []);
```
**Purpose**: Handles rate limiting (429 errors) by showing a countdown timer and locking the form temporarily.

### 4. **useEffect: Cleanup Timer on Unmount**
```tsx
useEffect(() => {
  return () => {
    // When user leaves login page, clear interval to prevent memory leaks
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
  };
}, []);
```
**Purpose**: Prevents timer from running after user navigates away, preventing memory leaks.

### 5. **useEffect: Auth Check on Mount**
```tsx
useEffect(() => {
  let isMounted = true; // Flag to prevent state updates after unmount
  
  const checkSystemHealth = async () => {
    try {
      const response = await apiClient.fetch("/credential/health");
      if (isMounted && response.ok) {
        const healthData = await response.json();
        // If BERT server is down, show maintenance banner
        if (healthData.maintenance) {
          setMaintenanceMode(true);
          setEstimatedMaintenanceMinutes(healthData.estimatedMaintenanceMinutes || 30);
        }
      }
    } catch (err) {
      // Health check failed - continue anyway
    }
  };

  const checkIfAlreadyLoggedIn = async () => {
    try {
      const response = await apiClient.fetch("/credential/check");
      
      // If user has valid JWT, redirect to dashboard with loading screen
      if (isMounted && response.ok) {
        setRedirectMessage("You have already logged in. Redirecting to dashboard...");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
      // If 401/error, user stays on login page (not logged in)
    } catch (err) {
      // User not logged in - stay on login page
    }
  };

  // Run both checks
  checkSystemHealth();
  checkIfAlreadyLoggedIn();
  
  // Cleanup: prevent state updates after unmount
  return () => {
    isMounted = false;
  };
}, [navigate]);
```
**Purpose**: 
- Checks BERT server health (shows maintenance banner if down)
- Checks if user is already authenticated (auto-redirects to dashboard with loading message)
- Runs only once when page loads

### 6. **handleLogin Function**
```tsx
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isRetryLocked) return; // Don't allow if rate limited
  
  setError(""); // Clear previous errors
  setIsLoading(true); // Show loading state
  
  try {
    const response = await apiClient.fetch("/credential/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const apiError = await apiClient.parseError(response);

      // Handle 429 Rate Limiting
      if (response.status === 429) {
        const waitSeconds = apiError.retryAfterSeconds ?? 60;
        startRetryTimer(waitSeconds); // Lock form with countdown
        setError("Too many login attempts.");
        setIsLoading(false);
        return;
      }
      
      // Handle all other errors
      setError(apiError.message || "Login failed. Please check your credentials.");
      setIsLoading(false);
      return;
    }

    // 401 = Invalid credentials
    if (response.status === 401) {
      setError("Invalid username or password.");
      setIsLoading(false);
      return;
    }

    // 200 = Success
    if (response.status === 200) {
      const responseData = await response.json();
      // Small delay to ensure cookie is set before redirect
      setTimeout(() => {
        navigate("/dashboard");
      }, 100);
      return;
    }
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
```
**Purpose**: Handles login form submission with proper error handling for rate limiting and auth failures.

### 7. **JSX Rendering**

**Redirect Loading Screen** (shows when user already logged in):
```tsx
{redirectMessage && (
  <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
      <div className="animate-spin ..."></div> {/* Spinner */}
      <p className="text-lg text-[#4A4A4A] font-medium">{redirectMessage}</p>
    </div>
  </div>
)}
```

**Maintenance Banner** (shows when BERT server is down):
```tsx
<MaintenanceBanner 
  visible={maintenanceMode} 
  estimatedMinutes={estimatedMaintenanceMinutes}
/>
```

**Form Inputs** (disabled when loading, retry locked, or maintenance mode):
```tsx
<Input
  value={username}
  disabled={isLoading || maintenanceMode}
  onChange={(e) => setUsername(e.target.value)}
/>
```

**Submit Button** (text changes based on state):
```tsx
<Button disabled={isLoading || isRetryLocked || maintenanceMode}>
  {maintenanceMode
    ? "Service Unavailable"
    : isLoading
    ? "Signing in..."
    : isRetryLocked
      ? `Locked (${retryCountdown}s)` // Shows countdown
      : "Sign In"}
</Button>
```

**Error Message** (displays with retry countdown):
```tsx
{error && (
  <div className="bg-red-50 border border-red-200">
    <p>{error}</p>
    {isRetryLocked && (
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>Try again in <strong>{retryCountdown}</strong> second{retryCountdown !== 1 ? 's' : ''}</span>
      </div>
    )}
  </div>
)}
```

---

## Dashboard.tsx - Complete Logic Breakdown

### 1. **State Variables**
```tsx
const [radarData, setRadarData] = useState<any[]>([]);              // Chart data
const [loading, setLoading] = useState(true);                       // Initial loading state
const [error, setError] = useState<string | null>(null);            // Error messages
const [overallScore, setOverallScore] = useState<number>(0);        // Average score
const [maintenanceMode, setMaintenanceMode] = useState(false);      // BERT server status
const [estimatedMaintenanceMinutes, setEstimatedMaintenanceMinutes] = useState(30);
const [redirectMessage, setRedirectMessage] = useState<string | null>(null); // Loading screen
const hasRunRef = useRef(false); // Prevent useEffect from running multiple times
```

### 2. **useEffect: Main Data Fetching (runs once on mount)**
```tsx
useEffect(() => {
  // Guard: prevent effect from running multiple times
  if (hasRunRef.current) return;
  hasRunRef.current = true;

  const fetchSurveyScore = async () => {
    try {
      setLoading(true);
      
      // STEP 1: Check BERT server health first
      const healthResponse = await apiClient.fetch("/credential/health");
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        
        // If BERT is down, block dashboard and show maintenance message
        if (healthData.maintenance) {
          setMaintenanceMode(true);
          setEstimatedMaintenanceMinutes(healthData.estimatedMaintenanceMinutes || 30);
          setLoading(false);
          return; // Stop here - don't fetch data
        }
      }
      
      // STEP 2: User is authenticated (check JWT)
      const authResponse = await apiClient.fetch("/credential/check", {
        credentials: "include"
      });
      
      // No valid JWT? Show redirect message and go to login
      if (!authResponse.ok) {
        setRedirectMessage("Your session is over. Redirecting to login page...");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1000);
        return;
      }
      
      // STEP 3: Fetch survey scores
      const response = await apiClient.fetch("/survey/survey_score", {
        credentials: "include"
      });
      
      // Error fetching scores? Redirect to login
      if (!response.ok) {
        setRedirectMessage("Your session is over. Redirecting to login page...");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1000);
        return;
      }
      
      // STEP 4: Transform & display data
      const data = await response.json();
      
      // Check if data is empty
      if (!data || (Array.isArray(data) && data.length === 0) || 
          (typeof data === 'object' && Object.keys(data).length === 0)) {
        setRadarData([]);
        setError('No survey data available. Please complete the survey first.');
        return;
      }
      
      // Transform API response to chart format
      const transformedData = transformSurveyScoreData(data);
      
      if (transformedData.length === 0) {
        setError('Failed to parse survey data');
        setRadarData([]);
      } else {
        setRadarData(transformedData);
        setError(null);
      }
    } catch (err) {
      // Any unexpected error? Go to login
      setRedirectMessage("Your session is over. Redirecting to login page...");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  fetchSurveyScore();
}, []); // Empty array = run only once on mount
```

**Flow**:
1. ✅ Check if BERT is healthy
2. ✅ If BERT down → Block dashboard, show maintenance message
3. ✅ Check if user has valid JWT
4. ✅ If no JWT → Redirect to login with loading message
5. ✅ Fetch survey scores
6. ✅ Transform and display data

### 3. **handleLogout Function**
```tsx
const handleLogout = async () => {
  try {
    const response = await apiClient.fetch("/credential/logout", {
      method: "POST",
      credentials: "include"
    });
    
    // Wait for cookie to be cleared
    if (response.ok) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    navigate("/login"); // Go to login page
  } catch (err) {
    console.error("Logout error:", err);
    navigate("/login"); // Go to login anyway
  }
};
```
**Purpose**: Clears JWT cookie on backend and redirects to login.

### 4. **useEffect: Calculate Overall Score**
```tsx
useEffect(() => {
  if (radarData.length > 0) {
    // Sum all category scores
    const sum = radarData.reduce((acc, item) => acc + (item.yourScore || 0), 0);
    
    // Calculate average
    const average = (sum / radarData.length).toFixed(2);
    setOverallScore(parseFloat(average));
  } else {
    setOverallScore(0);
  }
}, [radarData]); // Re-run whenever radarData changes
```
**Purpose**: Automatically calculate overall maturity score as average of all categories.

### 5. **transformSurveyScoreData Function**
```tsx
const transformSurveyScoreData = (apiData: any) => {
  try {
    // Handle Array format: [{category: "...", score: 3.5}, ...]
    if (Array.isArray(apiData)) {
      return apiData.map((item) => ({
        category: item.category || item.name,
        yourScore: item.score || item.yourScore,
      }));
    } 
    // Handle Object format: {1: 3.52, 2: 3.92, ...}
    else if (typeof apiData === 'object' && apiData !== null) {
      const entries = Object.entries(apiData);
      
      // Numeric keys? Use CATEGORY_MAPPING to convert IDs to names
      if (entries.every(([key]) => !isNaN(Number(key)))) {
        return entries
          .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
          .map(([key, score]) => ({
            category: CATEGORY_MAPPING[Number(key)] || `Category ${key}`,
            yourScore: Number(score),
          }));
      }
      
      // String keys? Use as-is
      return entries.map(([category, score]) => ({
        category,
        yourScore: Number(score),
      }));
    }
    
    return [];
  } catch (err) {
    return [];
  }
};
```
**Purpose**: Converts API response (array or object) into radar chart format with category names and scores.

### 6. **CustomRadarTooltip Component**
```tsx
const CustomRadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white rounded-lg shadow-lg p-3">
        <p className="text-[#002D72] font-semibold">{data.category}</p>
        <p className="text-[#008489]">Score: {data.yourScore.toFixed(1)} / 5.0</p>
      </div>
    );
  }
  return null;
};
```
**Purpose**: Shows category name and score when hovering over radar chart points.

### 7. **JSX Structure**

**Redirect Loading Screen**:
```tsx
{redirectMessage && (
  <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="animate-spin ..."></div>
      <p>{redirectMessage}</p>
    </div>
  </div>
)}
```

**Maintenance Mode Block**:
```tsx
{maintenanceMode && (
  <div>
    <MaintenanceBanner visible={true} estimatedMinutes={estimatedMaintenanceMinutes} />
    <div className="mt-8 text-center">
      <p>The dashboard is temporarily unavailable due to system maintenance.</p>
      <Button onClick={handleLogout}>Back to Home</Button>
    </div>
  </div>
)}
```

**Dashboard Content** (only shown when BERT is healthy):
```tsx
{!maintenanceMode && (
  <>
    {/* Header, Charts, Metrics */}
  </>
)}
```

---

## Key Features Summary

### **Login Page**
✅ Rate limiting with countdown timer  
✅ Maintenance mode detection  
✅ Auto-redirect if already logged in  
✅ Form disabling during loading/maintenance  
✅ Mobile-responsive design  

### **Dashboard Page**
✅ BERT health check first  
✅ Blocks dashboard if BERT is down  
✅ Auto-redirects if session expires  
✅ Shows loading message during redirects  
✅ Calculates overall score automatically  
✅ Displays data in radar chart format  
✅ Mobile-responsive layout  

### **Flow Security**
1. **Login → Dashboard**: Check auth → Check BERT → Load data
2. **Dashboard ↔ Login**: Monitor session → Auto-redirect if expired
3. **BERT Down**: Both pages blocked with maintenance message
4. **Rate Limited**: Show countdown timer, lock form

---

## What Was Removed
- **`canvasRef` import**: Was declared but never used in JSX
- **Canvas animation useEffect**: Created DOM elements in non-existent container
  - This code was decorative and not attached to any HTML element
  - Removing it eliminates unused code without affecting functionality
