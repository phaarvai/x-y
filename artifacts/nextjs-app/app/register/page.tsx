"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Factory } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/hooks/use-auth";
import XiyLogo from "@/components/XiyLogo";
import { apiUrl } from "@/lib/api-url";

type AccountType = "buyer" | "manufacturer" | null;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthContext();
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; primaryRole?: string }) => {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, preferredLanguage: "en" }),
      });
      if (!res.ok) { const err = await res.json(); throw err; }
      return res.json();
    },
    onSuccess: (res) => {
      login(res.token);
      toast({ title: "Account created!", description: `Welcome to X!Y, ${res.user.name}!` });
      router.push("/profile/complete");
    },
    onError: (err: any) => {
      toast({ title: "Registration failed", description: err?.error || "Please try again.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast({ title: "Fill in all fields", variant: "destructive" }); return; }
    registerMutation.mutate({
      name,
      email,
      password,
      primaryRole: accountType === "manufacturer" ? "MANUFACTURER" : "VISIONARY",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] to-[#F0F9FF] flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex flex-col items-center"><XiyLogo size="lg" /></div>
      <h1 className="text-3xl font-bold text-gray-900 mb-1 text-center">Create Your Account</h1>
      <p className="text-gray-500 text-sm mb-8 text-center">Join the manufacturing revolution</p>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {step === 1 ? (
          <>
            <h2 className="font-bold text-gray-900 mb-5">Choose Account Type</h2>
            <div className="space-y-3">
              <button onClick={() => { setAccountType("buyer"); setStep(2); }} className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left group" data-testid="button-type-buyer">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors"><User className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">I need manufacturing services</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">Find manufacturers, book machines, and bring your ideas to life</p>
                </div>
              </button>
              <button onClick={() => { setAccountType("manufacturer"); setStep(2); }} className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-left group" data-testid="button-type-manufacturer">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors"><Factory className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">I provide manufacturing services</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">List your machines, set availability, and connect with customers</p>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">← Back</button>
            <h2 className="font-bold text-gray-900 mb-5">{accountType === "manufacturer" ? "List Your Factory" : "Create Your Account"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4" aria-label="Create account form">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="h-11 border-gray-200 rounded-lg" data-testid="input-name" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Email Address</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 border-gray-200 rounded-lg" data-testid="input-email" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" className="h-11 border-gray-200 rounded-lg" data-testid="input-password" />
              </div>
              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg" disabled={registerMutation.isPending} data-testid="button-submit-register">
                {registerMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </>
        )}
        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
