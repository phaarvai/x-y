"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Save } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";
import { isLegalProviderRole, LEGAL_PROVIDER_ROLES, PROVIDER_TYPE_LABELS } from "@/lib/legal-constants";

type Provider = {
  id: number;
  providerType: string;
  businessName: string;
  displayName: string;
  bio: string | null;
  yearsExperience: number | null;
  qualifications: string | null;
  licenses: string | null;
  certifications: string | null;
  serviceCategories: string | null;
  languages: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  serviceRadius: number | null;
  pricingType: string | null;
  hourlyRate: string | null;
  fixedPrice: string | null;
  currency: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  profileImage: string | null;
  credentialsUrl: string | null;
  isPublished: boolean;
};

const emptyForm = {
  providerType: "LEGAL_WRITER",
  businessName: "",
  displayName: "",
  bio: "",
  yearsExperience: "0",
  qualifications: "",
  licenses: "",
  certifications: "",
  serviceCategories: "",
  languages: "English",
  location: "",
  city: "",
  state: "",
  country: "India",
  serviceRadius: "",
  pricingType: "HOURLY",
  hourlyRate: "",
  fixedPrice: "",
  currency: "INR",
  email: "",
  phone: "",
  website: "",
  linkedin: "",
  profileImage: "",
  credentialsUrl: "",
};

