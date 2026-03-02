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

import { Footer } from "../components/Footer";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import logo from "../assets/HARTS Consulting LBG.png";
import EvoraLogo from "../assets/Evoralogo.png";
import { useState, useEffect } from "react";

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

  // Extract username from JWT cookie by attempting to call an authenticated endpoint
  // If authentication fails, user will be redirected
  useEffect(() => {
    // Verify authentication by calling an authenticated endpoint
    apiClient.fetch("/survey/survey_score")
      .then(response => {
        if (!response.ok) {
          // Unauthorized - redirect to login
          navigate("/login");
          return;
        }
        // Authentication successful
      })
      .catch((err) => {
        console.error("Authentication check failed:", err);
        navigate("/login");
      });
  }, [navigate]);

  const handleLogout = async () => {
    try {
      // Call logout endpoint to clear JWT cookie on backend
      await apiClient.fetch("/credential/logout", {
        method: "POST"
      });
      
      // Navigate to login page after logout
      navigate("/login");
    } catch (err) {
      // Even if logout fails, still redirect to login
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

  // Fetch survey score data from API
  useEffect(() => {
    const fetchSurveyScore = async () => {
      try {
        setLoading(true);
        const response = await apiClient.fetch("/survey/survey_score", {
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch survey scores: ${response.statusText}`);
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
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setRadarData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyScore();
  }, []);

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
    <div className="min-h-screen bg-[#F5F7FA]">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Header */}
        <div className="space-y-2 scroll-animate">
          <div className="flex items-center gap-5">
            <img src={EvoraLogo} alt="EVORA Logo" className="h-12 w-auto mt-4" />
            <h2 className="text-5xl font-light text-[#002D72]">
              Maturity Assessment Dashboard
            </h2>
          </div>
          <p className="text-lg text-[#4A4A4A]">
            Your organizational maturity assessment results and strategic insights
          </p>
        </div>

        {/* Main Layout: Left Column (2 boxes) + Right Column (1 large box) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Overall Maturity Score */}
            <Card className="bg-white rounded-2xl shadow-md px-8 py-8 space-y-5 p-8 scroll-animate gradient-border-hover">
              {pulseMetrics.map((metric, index) => (
                <div key={index} className="space-y-6">
                  <h3 className="text-2xl font-light text-[#002D72]">Overall Maturity Score</h3>
                  <div className="space-y-4">
                    <p className="text-sm text-[#4A4A4A]">{metric.title}</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-light text-[#002D72]">
                        {metric.value}
                      </span>
                      <span className="text-xl text-[#4A4A4A]">
                        / {metric.max}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            {/* EVORA's Model */}
            <Card className="bg-white rounded-2xl shadow-md px-8 py-8 space-y-5 p-8 scroll-animate gradient-border-hover">
              <h3 className="text-2xl font-light text-[#002D72] mb-6">EVORA's Model</h3>
              <div className="w-full">
                <OnionPeel score={overallScore} />
              </div>
            </Card>
          </div>

          {/* Right Column - Category Performance Analysis */}
          <div>
            <Card className="bg-white rounded-2xl shadow-md px-8 py-8 space-y-5 p-8 h-full scroll-animate gradient-border-hover">
              <div className="space-y-6 h-full flex flex-col">
                <div>
                  <h3 className="text-2xl font-light text-[#002D72]">
                    Category Performance Analysis
                  </h3>
                  <p className="text-sm text-[#4A4A4A] mt-2">
                    Your organization's maturity across key categories
                  </p>
                </div>
                <div className="flex-1 min-h-[350px]">
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
                      <RadarChart data={radarData} margin={{ top: 30, right: 80, bottom: 30, left: 80 }}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis
                          dataKey="category"
                          tick={{ fill: "#4A4A4A", fontSize: 11 }}
                        />
                        <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: "#4A4A4A" }} />
                        <Tooltip
                          content={<CustomRadarTooltip />}
                          cursor={{ stroke: "#002D72", strokeWidth: 2 }}
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
        <div className="space-y-6 scroll-animate">
          <div className="space-y-2">
            <h3 className="text-4xl font-light text-[#002D72]">
              Organizational Health & Sentiment
            </h3>
            <p className="text-lg text-[#4A4A4A]">
              Employee well-being and engagement metrics
            </p>
          </div> 

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-full scroll-animate">
              <HappinessChart />
            </div>
            {/* eNPS Score Card */}
            <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow card-hover gradient-border-hover scroll-animate-right">
              <h4 className="text-xl font-medium mb-4 text-[#002D72]">Employee Net Promoter Score (eNPS)</h4>
              <div className="flex flex-col items-center">
                {/* Donut Chart */}
                <div className="relative w-26 h-26 mb-3">
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
                    <span className="text-4xl font-light text-[#4A4A4A]">50</span>
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
        
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}