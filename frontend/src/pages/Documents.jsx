import { useEffect, useState } from "react";
import client, { fileUrl } from "../api/client";

const DOC_TYPES = [
  { key: "photograph", label: "Photograph", hint: "Recent passport-size photo (JPG/PNG)" },
  { key: "signature", label: "Signature", hint: "Scanned signature on white background" },
  { key: "id_proof", label: "ID proof", hint: "Aadhaar card, passport, or school ID" },
];

export default function Documents() {
  const [app, setApp] = useState(null);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState("");

  const load = () => client.get("/api/application").then((res) => setApp(res.data));

  useEffect(() => {
    load().catch(() => setMessage({ type: "error", text: "Could not load your documents." }));
  }, []);

  const locked = app && (app.status === "submitted" || app.status === "approved");

  const handleUpload = async (docType, file) => {
    if (!file) return;
    setUploading(docType);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await client.post(`/api/documents/upload?doc_type=${docType}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await load();
      setMessage({ type: "success", text: "Document uploaded." });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Upload failed." });
    } finally {
      setUploading("");
    }
  };

  if (!app) return <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-teal)] mb-1">REQUIRED DOCUMENTS</p>
      <h1 className="font-display text-3xl mb-8">Document upload</h1>

      {message && (
        <div
          className="mb-6 text-sm px-3 py-2 rounded"
          style={{
            background: message.type === "error" ? "var(--color-red-light)" : "var(--color-green-light)",
            color: message.type === "error" ? "var(--color-red)" : "var(--color-green)",
          }}
        >
          {message.text}
        </div>
      )}

      {locked && (
        <div className="mb-6 text-sm px-3 py-2 rounded" style={{ background: "var(--color-amber-light)", color: "var(--color-amber)" }}>
          Your application has already been submitted, so documents are locked.
        </div>
      )}

      <div className="space-y-4">
        {DOC_TYPES.map((docType) => {
          const uploaded = app.documents.find((d) => d.doc_type === docType.key);
          return (
            <div key={docType.key} className="doc-card p-5 flex items-center gap-5 flex-wrap">
              <div className="w-20 h-20 rounded border flex items-center justify-center overflow-hidden bg-gray-50 shrink-0" style={{ borderColor: "var(--color-line)" }}>
                {uploaded ? (
                  <img src={fileUrl(uploaded.file_path)} alt={docType.label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">No file</span>
                )}
              </div>
              <div className="flex-1 min-w-[180px]">
                <h3 className="font-semibold">{docType.label}</h3>
                <p className="text-xs text-gray-500">{docType.hint}</p>
              </div>
              {!locked && (
                <label className={`btn btn-outline text-sm ${uploading === docType.key ? "opacity-60" : ""}`}>
                  {uploading === docType.key ? "Uploading…" : uploaded ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(docType.key, e.target.files[0])}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
