import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import {
  Users,
  Target,
  Zap,
  Workflow,
  UserCheck,
  TrendingUp,
  Cpu,
  GraduationCap,
  Globe,
  Lightbulb,
  ArrowRight,
  ClipboardCheck,
  ListChecks,
  ArrowUpDown,
  FileEdit,
  BarChart3,
  Gauge,
  ScanSearch,
  GitMergeIcon,
  Share2,
  PieChart,
  Network,
  Database,
  Check,
  BarChart3Icon,
  ShieldCheck,
  RefreshCcw,
  MessageCircle,
} from "lucide-react";
import { Footer } from "../components/Footer";
import { HeroBackground } from "../components/HeroBackground";
import logo from "../assets/HARTS Consulting LBG.png";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import LeadershipIcon from "../assets/icons/strategic leadership.svg?react";
import CultureIcon from "../assets/icons/Culture.svg?react";
import GovernanceIcon from "../assets/icons/Governance.svg?react";
import LeadershipCapabilityIcon from "../assets/icons/leadershipcapability.svg?react";
import ChangeAgilityIcon from "../assets/icons/Changeagility.svg?react";
import PerformanceIcon from "../assets/icons/Performance.svg?react";
import CommunicationIcon from "../assets/icons/communication.svg?react";
import ProgressIcon from "../assets/icons/progress.svg?react";

const categories = [
  {
    icon: LeadershipIcon, // Strategic leadership often involves people/teams
    name: "Strategic Leadership and Vision",
    color: "#002D72",
    description:
      "Provides direction and foresight to ensure organizational goals are clearly defined and pursued with focus."
  },
  {
    icon: CultureIcon, // Culture integration = protection, alignment
    name: "Culture Integration",
    color: "#008489",
    description:
      "Aligns organizational values, behaviors, and practices to create a unified and high-performing culture."
  },
  {
    icon: GovernanceIcon, // Governance & decision = focus, precision
    name: "Governance and Decision Making",
    color: "#002D72",
    description:
      "Ensures effective decision-making processes, accountability structures, and oversight mechanisms."
  },
  {
    icon: LeadershipCapabilityIcon, // Leadership capability = developing people
    name: "Leadership Capability and Succession",
    color: "#008489",
    description:
      "Builds and prepares future leaders through development programs, mentoring, and succession planning."
  },
  {
    icon: ChangeAgilityIcon, // Change agility = flexibility, adapting
    name: "Change Agility",
    color: "#002D72",
    description:
      "Enables the organization to adapt quickly to changing circumstances with flexibility and resilience."
  },
  {
    icon: CommunicationIcon, // Communication & engagement = messages, interaction
    name: "Communication and Engagement",
    color: "#008489",
    description:
      "Fosters transparent, consistent, and motivating communication across all levels of the organization."
  },
  {
    icon: PerformanceIcon, // Performance & accountability = metrics, growth
    name: "Performance and Accountability",
    color: "#002D72",
    description:
      "Drives results by measuring outcomes, tracking progress, and holding teams accountable to goals."
  },
  {
    icon: ProgressIcon, // Growth & progress = learning, skill development
    name: "Growth and Progress",
    color: "#008489",
    description:
      "Encourages continuous learning, skill development, and organizational improvement for sustainable growth."
  },
];


const maturityStages = [
  { stage: 1, name: "Foundation", description: "Building core capabilities" },
  { stage: 2, name: "Emerging", description: "Establishing patterns" },
  { stage: 3, name: "Developing", description: "Standardizing practices" },
  { stage: 4, name: "Maturing", description: "Optimizing performance" },
  { stage: 5, name: "Leading", description: "Driving innovation" },
];

