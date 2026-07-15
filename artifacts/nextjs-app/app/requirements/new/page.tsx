"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import XiyLogo from "@/components/XiyLogo";
import { apiUrl } from "@/lib/api-url";
import { useAuthContext } from "@/hooks/use-auth";
import { FormField } from "@/components/ui/form-field";
import { useDraftAutosave } from "@/hooks/use-draft-autosave";
import { useEffect } from "react";

function RequirementForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuthContext();
  const [form, setForm] = useState({
    title: "",
    description: "",
    industry: "",
    category: "",
    city: "",
    country: "",
    budgetMin: "",
    budgetMax: "",
    materialSpecs: "",
    isConfidential: false,
    requiredMachinery: "",
    requiredLabor: "",
    requiredMaterials: "",
    requiredLogistics: "",
    requiredLegal: "",
    timelineNotes: "",
  });

  const draft = useDraftAutosave({ key: "xiy:requirement-draft", value: form });
  useEffect(() => {
    const saved = draft.loadDraft();
    if (saved && typeof saved === "object") setForm((p) => ({ ...p, ...saved }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutation = useMutation({
    mutationFn: async (status: "DRAFT" | "PUBLISHED") => {
      const res = await fetch(apiUrl("/api/requirements"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, status }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => {
      draft.clearDraft();
      toast({ title: "Requirement saved" });
      router.push("/dashboard/visionary");
    },
    onError: (e: { error?: string }) => toast({ title: "Failed", description: e?.error, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="bg-white border-b h-14 flex items-center px-6"><Link href="/"><XiyLogo size="sm" /></Link></header>
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="flex items-end justify-between mb-6 gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Create Manufacturing Requirement</h1>
          <span className="text-xs text-gray-400" aria-live="polite">
            {draft.status === "saving" ? "Saving draft…" : draft.status === "saved" ? "Draft saved locally" : ""}
          </span>
        </div>
        <div className="bg-white rounded-xl border p-6 space-y-4 shadow-sm">
          <FormField id="req-title" label="Title" required description="Short name for manufacturers to understand your need" counter={{ value: form.title.length, max: 255 }}>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} maxLength={255} />
          </FormField>
          <FormField id="req-desc" label="Description" hint="Need CNC capacity for 500 aluminum housings in Q3" counter={{ value: form.description.length, max: 5000 }}>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} maxLength={5000} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} /></div>
            <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Budget Min</Label><Input value={form.budgetMin} onChange={(e) => setForm((p) => ({ ...p, budgetMin: e.target.value }))} /></div>
            <div><Label>Budget Max</Label><Input value={form.budgetMax} onChange={(e) => setForm((p) => ({ ...p, budgetMax: e.target.value }))} /></div>
          </div>
          <div><Label>Material Specs</Label><Textarea rows={2} value={form.materialSpecs} onChange={(e) => setForm((p) => ({ ...p, materialSpecs: e.target.value }))} /></div>
          <div><Label>Timeline notes</Label><Textarea rows={2} value={form.timelineNotes} onChange={(e) => setForm((p) => ({ ...p, timelineNotes: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Required machinery</Label><Textarea rows={2} value={form.requiredMachinery} onChange={(e) => setForm((p) => ({ ...p, requiredMachinery: e.target.value }))} /></div>
            <div><Label>Required labor</Label><Textarea rows={2} value={form.requiredLabor} onChange={(e) => setForm((p) => ({ ...p, requiredLabor: e.target.value }))} /></div>
            <div><Label>Required materials</Label><Textarea rows={2} value={form.requiredMaterials} onChange={(e) => setForm((p) => ({ ...p, requiredMaterials: e.target.value }))} /></div>
            <div><Label>Required logistics</Label><Textarea rows={2} value={form.requiredLogistics} onChange={(e) => setForm((p) => ({ ...p, requiredLogistics: e.target.value }))} /></div>
          </div>
          <div><Label>Required legal</Label><Textarea rows={2} value={form.requiredLegal} onChange={(e) => setForm((p) => ({ ...p, requiredLegal: e.target.value }))} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isConfidential}
              onChange={(e) => setForm((p) => ({ ...p, isConfidential: e.target.checked }))}
            />
            Mark requirement as confidential
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => mutation.mutate("DRAFT")} disabled={!form.title}>Save Draft</Button>
            <Button className="bg-blue-600 text-white" onClick={() => mutation.mutate("PUBLISHED")} disabled={!form.title}>Publish Requirement</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewRequirementPage() {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["VISIONARY"]}>
        <RequirementForm />
      </RoleGuard>
    </ProtectedRoute>
  );
}
