"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function NoteDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      const res = await fetch(`/api/notes/${id}`);
      const data = await res.json();
      if (data.success) {
        setTitle(data.data.title);
        setContent(data.data.content);
        editor?.commands.setContent(data.data.content || "");
      }
      setLoading(false);
    };
    fetchNote();
  }, [id]);

  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!loading) {
      setSaving(true);
      const timeout = setTimeout(async () => {
        await fetch(`/api/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        setSaving(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [title, content, id, loading]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    setDeleting(true);
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setDeleting(false);
    router.push("/notebook");
  }, [id, router]);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold ml-2 flex-1">Edit Note</h1>
        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="h-5 w-5 mr-1" /> Delete
        </Button>
      </div>
      <input
        className="w-full border rounded px-3 py-2 mb-4 text-lg font-semibold"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <div className="mb-4 border border-gray-300 rounded bg-white min-h-[200px] shadow-sm">
        <EditorContent 
          editor={editor} 
          className="min-h-[200px] p-4 outline-none border-none focus:outline-none focus:border-none focus:ring-0"
          style={{ boxShadow: 'none', background: 'white', border: 'none' }}
        />
      </div>
      <div className="text-xs text-gray-400 text-right">{saving ? "Saving..." : "All changes saved"}</div>
    </div>
  );
} 