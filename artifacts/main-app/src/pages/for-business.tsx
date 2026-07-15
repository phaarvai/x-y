import { Link } from "wouter";
import { Factory, CheckCircle2, TrendingUp, Users, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function ForBusinessPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
            <Factory className="w-4 h-4" /> For Manufacturers
          </div>
          <h1 className="text-5xl font-extrabold mb-5">List Your Factory on X!Y</h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto mb-10">Connect with thousands of innovators and businesses looking for manufacturing capacity. Fill your production slots and grow your business.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8 h-12">Get Started Free</Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 h-12 px-8">Learn More</Button>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why List with X!Y?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <TrendingUp className="w-7 h-7 text-blue-500" />, title: "Fill Empty Slots", desc: "Monetize idle machine time by connecting with customers who need manufacturing capacity immediately." },
              { icon: <Users className="w-7 h-7 text-blue-500" />, title: "Global Reach", desc: "Access a network of 50,000+ innovators, startups, and enterprises looking for manufacturing partners." },
              { icon: <Star className="w-7 h-7 text-blue-500" />, title: "Build Reputation", desc: "Earn verified reviews and badges that help you stand out and win more business." },
            ].map(f => (
              <div key={f.title} className="text-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F8FAFF]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to grow your manufacturing business?</h2>
          <p className="text-gray-500 mb-8">Join 1,200+ manufacturers already on X!Y</p>
          <Link href="/register">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 h-12 gap-2">
              List Your Factory <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
