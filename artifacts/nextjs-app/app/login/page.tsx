"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/hooks/use-auth";
import XiyLogo from "@/components/XiyLogo";
import { apiUrl } from "@/lib/api-url";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthContext();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw err; }
      return res.json();
    },
    onSuccess: (res) => {
      login(res.token);
      toast({ title: "Welcome back!", description: `Signed in as ${res.user.name}` });
      router.push("/");
    },
    onError: (err: any) => {
      toast({ title: "Sign in failed", description: err?.error || "Invalid email or password", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title: "Fill in all fields", variant: "destructive" }); return; }
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] to-[#F0F9FF] flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex flex-col items-center"><XiyLogo size="lg" /></div>
      <h1 className="text-3xl font-bold text-gray-900 mb-1 text-center">Welcome Back</h1>
      <p className="text-gray-500 text-sm mb-8 text-center">Sign in to your account</p>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-5" aria-label="Sign in form">
          <div>
            <Label className="text-gray-700 font-medium text-sm mb-1.5 block">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type="email" placeholder="john@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="input-email" className="pl-10 h-11 border-gray-200 rounded-lg" />
            </div>
          </div>
          <div>
            <Label className="text-gray-700 font-medium text-sm mb-1.5 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type="password" placeholder="••••••••" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} data-testid="input-password" className="pl-10 h-11 border-gray-200 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={v => setRemember(!!v)} />
              <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">Remember me</label>
            </div>
            <button type="button" className="text-sm text-blue-600 font-medium hover:underline">Forgot password?</button>
          </div>
          <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg" disabled={loginMutation.isPending} data-testid="button-submit-login">
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline" data-testid="link-to-register">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
