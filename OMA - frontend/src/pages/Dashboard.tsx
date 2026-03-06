import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import apiClient from "../config/api";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { OnionPeel } from "../components/OnionPeel";
import { HappinessChart } from "../components/HappinessChart";
import { MaintenanceBanner } from "../components/MaintenanceBanner";

import { Footer } from "../components/Footer";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import logo from "../assets/HARTS Consulting LBG.png";
import EvoraLogo from "../assets/Evoralogo.png";
import { useState, useEffect, useRef } from "react";

const CATEGORY_MAPPING: { [key: number]: string } = {
  1: 'Leadership',
  2: 'Strategy',
  3: 'Execution',
  4: 'Process',
  5: 'People',
  6: 'Performance',
  7: 'Technology',
  8: 'Learning',
};

export default function Dashboard() {
  const navigate = useNavigate();
  useScrollAnimation();
  
  const [radarData, setRadarData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [estimatedMaintenanceMinutes, setEstimatedMaintenanceMinutes] = useState(30);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const hasRunRef = useRef(false);  // Prevent effect from running multiple times

  // Fetch survey score data on mount - handles both authentication and data fetching
  useEffect(() => {
    // Skip if effect has already run (prevents infinite loops)
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const fetchSurveyScore = async () => {
      try {
        setLoading(true);
        
        // First, check BERT health status
        const healthResponse = await apiClient.fetch("/credential/health");
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          if (healthData.maintenance) {
            setMaintenanceMode(true);
            setEstimatedMaintenanceMinutes(healthData.estimatedMaintenanceMinutes || 30);
            setLoading(false);
            return;  // Block dashboard - BERT is not running
          }
        }
        
        // BERT is healthy, now check if user has valid JWT token
        const authResponse = await apiClient.fetch("/credential/check", {
          credentials: "include"
        });
        
        // If user is not authenticated, show redirect message and redirect to login
        if (!authResponse.ok) {
          setRedirectMessage("Your session is over. Redirecting to login page...");
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 1000);
          return;
        }
        
        // User is authenticated, now fetch survey scores
        const response = await apiClient.fetch("/survey/survey_score", {
          credentials: "include"
        });
        
        // Check if user is unauthorized - redirect to login and stop
        if (!response.ok) {
          setRedirectMessage("Your session is over. Redirecting to login page...");
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 1000);
          return;
        }
        
        const data = await response.json();
        
        // Check if data is empty (but allow objects)
        if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
          setRadarData([]);
          setError('No survey data available. Please complete the survey first.');
          return;
        }
        
        // Transform API response to match radar chart format
        const transformedData = transformSurveyScoreData(data);
        
        if (transformedData.length === 0) {
          setError('Failed to parse survey data - unable to transform API response');
          setRadarData([]);
        } else {
          setRadarData(transformedData);
          setError(null);
        }
      } catch (err) {
        // If any error occurs, redirect to login to be safe
        setRedirectMessage("Your session is over. Redirecting to login page...");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1000);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyScore();
  }, []);  // Empty dependency array - run only once on mount

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear JWT cookie on backend
      const response = await apiClient.fetch("/credential/logout", {
        method: "POST",
        credentials: "include"
      });
      
      // Wait for response to complete and cookie to be cleared
      if (response.ok) {
        // Add a small delay to ensure browser processes the Set-Cookie header
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Navigate to login page after logout
      navigate("/login");
    } catch (err) {
      // Even if logout fails, still redirect to login
      console.error("Logout error:", err);
      navigate("/login");
    }
  };

  // Calculate overall score as average of all category scores
  useEffect(() => {
    if (radarData.length > 0) {
      const sum = radarData.reduce((acc, item) => acc + (item.yourScore || 0), 0);
      const average = (sum / radarData.length).toFixed(2);
      setOverallScore(parseFloat(average));
    } else {
      setOverallScore(0);
    }
  }, [radarData]);

  // Build pulse metrics dynamically
  const pulseMetrics = [
    {
      title: "Overall Maturity Score",
      value: overallScore.toFixed(2),
      max: "5.0",
      color: "#008489",
    },
  ];

  // Transform API response to radar chart format
  const transformSurveyScoreData = (apiData: any) => {
    try {
      if (Array.isArray(apiData)) {
        return apiData.map((item) => ({
          category: item.category || item.name,
          yourScore: item.score || item.yourScore,
        }));
      } else if (typeof apiData === 'object' && apiData !== null) {
        const entries = Object.entries(apiData);
        
        // Handle numeric key format: { 1: 3.52, 2: 3.92, ... }
        if (entries.every(([key]) => !isNaN(Number(key)))) {
          return entries
            .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
            .map(([key, score]) => ({
              category: CATEGORY_MAPPING[Number(key)] || `Category ${key}`,
              yourScore: Number(score),
            }));
        }
        
        // Handle string key format
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

  /**
   * Custom tooltip for the radar chart
   * Displays category name and score on hover
   */
  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white rounded-lg shadow-lg p-3 border border-[#002D72]">
          <p className="text-[#002D72] font-semibold text-sm">{data.category}</p>
          <p className="text-[#008489] font-light text-lg">
            Score: {data.yourScore.toFixed(1)} / 5.0
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      {/* Redirect Loading Screen */}
      {redirectMessage && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#008489] border-t-transparent mx-auto"></div>
            <p className="text-lg text-[#4A4A4A] font-medium">{redirectMessage}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="border-b border-gray-200 animate-fade-in-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src={logo} alt="OMA Tool Logo" className="h-10 w-auto" />
              <h1 className="text-2xl font-light tracking-wider text-[#002D72]">
                OMA
              </h1>
            </div>
            <div className="flex gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-[#4A4A4A] hover:text-[#002D72]"
              >
                Home
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-[#002D72] border-[#002D72] hover:bg-[#002D72] hover:text-white"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-8 sm:space-y-12 w-full">
        {/* Maintenance Banner - blocks dashboard if BERT is down */}
        {maintenanceMode && (
          <div>
            <MaintenanceBanner 
              visible={true} 
              estimatedMinutes={estimatedMaintenanceMinutes}
            />
            <div className="mt-8 text-center">
              <p className="text-lg text-[#4A4A4A] mb-4">
                The dashboard is temporarily unavailable due to system maintenance. Please check back later.
              </p>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-[#002D72] border-[#002D72] hover:bg-[#002D72] hover:text-white"
              >
                Back to Home
              </Button>
            </div>
          </div>
        )}

        {/* Dashboard content - only shown when BERT is healthy */}
        {!maintenanceMode && (
          <>
        {/* Header */}
        <div className="space-y-4 scroll-animate flex flex-col items-center">
          <div className="flex flex-col gap-4 items-center">
            <img src={EvoraLogo} alt="EVORA Logo" className="h-16 sm:h-20 w-auto object-contain" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#002D72] text-center">
              Maturity Assessment Dashboard
            </h2>
          </div>
          <p className="text-base sm:text-lg text-[#4A4A4A] text-center max-w-2xl">
            Your organizational maturity assessment results and strategic insights
          </p>
        </div>

        {/* Main Layout: Left Column (2 boxes) + Right Column (1 large box) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column */}
          <div className="space-y-6 sm:space-y-8">
            {/* Overall Maturity Score */}
            <Card className="bg-white rounded-xl sm:rounded-2xl shadow-md px-4 sm:px-8 py-6 sm:py-8 space-y-5 scroll-animate gradient-border-hover">
              {pulseMetrics.map((metric, index) => (
                <div key={index} className="space-y-6">
                  <h3 className="text-xl sm:text-2xl font-light text-[#002D72]">Overall Maturity Score</h3>
                  <div className="space-y-4">
                    <p className="text-sm text-[#4A4A4A]">{metric.title}</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl sm:text-5xl font-light text-[#002D72]">
                        {metric.value}
                      </span>
                      <span className="text-lg sm:text-xl text-[#4A4A4A]">
                        / {metric.max}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            {/* EVORA's Model */}
            <Card className="bg-white rounded-xl sm:rounded-2xl shadow-md px-4 sm:px-8 py-6 sm:py-8 space-y-5 scroll-animate gradient-border-hover">
              <h3 className="text-xl sm:text-2xl font-light text-[#002D72] mb-6">EVORA's Model</h3>
              <div className="w-full">
                <OnionPeel score={overallScore} />
              </div>
            </Card>
          </div>

          {/* Right Column - Category Performance Analysis */}
          <div>
            <Card className="bg-white rounded-xl sm:rounded-2xl shadow-md px-4 sm:px-8 py-6 sm:py-8 space-y-5 h-full scroll-animate gradient-border-hover">
              <div className="space-y-6 h-full flex flex-col">
                <div>
                  <h3 className="text-xl sm:text-2xl font-light text-[#002D72]">
                    Category Performance Analysis
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4A4A4A] mt-2">
                    Your organization's maturity across key categories
                  </p>
                </div>
                <div className="flex-1 min-h-[300px] sm:min-h-[350px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002D72] mx-auto mb-4"></div>
                        <p className="text-[#4A4A4A]">Loading survey data...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-red-500 mb-2">⚠️ Error loading data</p>
                        <p className="text-sm text-[#4A4A4A]">{error}</p>
                      </div>
                    </div>
                  ) : radarData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-[#4A4A4A] mb-2">No survey data available</p>
                        <p className="text-sm text-[#8c9e99]">Please complete the survey to view results</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} margin={{ top: 80, right: 60, bottom: 40, left: 60 }}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis
                          dataKey="category"
                          tick={{ fill: "#4A4A4A", fontSize: 10, offset: 8 }}
                        />
                        <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} />
                        <Tooltip
                          content={<CustomRadarTooltip />}
                          cursor={false}
                          // cursor={{ stroke: "#002D72", strokeWidth: 2 }}
                          wrapperStyle={{ outline: "none" }}
                        />
                        <Radar
                          name="Your Organization"
                          dataKey="yourScore"
                          stroke="#002D72"
                          fill="#002D72"
                          fillOpacity={0.5}
                          strokeWidth={2}
                          isAnimationActive={true}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: "20px" }}
                          iconType="circle"
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Organizational Health & Sentiment */}
        <div className="space-y-6 sm:space-y-8 scroll-animate">
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#002D72]">
              Organizational Health & Sentiment
            </h3>
            <p className="text-sm sm:text-base lg:text-lg text-[#4A4A4A]">
              Employee well-being and engagement metrics
            </p>
          </div> 

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <div className="h-full scroll-animate">
              <HappinessChart />
            </div>
            {/* eNPS Score Card */}
            <Card className="p-4 sm:p-6 bg-white shadow-sm hover:shadow-md transition-shadow card-hover gradient-border-hover scroll-animate-right">
              <h4 className="text-base sm:text-lg lg:text-xl font-medium mb-4 text-[#002D72]">Employee Net Promoter Score (eNPS)</h4>
              <div className="flex flex-col items-center">
                {/* Donut Chart */}
                <div className="relative w-20 h-20 sm:w-26 sm:h-26 mb-3">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {/* Background circle */}
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f0f0" strokeWidth="12" />
                    {/* Promoters segment (green) - 54% = 194.4 degrees */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#22c55e" 
                      strokeWidth="7"
                      strokeDasharray="135.7 251.3"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Detractors segment (red) - 27% */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#ef4444" 
                      strokeWidth="7"
                      strokeDasharray="67.9 251.3"
                      strokeDashoffset="-135.7"
                      strokeLinecap="round"
                    />
                    {/* Passives segment (yellow) - 19% */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#fbbf24" 
                      strokeWidth="7"
                      strokeDasharray="47.7 251.3"
                      strokeDashoffset="-203.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-light text-[#4A4A4A]">50</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
                      <span className="text-sm text-[#4A4A4A]">Promoters</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#4A4A4A]">
                      <span className="font-medium">27</span>
                      <span className="text-[#8c9e99]">|</span>
                      <span>54%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                      <span className="text-sm text-[#4A4A4A]">Detractors</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#4A4A4A]">
                      <span className="font-medium">14</span>
                      <span className="text-[#8c9e99]">|</span>
                      <span>27%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#fbbf24]" />
                      <span className="text-sm text-[#4A4A4A]">Passives</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#4A4A4A]">
                      <span className="font-medium">9</span>
                      <span className="text-[#8c9e99]">|</span>
                      <span>19%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Contact Us Section */}
        
          </>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}