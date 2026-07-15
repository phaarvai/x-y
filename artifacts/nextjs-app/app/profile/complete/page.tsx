"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthContext } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";
import XiyLogo from "@/components/XiyLogo";

function ProfileForm() {
  const { token } = useAuthContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    phone: "",
    organization: "",
    industry: "",
    location: "",
    bio: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/auth/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Profile updated", description: `${data.profileCompletion}% complete` });
      if (data.profileStatus === "ACTIVE") {
        router.push(user?.primaryRole === "MANUFACTURER" ? "/provider-setup" : "/dashboard/visionary");
      }
    },
    onError: (e: { error?: string }) => toast({ title: "Failed", description: e?.error, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="bg-white border-b h-14 flex items-center px-6"><Link href="/"><XiyLogo size="sm" /></Link></header>
      <div className="max-w-lg mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6">Complete Your Profile</h1>
        <div className="bg-white rounded-xl border p-6 space-y-4 shadow-sm">
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
          <div><Label>Organization</Label><Input value={form.organization} onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))} /></div>
          <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} /></div>
          <div><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} /></div>
          <Button className="w-full bg-blue-600 text-white" onClick={() => save.mutate()}>Save & Continue</Button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileCompletePage() {
  return (
    <ProtectedRoute>
      <ProfileForm />
    </ProtectedRoute>
  );
}