export default function LegalDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);

  const { data, isLoading } = useQuery<{ items: Provider[] }>({
    queryKey: ["my-legal-provider"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/legal-providers?mine=true"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load profile");
      return res.json();
    },
  });

  const provider = data?.items?.[0] ?? null;

  useEffect(() => {
    if (!provider) return;
    setForm({
      providerType: provider.providerType,
      businessName: provider.businessName || "",
      displayName: provider.displayName || "",
      bio: provider.bio || "",
      yearsExperience: String(provider.yearsExperience ?? 0),
      qualifications: provider.qualifications || "",
      licenses: provider.licenses || "",
      certifications: provider.certifications || "",
      serviceCategories: provider.serviceCategories || "",
      languages: provider.languages || "",
      location: provider.location || "",
      city: provider.city || "",
      state: provider.state || "",
      country: provider.country || "",
      serviceRadius: provider.serviceRadius != null ? String(provider.serviceRadius) : "",
      pricingType: provider.pricingType || "HOURLY",
      hourlyRate: provider.hourlyRate || "",
      fixedPrice: provider.fixedPrice || "",
      currency: provider.currency || "INR",
      email: provider.email || "",
      phone: provider.phone || "",
      website: provider.website || "",
      linkedin: provider.linkedin || "",
      profileImage: provider.profileImage || "",
      credentialsUrl: provider.credentialsUrl || "",
    });
  }, [provider]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        providerType: form.providerType,
        businessName: form.businessName.trim(),
        displayName: form.displayName.trim(),
        bio: form.bio || null,
        yearsExperience: parseInt(form.yearsExperience || "0", 10) || 0,
        qualifications: form.qualifications || null,
        licenses: form.licenses || null,
        certifications: form.certifications || null,
        serviceCategories: form.serviceCategories || null,
        languages: form.languages || null,
        location: form.location || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        serviceRadius: form.serviceRadius ? parseInt(form.serviceRadius, 10) : null,
        pricingType: form.pricingType,
        hourlyRate: form.hourlyRate || null,
        fixedPrice: form.fixedPrice || null,
        currency: form.currency || "INR",
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        linkedin: form.linkedin || null,
        profileImage: form.profileImage || null,
        credentialsUrl: form.credentialsUrl || null,
      };
      const url = provider ? `/api/legal-providers/${provider.id}` : "/api/legal-providers";
      const method = provider ? "PUT" : "POST";
      const res = await fetch(apiUrl(url), {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Save failed");
      return body;
    },
    onSuccess: () => {
      setMessage(provider ? "Profile updated." : "Profile created.");
      setError(null);
      qc.invalidateQueries({ queryKey: ["my-legal-provider"] });
    },
    onError: (e: Error) => {
      setError(e.message);
      setMessage(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!provider) throw new Error("Save profile first");
      const res = await fetch(apiUrl(`/api/legal-providers/${provider.id}/${publish ? "publish" : "unpublish"}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Publish failed");
      return body;
    },
    onSuccess: (_d, publish) => {
      setMessage(publish ? "Profile published." : "Profile unpublished.");
      setError(null);
      qc.invalidateQueries({ queryKey: ["my-legal-provider"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const setRole = async (primaryRole: string) => {
    setRoleSaving(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/me/role"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ primaryRole }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not set role");
      qc.invalidateQueries({ queryKey: ["me"] });
      setMessage(`Role set to ${PROVIDER_TYPE_LABELS[primaryRole] ?? primaryRole}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRoleSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF]">
        <Navbar />
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFF]">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Sign in required</h1>
          <p className="text-gray-500 mb-6 text-sm">Create or manage a legal service provider profile.</p>
          <Link href="/login"><Button className="bg-blue-600 text-white">Sign In</Button></Link>
        </div>
      </div>
    );
  }

  const hasLegalRole = isLegalProviderRole(user?.primaryRole) || user?.primaryRole === "PLATFORM_ADMIN";

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Legal Provider Dashboard</h1>
            <p className="text-sm text-gray-500">Create, edit, and publish your professional profile.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/legal"><Button variant="outline" size="sm">Search</Button></Link>
            {provider && (
              <Link href={`/legal/${provider.id}`}><Button variant="outline" size="sm" className="gap-1"><Eye className="w-3.5 h-3.5" /> Preview</Button></Link>
            )}
          </div>
        </div>

        {!hasLegalRole && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900 font-medium mb-2">Select a legal provider role to create a profile</p>
            <div className="flex flex-wrap gap-2">
              {LEGAL_PROVIDER_ROLES.map((r) => (
                <Button key={r} size="sm" variant="outline" disabled={roleSaving} onClick={() => setRole(r)}>
                  {PROVIDER_TYPE_LABELS[r]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {message && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 text-sm px-3 py-2">{message}</div>}
        {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

        {isLoading ? (
          <div className="h-40 rounded-xl bg-white border animate-pulse" />
        ) : (
          <form
            className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.businessName.trim() || !form.displayName.trim()) {
                setError("Business name and display name are required.");
                return;
              }
              saveMutation.mutate();
            }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-gray-500">
                Status:{" "}
                <span className={provider?.isPublished ? "text-emerald-700 font-medium" : "text-gray-700 font-medium"}>
                  {provider ? (provider.isPublished ? "Published" : "Draft") : "Not created"}
                </span>
              </p>
              {provider && (
                <div className="flex gap-2">
                  {!provider.isPublished ? (
                    <Button type="button" size="sm" className="bg-blue-600 text-white" onClick={() => publishMutation.mutate(true)} disabled={publishMutation.isPending}>Publish</Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" onClick={() => publishMutation.mutate(false)} disabled={publishMutation.isPending}>Unpublish</Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Provider type">
                <Select value={form.providerType} onValueChange={(v) => setForm((f) => ({ ...f, providerType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEGAL_PROVIDER_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{PROVIDER_TYPE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Years experience">
                <Input type="number" min={0} value={form.yearsExperience} onChange={(e) => setForm((f) => ({ ...f, yearsExperience: e.target.value }))} />
              </Field>
              <Field label="Business name *">
                <Input value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} required />
              </Field>
              <Field label="Display name *">
                <Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} required />
              </Field>
            </div>

            <Field label="Bio">
              <Textarea rows={4} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Qualifications"><Textarea rows={2} value={form.qualifications} onChange={(e) => setForm((f) => ({ ...f, qualifications: e.target.value }))} /></Field>
              <Field label="Licenses"><Textarea rows={2} value={form.licenses} onChange={(e) => setForm((f) => ({ ...f, licenses: e.target.value }))} /></Field>
              <Field label="Certifications"><Textarea rows={2} value={form.certifications} onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))} /></Field>
              <Field label="Service categories"><Input value={form.serviceCategories} onChange={(e) => setForm((f) => ({ ...f, serviceCategories: e.target.value }))} placeholder="NDA, Contracts, Tax..." /></Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Languages"><Input value={form.languages} onChange={(e) => setForm((f) => ({ ...f, languages: e.target.value }))} /></Field>
              <Field label="City"><Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></Field>
              <Field label="State"><Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} /></Field>
              <Field label="Country"><Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} /></Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Pricing type">
                <Select value={form.pricingType} onValueChange={(v) => setForm((f) => ({ ...f, pricingType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOURLY">Hourly</SelectItem>
                    <SelectItem value="FIXED">Fixed</SelectItem>
                    <SelectItem value="HYBRID">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Hourly rate"><Input value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} /></Field>
              <Field label="Fixed price"><Input value={form.fixedPrice} onChange={(e) => setForm((f) => ({ ...f, fixedPrice: e.target.value }))} /></Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
              <Field label="Website"><Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></Field>
              <Field label="LinkedIn"><Input value={form.linkedin} onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))} /></Field>
              <Field label="Profile photo URL"><Input value={form.profileImage} onChange={(e) => setForm((f) => ({ ...f, profileImage: e.target.value }))} placeholder="https://..." /></Field>
              <Field label="Credentials document URL"><Input value={form.credentialsUrl} onChange={(e) => setForm((f) => ({ ...f, credentialsUrl: e.target.value }))} placeholder="https://... (pdf/image)" /></Field>
            </div>

            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2" disabled={!hasLegalRole || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {provider ? "Save changes" : "Create profile"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-500">{label}</Label>
      {children}
    </div>
  );
}