export default function Home() {
  const navigate = useNavigate();
  useScrollAnimation();

  return (
    <div className="min-h-screen bg-white">
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
                onClick={() => navigate("/instructions")}
                className="text-[#4A4A4A] hover:text-[#002D72]"
              >
                Take Survey
              </Button>
              {/* <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-[#4A4A4A] hover:text-[#002D72]"
              >
                Dashboard
              </Button> */}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 scroll-animate overflow-hidden">
        <HeroBackground />
        <div className="max-w-7xl mx-auto text-center space-y-6 relative z-10">
          <h2 className="text-5xl md:text-6xl font-light text-[#002D72]">
            Measure, Improve, Transform
          </h2>
          <p className="text-xl text-[#4A4A4A] max-w-3xl mx-auto">
            A data-driven framework to evolve your organizational maturity.
          </p>
          <div className="pt-4">
            <Button
              onClick={() => navigate("/instructions")}
              className="h-14 px-12 text-lg bg-[#008489] hover:bg-[#006b6f] text-white shadow-lg hover:shadow-xl transition-shadow"
            >
              Start Assessment
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1: What is OMA? */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F5F7FA] scroll-animate scroll-delay-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Image */}
            <div className="order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-xl img-zoom">
                <img
                  src="/what is oma.png"
                  alt="Abstract Structure"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#002D72]/20 to-[#008489]/20" />
              </div>
            </div>

            {/* Right Side - Content */}
            <div className="order-1 lg:order-2 space-y-6">
              <h3 className="text-4xl font-light text-[#002D72]">
                What is OMA?
              </h3>
              <p className="text-lg text-[#4A4A4A] leading-relaxed">
                The Organizational Maturity Assessment (OMA) is a diagnostic framework
                designed to quantify operational health and identify strategic gaps.
              </p>
              <p className="text-lg text-[#4A4A4A] leading-relaxed">
                Built on decades of consulting experience, OMA provides a structured
                approach to understanding your organization's current state across eight
                critical dimensions. It transforms subjective observations into objective
                metrics, enabling data-driven decision-making and strategic planning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Why OMA? */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white scroll-animate scroll-delay-100">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h3 className="text-4xl font-light text-[#002D72]">
              Why Business Leaders Choose OMA
            </h3>
            <p className="text-lg text-[#4A4A4A] max-w-2xl mx-auto">
              Transform complexity into clarity with enterprise-grade insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Benchmarking Card */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 space-y-4 card-hover gradient-border-hover">
              <div className="w-14 h-14 rounded-full bg-[#008489]/10 flex items-center justify-center">
                <Globe className="w-7 h-7 text-[#008489]" />
              </div>
              <h4 className="text-xl font-medium text-[#002D72]">
                Benchmarking
              </h4>
              <p className="text-[#4A4A4A] leading-relaxed">
                Compare your performance against top-tier industry standards.
              </p>
            </div>

            {/* Clarity Card */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 space-y-4 card-hover gradient-border-hover">
              <div className="w-14 h-14 rounded-full bg-[#008489]/10 flex items-center justify-center">
                <Lightbulb className="w-7 h-7 text-[#008489]" />
              </div>
              <h4 className="text-xl font-medium text-[#002D72]">
                Clarity
              </h4>
              <p className="text-[#4A4A4A] leading-relaxed">
                Transform ambiguous pain points into data-driven insights.
              </p>
            </div>

            {/* Roadmap Card */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 space-y-4 card-hover gradient-border-hover">
              <div className="w-14 h-14 rounded-full bg-[#008489]/10 flex items-center justify-center">
                <ArrowRight className="w-7 h-7 text-[#008489]" />
              </div>
              <h4 className="text-xl font-medium text-[#002D72]">
                Roadmap
              </h4>
              <p className="text-[#4A4A4A] leading-relaxed">
                Generate a prioritized action plan for immediate ROI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: How OMA Works */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-[#F7F9FC] scroll-animate scroll-delay-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h3 className="text-4xl font-light text-[#002D72]">
              How OMA Works
            </h3>
            <p className="text-lg text-[#6B7280] max-w-xl mx-auto leading-relaxed">
              A comprehensive diagnostic journey designed for precision and clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">

            {/* Left Column: Interactive Questions */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8 lg:p-10 space-y-7 gradient-border-hover">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#002D72] flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold text-[#002D72] leading-tight">The Interactive Assessment</h4>
                </div>
                <p className="text-[#6B7280] leading-relaxed text-sm pl-0">
                  OMA uses interactive question formats to capture your organizational landscape:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Check, title: "Single Choice", desc: "Best-fit response for clear baseline data" },
                  { icon: ListChecks, title: "Multi-Choice", desc: "Identify overlapping organizational factors" },
                  { icon: ArrowUpDown, title: "Rearrange", desc: "Rank priorities via drag-and-drop ordering" },
                  { icon: FileEdit, title: "Fill in the Blanks", desc: "Contextual data for qualitative depth" },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <div key={i} className="group flex items-center gap-4 p-4 rounded-xl bg-[#F7F9FC] border border-transparent hover:border-[#008489]/20 hover:bg-white hover:shadow-sm transition-all duration-200">
                    <div className="w-9 h-9 rounded-lg bg-[#008489]/10 flex items-center justify-center shrink-0 group-hover:bg-[#008489]/15 transition-colors">
                      <Icon className="w-4.5 h-4.5 text-[#008489]" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h5 className="font-semibold text-[#002D72] text-sm">{title}</h5>
                      <p className="text-xs text-[#6B7280] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Data-Driven Evaluation */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8 lg:p-10 space-y-7 gradient-border-hover">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#002D72] flex items-center justify-center flex-shrink-0">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold text-[#002D72] leading-tight">Data Driven Evaluation</h4>
                </div>
                <p className="text-[#6B7280] leading-relaxed text-sm pl-0">
                  Every response is processed through our{" "}
                  <span className="text-[#008489] font-semibold">Proprietary Scoring Engine</span>{" "}
                  {/* with weighted logic and cross-category correlation. */}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: BarChart3Icon, title: "Benchmark", desc: "Compare against industry maturity levels" },
                  { icon: ScanSearch, title: "Identify", desc: "Surface hidden strategic bottlenecks" },
                  { icon: Network, title: "Correlate", desc: "Operational data with cultural performance" },
                  { icon: PieChart, title: "Visualize", desc: "Real-time transformation roadmaps" },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <div key={i} className="group flex items-center gap-4 p-4 rounded-xl bg-[#F7F9FC] border border-transparent hover:border-[#008489]/20 hover:bg-white hover:shadow-sm transition-all duration-200">
                    <div className="w-9 h-9 rounded-lg bg-[#008489]/10 flex items-center justify-center shrink-0 group-hover:bg-[#008489]/15 transition-colors">
                      <Icon className="w-4.5 h-4.5 text-[#008489]" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h5 className="font-semibold text-[#002D72] text-sm">{title}</h5>
                      <p className="text-xs text-[#6B7280] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white scroll-animate scroll-delay-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-light text-[#002D72] mb-3">
              8 OMA Categories
            </h3>
            <p className="text-[#4A4A4A]">
              Comprehensive assessment across all dimensions of organizational excellence
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {categories.map(({ icon: Icon, name, color,description }, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center space-y-4 p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow card-hover gradient-border-hover"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="w-12 h-12 translate-y-1" style={{ color }} />
                </div>

                <h4 className="font-medium text-[#002D72]">{name}</h4>

                <p className="text-sm text-[#4A4A4A] leading-relaxed">
                  {description}
                </p>
              </div>
              
            ))}
          </div>
        </div>
      </section>

      {/* Maturity Timeline */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#F7F9FC] scroll-animate scroll-delay-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-light text-[#002D72] mb-3">
              Your Organizational Growth Journey
            </h3>
            <p className="text-[#4A4A4A]">
              Every organization is on a unique path to excellence - discover your next milestone
            </p>
          </div>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-[#002D72] via-[#008489] to-[#002D72]" />

            {/* Timeline Items */}
            <div className="relative grid grid-cols-1 md:grid-cols-5 gap-8">
              {maturityStages.map((stage, index) => (
                <div key={index} className="flex flex-col items-center text-center space-y-3">
                  <div
                    className="w-16 h-16 rounded-full bg-white border-4 flex items-center justify-center z-10"
                    style={{ borderColor: index % 2 === 0 ? "#002D72" : "#008489" }}
                  >
                    <span
                      className="text-2xl font-light"
                      style={{ color: index % 2 === 0 ? "#002D72" : "#008489" }}
                    >
                      {stage.stage}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium text-[#002D72]">{stage.name}</h4>
                    <p className="text-sm text-[#4A4A4A]">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#002D72] scroll-animate scroll-delay-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h3 className="text-4xl font-light text-white">
            Ready to transform your organization?
          </h3>
          <p className="text-xl text-white/80">
            Begin your assessment journey today and unlock actionable insights.
          </p>
          <Button
            onClick={() => navigate("/instructions")}
            className="h-14 px-12 text-lg bg-[#008489] hover:bg-[#006b6f] text-white"
          >
            Begin Assessment
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}