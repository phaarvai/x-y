"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api-url";

type Category = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  categoryType: string;
  description: string | null;
  sortOrder: number;
  status: string;
  children?: Category[];
};

export default function AdminCategoriesPage() {
  const { token } = useAuthContext();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    categoryType: "PRODUCT",
    parentId: "",
    description: "",
    sortOrder: "0",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const query = useQuery<{ items: Category[] }>({
    queryKey: ["admin-categories"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/admin/categories"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        categoryType: form.categoryType,
        parentId: form.parentId ? parseInt(form.parentId, 10) : null,
        description: form.description || null,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };
      const url = editing
        ? apiUrl(`/api/admin/categories/${editing.id}`)
        : apiUrl("/api/admin/categories");
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Save failed");
      return body;
    },
    onSuccess: () => {
      setMsg(editing ? "Category updated." : "Category created.");
      setErr(null);
      setEditing(null);
      setCreating(false);
      setForm({ name: "", slug: "", categoryType: "PRODUCT", parentId: "", description: "", sortOrder: "0" });
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, restore }: { id: number; restore?: boolean }) => {
      const res = await fetch(apiUrl(`/api/admin/categories/${id}/${restore ? "restore" : "archive"}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      return body;
    },
    onSuccess: () => {
      setMsg("Category updated.");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (cat: Category) => {
    setEditing(cat);
    setCreating(false);
    setForm({
      name: cat.name,
      slug: cat.slug,
      categoryType: cat.categoryType,
      parentId: cat.parentId ? String(cat.parentId) : "",
      description: cat.description ?? "",
      sortOrder: String(cat.sortOrder),
    });
  };

  const renderTree = (items: Category[], depth = 0) =>
    items.map((cat) => (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 py-2 px-2 rounded hover:bg-slate-50"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {cat.children && cat.children.length > 0 ? (
            <button type="button" onClick={() => toggle(cat.id)} className="text-slate-400">
              {expanded.has(cat.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span className={`flex-1 text-sm ${cat.status === "ARCHIVED" ? "text-slate-400 line-through" : "text-slate-900"}`}>
            {cat.name}
            <span className="text-xs text-slate-400 ml-2">{cat.categoryType}</span>
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => startEdit(cat)}>Edit</Button>
            {cat.status === "ARCHIVED" ? (
              <Button size="sm" variant="ghost" onClick={() => archiveMutation.mutate({ id: cat.id, restore: true })}>Restore</Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => archiveMutation.mutate({ id: cat.id })}>Archive</Button>
            )}
          </div>
        </div>
        {cat.children && expanded.has(cat.id) && renderTree(cat.children, depth + 1)}
      </div>
    ));

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Manage category tree</p>
        </div>
        <Button size="sm" className="bg-teal-700 text-white" onClick={() => { setCreating(true); setEditing(null); setForm({ name: "", slug: "", categoryType: "PRODUCT", parentId: "", description: "", sortOrder: "0" }); }}>
          <Plus className="w-4 h-4 mr-1" /> New category
        </Button>
      </div>

      {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{msg}</div>}
      {err && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</div>}

      {(creating || editing) && (
        <form
          className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-2 gap-3"
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
        >
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input placeholder="Slug (optional)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <Select value={form.categoryType} onValueChange={(v) => setForm((f) => ({ ...f, categoryType: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["PRODUCT", "SERVICE", "INDUSTRY", "SKILL"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Parent ID (optional)" value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))} />
          <Textarea className="sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Input placeholder="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" className="bg-teal-700 text-white" disabled={saveMutation.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
          </div>
        </form>
      )}

      {query.isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-700" /></div>
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">No categories yet</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-2">
          {renderTree(query.data!.items)}
        </div>
      )}
    </div>
  );
}
