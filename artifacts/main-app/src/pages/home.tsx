import { Link, useLocation } from "wouter";
import { Sparkles, CalendarDays, TrendingUp, Globe, Factory, Lightbulb, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const STEPS = [
  { icon: <Sparkles className="w-7 h-7 text-violet-500" />, bg: "bg-violet-100", title: "Get AI-Powered Guidance", desc: "Describe your idea to our AI assistant and receive a complete manufacturing plan with layered processes, material recommendations, and cost estimates." },
  { icon: <CalendarDays className="w-7 h-7 text-blue-500" />, bg: "bg-blue-100", title: "Browse & Book Instantly", desc: "View real-time availability, compare prices, and book manufacturing time slots instantly - just like booking a hotel room." },
  { icon: <TrendingUp className="w-7 h-7 text-emerald-500" />, bg: "bg-emerald-100", title: "Manufacture & Scale", desc: "Arrive at your booked time, manufacture your products with verified partners, and scale your operations seamlessly." },
];

const STAKEHOLDERS = [
  { icon: <Factory className="w-7 h-7 text-blue-600" />, title: "Manufacturers", desc: "List your machinery, manage capacity, and connect with product innovators worldwide." },
  { icon: <Lightbulb className="w-7 h-7 text-blue-600" />, title: "Visionaries", desc: "Turn your ideas into products by accessing manufacturing capabilities instantly." },
  { icon: <TrendingUp className="w-7 h-7 text-blue-600" />, title: "Investors", desc: "Discover promising manufacturing projects and fund the next generation of products." },
  { icon: <Globe className="w-7 h-7 text-blue-600" />, title: "Supply Chain", desc: "Vendors, logistics partners, and suppliers can join the ecosystem seamlessly." },
];

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="bg-white">
      <Navbar />
      {/* Hero */}
      <section className="bg-[#F8FAFF] border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-5">
            Manufacturing made easy &amp; efficient
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            The Explorer Factory connects manufacturers, innovators, and investors on a single platform. Turn ideas into products faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-5">
            <Link href="/browse">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 h-12 rounded-lg gap-2 text-base shadow-sm">
                <CalendarDays className="w-5 h-5" />
                Find &amp; Book Now →
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-8 h-12 rounded-lg text-base" onClick={() => setLocation("/for-business")}>
              List Your Factory
            </Button>
          </div>
          <Link href="/ai-assistant">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 h-12 rounded-lg gap-2 text-base shadow-sm">
              <Sparkles className="w-5 h-5" />
              Try AI Manufacturing Assistant (Free)
            </Button>
          </Link>
        </div>
      </section>

      {/* How X!Y Works */}
      <section id="how-it-works" className="py-20 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-14">How X!Y Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map(s => (
              <div key={s.title} className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full ${s.bg} flex items-center justify-center mb-5`}>
                  {s.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="bg-gradient-to-br from-violet-600 via-blue-600 to-blue-700 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" /> AI-Powered Platform
              </div>
              <h2 className="text-4xl font-bold leading-tight mb-5">
                Turn Ideas into Reality with AI Guidance
              </h2>
              <p className="text-blue-100 text-base leading-relaxed mb-6">
                Not sure where to start? Our AI Assistant analyzes your product idea and creates a complete manufacturing roadmap with:
              </p>
              <ul className="space-y-3 mb-8">
                {["Layered manufacturing process breakdown", "Required machines and processes for each phase", "Material and product recommendations", "Cost estimates and timeline projections"].map(item => (
                  <li key={item} className="flex items-start gap-2 text-blue-100 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/ai-assistant">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold gap-2">
                  <Sparkles className="w-4 h-4" /> Try AI Assistant Free →
                </Button>
              </Link>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="bg-white rounded-xl p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">AI Assistant</p>
                    <p className="text-gray-400 text-xs">Analyzing your request...</p>
                  </div>
                </div>
                <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                  <p className="font-semibold text-gray-900 text-sm mb-2">Manufacturing Plan Generated</p>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li>• 4 manufacturing layers identified</li>
                    <li>• Estimated cost: $45,000 – $55,000</li>
                    <li>• Timeline: 7–10 weeks</li>
                    <li>• 12 required materials listed</li>
                  </ul>
                </div>
                <p className="text-center text-gray-400 text-xs mt-4">Real-time AI analysis of your manufacturing needs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholders */}
      <section className="py-20 bg-[#F8FAFF] border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">Built for Every Stakeholder</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STAKEHOLDERS.map(s => (
              <div key={s.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="mb-4">{s.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{s.desc}</p>
                <button className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  Learn more <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-bold text-white">X!Y</span>
              </div>
              <p className="text-gray-400 text-sm">The Explorer Factory</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/browse"><span className="hover:text-white cursor-pointer">Find Manufacturers</span></Link></li>
                <li><Link href="/for-business"><span className="hover:text-white cursor-pointer">List Your Factory</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><span className="hover:text-white cursor-pointer">Help Center</span></li>
                <li><span className="hover:text-white cursor-pointer">API Docs</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><span className="hover:text-white cursor-pointer">About</span></li>
                <li><span className="hover:text-white cursor-pointer">Contact</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-gray-500 text-sm">
            © 2026 X!Y – The Explorer Factory. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
