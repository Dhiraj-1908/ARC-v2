"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { ArrowLeft, Calendar, Globe, FileText, Download, ChevronDown, FileDown, Bookmark, BookmarkCheck, Loader2 } from "lucide-react";


interface SessionData {
  session: {
    id: string;
    topic: string;
    status: string;
    created_at: string;
    clarifications: { question: string; answer: string }[];
  };
  report: {
    content: string;
    word_count: number;
    token_used: number;
    iteration_count: number;
  } | null;
  sources: { id: string; url: string; title: string }[];
}

// ─── Download helpers ─────────────────────────────────────────────────────────

function slug(topic: string) {
  return topic.slice(0, 60).replace(/[^a-z0-9]/gi, "_");
}

function downloadMd(content: string, topic: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(topic)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDocx(content: string, topic: string, sources: { url: string; title: string }[], date: string) {
  // Generate an HTML file that Word opens natively (Word HTML format)
  // Convert basic markdown to HTML
  const lines = content.split("\n");
  let html = "";
  for (const line of lines) {
    if (line.startsWith("# ")) html += `<h1>${line.slice(2)}</h1>\n`;
    else if (line.startsWith("## ")) html += `<h2>${line.slice(3)}</h2>\n`;
    else if (line.startsWith("### ")) html += `<h3>${line.slice(4)}</h3>\n`;
    else if (line.startsWith("#### ")) html += `<h4>${line.slice(5)}</h4>\n`;
    else if (line.startsWith("- ") || line.startsWith("* ")) html += `<li>${line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>")}</li>\n`;
    else if (line.match(/^\d+\. /)) html += `<li>${line.replace(/^\d+\. /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>\n`;
    else if (line.startsWith("> ")) html += `<blockquote>${line.slice(2)}</blockquote>\n`;
    else if (line.startsWith("---") || line.startsWith("***")) html += `<hr/>\n`;
    else if (line.trim() === "") html += `<p>&nbsp;</p>\n`;
    else html += `<p>${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/`(.*?)`/g, "<code>$1</code>")}</p>\n`;
  }

  if (sources.length > 0) {
    html += `<h2>Sources</h2>\n<ul>\n`;
    for (const s of sources) html += `<li><a href="${s.url}">${s.url}</a></li>\n`;
    html += `</ul>\n`;
  }

  const wordDoc = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8"/>
  <title>${topic}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.6; margin: 2cm; color: #1a1a1a; }
    h1 { font-size: 24pt; font-weight: 700; margin: 24pt 0 12pt; color: #111; }
    h2 { font-size: 16pt; font-weight: 600; margin: 20pt 0 8pt; color: #222; border-bottom: 1pt solid #ddd; padding-bottom: 4pt; }
    h3 { font-size: 13pt; font-weight: 600; margin: 16pt 0 6pt; color: #333; }
    h4 { font-size: 11pt; font-weight: 600; margin: 12pt 0 4pt; }
    p { margin: 0 0 8pt; }
    li { margin: 4pt 0; }
    code { font-family: Consolas, monospace; font-size: 9pt; background: #f5f5f5; padding: 1pt 3pt; }
    blockquote { margin: 12pt 0; padding: 8pt 12pt; border-left: 3pt solid #e0302a; color: #555; }
    a { color: #2563eb; }
    .meta { color: #888; font-size: 9pt; margin-bottom: 24pt; }
  </style>
</head>
<body>
  <h1>${topic}</h1>
  <p class="meta">ARC Research Report · Generated ${date}</p>
  ${html}
</body>
</html>`;

  const blob = new Blob([wordDoc], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(topic)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdf(reportRef: React.RefObject<HTMLDivElement | null>, topic: string) {
  const element = reportRef.current;
  if (!element) return;

  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;

  let yPosition = margin;
  let remainingHeight = imgHeight;

  while (remainingHeight > 0) {
    const sliceHeight = Math.min(remainingHeight, pageHeight - margin * 2);
    const sourceY = (imgHeight - remainingHeight) * (canvas.height / imgHeight);
    const sourceHeight = sliceHeight * (canvas.height / imgHeight);

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sourceHeight;
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

    if (yPosition > margin) pdf.addPage();
    pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, contentWidth, sliceHeight);

    remainingHeight -= sliceHeight;
    yPosition += sliceHeight;
  }

  pdf.save(`${slug(topic)}.pdf`);
}

// ─── Download Menu ────────────────────────────────────────────────────────────
function DownloadMenu({ content, topic, sources, date, reportRef }: {
  content: string;
  topic: string;
  sources: { url: string; title: string }[];
  date: string;
  reportRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handle = async (format: string) => {
    setLoading(format);
    setOpen(false);
    try {
      if (format === "md") downloadMd(content, topic);
      else if (format === "doc") downloadDocx(content, topic, sources, date);
      else if (format === "pdf") await downloadPdf(reportRef, topic);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 hover:text-white text-sm font-medium transition-all">
        <Download size={14} />
        {loading ? `Saving…` : "Export"}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-[#12151f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-48">
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Download as</p>
            </div>
            {[
              { id: "md", label: "Markdown", ext: ".md", desc: "Plain text format" },
              { id: "doc", label: "Word Document", ext: ".doc", desc: "Opens in Word/Pages" },
              { id: "pdf", label: "PDF", ext: ".pdf", desc: "High quality export" },
            ].map(opt => (
              <button key={opt.id} onClick={() => handle(opt.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                <FileDown size={13} className="text-gray-600 shrink-0" />
                <div>
                  <p className="text-xs text-gray-300 font-medium">
                    {opt.label} <span className="text-gray-600 font-normal">{opt.ext}</span>
                  </p>
                  <p className="text-[10px] text-gray-600">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const reportRef = useRef<HTMLDivElement>(null);
const [saved, setSaved] = useState(false);
const [saving, setSaving] = useState(false);
const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/sessions/${params.id}`)
      .then(r => {
        if (r.status === 401) { router.replace("/login"); return null; }
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(json => { if (json) setData(json); })
      .catch(() => setError("Could not load this report."))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  // Check saved status on load
  useEffect(() => {
    if (!params.id) return;
    fetch("/api/saved-reports")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.saved) {
          setSaved(json.saved.some((s: any) => s.session_id === params.id));
        }
      })
      .catch(() => {});
  }, [params.id]);

  const handleSave = async () => {
    if (saving || !params.id) return;
    setSaving(true);
    try {
      if (saved) {
        await fetch(`/api/saved-reports?sessionId=${params.id}`, { method: "DELETE" });
        setSaved(false);
        setSaveFeedback("Removed");
      } else {
        await fetch("/api/saved-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: params.id }),
        });
        setSaved(true);
        setSaveFeedback("Saved!");
      }
    } catch {
      setSaveFeedback("Error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveFeedback(null), 2000);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0d0f16] flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        Loading report...
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#0d0f16] flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 mb-4">{error || "Report not found."}</p>
        <Link href="/dashboard" className="text-blue-400 hover:underline text-sm">← Back to dashboard</Link>
      </div>
    </div>
  );

  const { session, report, sources } = data;
  const dateStr = new Date(session.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-[#0d0f16] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ffffff12; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0d0f16]/95 backdrop-blur px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-200 transition-colors group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </Link>

          <span className="text-red-500 font-bold text-lg tracking-tight">ARC</span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
                saved
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                  : "bg-white/[0.06] border-white/[0.08] text-gray-300 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saved ? (
                <BookmarkCheck size={14} />
              ) : (
                <Bookmark size={14} />
              )}
              {saveFeedback ?? (saved ? "Saved" : "Save")}
            </button>

            {report?.content && (
              <DownloadMenu
                content={report.content}
                topic={session.topic}
                sources={sources}
                date={dateStr}
                reportRef={reportRef}
              />
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-6">
        {/* Main */}
        <div className="flex-1 min-w-0">

          {/* Meta */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 mb-5">
            <h1 className="text-2xl font-semibold text-white mb-3">{session.topic}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {dateStr}
              </span>
              {report && (
                <>
                  <span className="flex items-center gap-1.5">
                    <FileText size={13} />
                    {report.word_count.toLocaleString()} words
                  </span>
                  <span>{report.iteration_count} research iterations</span>
                  <span>{report.token_used.toLocaleString()} tokens used</span>
                </>
              )}
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                {session.status}
              </span>
            </div>
          </div>

          {/* Clarifications */}
          {session.clarifications?.length > 0 && (
            <details className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 mb-5 cursor-pointer group">
              <summary className="text-sm font-medium text-gray-500 select-none group-open:text-gray-300 transition-colors">
                ▾ Research scope (clarifications)
              </summary>
              <div className="mt-4 space-y-3">
                {session.clarifications.map((c, i) => (
                  <div key={i}>
                    <p className="text-xs text-gray-600">{c.question}</p>
                    <p className="text-sm text-gray-300 font-medium mt-0.5">{c.answer}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Report content — ref'd for PDF export */}
          {report?.content ? (
            <div ref={reportRef}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8
                prose prose-sm max-w-none prose-invert
                prose-headings:font-semibold prose-headings:tracking-tight
                prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm
                prose-p:text-gray-300 prose-p:leading-relaxed
                prose-li:text-gray-300
                prose-strong:text-white prose-strong:font-semibold
                prose-code:text-red-300 prose-code:bg-red-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal
                prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-red-500/40 prose-blockquote:text-gray-400
                prose-hr:border-white/[0.06]
                prose-table:text-gray-300 prose-th:text-gray-200 prose-th:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-gray-600">
              Report content not available.
            </div>
          )}
        </div>

        {/* Sources sidebar */}
        <aside className="w-60 shrink-0 hidden lg:block">
          <div className="sticky top-20 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="text-[10px] font-semibold text-gray-600 mb-3 flex items-center gap-2 uppercase tracking-widest">
              <Globe size={11} />
              Sources ({sources.length})
            </h3>
            <div className="space-y-1.5">
              {sources.length === 0 ? (
                <p className="text-xs text-gray-700">No sources saved.</p>
              ) : (
                sources.map(s => (
                  <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="block text-[11px] text-blue-400/70 hover:text-blue-300 hover:underline truncate transition-colors"
                    title={s.url}>
                    {s.title || s.url}
                  </a>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
