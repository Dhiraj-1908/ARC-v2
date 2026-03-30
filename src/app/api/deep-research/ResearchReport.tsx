"use client";
import React, { ComponentPropsWithRef, useState, useEffect } from "react";
import { useDeepResearchStore } from "@/store/deepResearch";
import { Card } from "@/components/ui/card";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter, SyntaxHighlighterProps } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
  Download, BookOpen, Copy, Check, FileText, FileCode,
  Printer, Loader2, Trash2, Bookmark, BookmarkCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { EnhancedPdfGenerationService } from "../download/pdfdownloader";
import { useRouter } from "next/navigation";

type CodeProps = ComponentPropsWithRef<"code"> & { inline?: boolean };

interface ResearchReportProps {
  isDarkMode: boolean;
}

// ─── DOCX download helper ─────────────────────────────────────────────────────
function downloadDocx(content: string, topic: string) {
  const lines = content.split("\n");
  let html = "";
  for (const line of lines) {
    if (line.startsWith("# ")) html += `<h1>${line.slice(2)}</h1>\n`;
    else if (line.startsWith("## ")) html += `<h2>${line.slice(3)}</h2>\n`;
    else if (line.startsWith("### ")) html += `<h3>${line.slice(4)}</h3>\n`;
    else if (line.startsWith("#### ")) html += `<h4>${line.slice(5)}</h4>\n`;
    else if (line.startsWith("- ") || line.startsWith("* "))
      html += `<li>${line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>\n`;
    else if (line.match(/^\d+\. /))
      html += `<li>${line.replace(/^\d+\. /, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>\n`;
    else if (line.startsWith("> ")) html += `<blockquote>${line.slice(2)}</blockquote>\n`;
    else if (line.startsWith("---")) html += `<hr/>\n`;
    else if (line.trim() === "") html += `<p>&nbsp;</p>\n`;
    else
      html += `<p>${line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/`(.*?)`/g, "<code>$1</code>")}</p>\n`;
  }

  const wordDoc = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8"/>
  <title>${topic}</title>
  <style>
    body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.6; margin: 2cm; color: #1a1a1a; }
    h1 { font-size: 24pt; font-weight: 700; margin: 24pt 0 12pt; }
    h2 { font-size: 16pt; font-weight: 600; margin: 20pt 0 8pt; border-bottom: 1pt solid #ddd; padding-bottom: 4pt; }
    h3 { font-size: 13pt; font-weight: 600; margin: 16pt 0 6pt; }
    p { margin: 0 0 8pt; }
    li { margin: 4pt 0; }
    code { font-family: Consolas, monospace; font-size: 9pt; background: #f5f5f5; padding: 1pt 3pt; }
    blockquote { margin: 12pt 0; padding: 8pt 12pt; border-left: 3pt solid #e0302a; color: #555; }
  </style>
</head>
<body>
  <h1>${topic}</h1>
  <p style="color:#888;font-size:9pt;">ARC Research Report</p>
  ${html}
</body>
</html>`;

  const blob = new Blob([wordDoc], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${topic.slice(0, 60).replace(/[^a-z0-9]/gi, "_")}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ResearchReport = ({ isDarkMode }: ResearchReportProps) => {
  const { report, isCompleted, topic, sessionId } = useDeepResearchStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Save to DB state ──────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const reportRef = React.useRef<HTMLDivElement>(null);

  // Check if already saved when sessionId becomes available
  useEffect(() => {
    if (!sessionId) return;
    fetch("/api/saved-reports")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.saved) {
          setSaved(json.saved.some((s: { session_id: string }) => s.session_id === sessionId));
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // ── Save / Unsave handler ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return;

    if (!sessionId) {
      setSaveFeedback("Research still processing…");
      setTimeout(() => setSaveFeedback(null), 2500);
      return;
    }

    setSaving(true);
    try {
      if (saved) {
        const res = await fetch(`/api/saved-reports?sessionId=${sessionId}`, { method: "DELETE" });
        if (res.ok) {
          setSaved(false);
          setSaveFeedback("Removed from dashboard");
        }
      } else {
        const res = await fetch("/api/saved-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (res.ok) {
          setSaved(true);
          setSaveFeedback("Saved to dashboard! ✓");
        } else if (res.status === 401) {
          setSaveFeedback("Sign in to save reports");
        } else {
          const err = await res.json().catch(() => ({}));
          setSaveFeedback(err.error ?? "Save failed");
        }
      }
    } catch {
      setSaveFeedback("Network error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveFeedback(null), 2500);
    }
  };

  const handleDelete = async () => {
    if (!sessionId) return;
    setDeleting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.from("sources").delete().eq("session_id", sessionId);
      await supabase.from("reports").delete().eq("session_id", sessionId);
      await supabase.from("research_sessions").delete().eq("id", sessionId);
      router.replace("/dashboard");
    } catch (err) {
      console.error("Delete failed", err);
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const rawContent = (() => {
    if (!report) return "";
    if (report.includes("<report>") && report.includes("</report>")) {
      return report.split("<report>")[1].split("</report>")[0];
    }
    return report;
  })();

  const handleMarkdownDownload = () => {
    const blob = new Blob([rawContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic}-research-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDocxDownload = () => downloadDocx(rawContent, topic);

  const handlePdfDownload = async () => {
    if (!topic || !rawContent) return;
    try {
      setPdfGenerating(true);
      await EnhancedPdfGenerationService.downloadPdf(topic, rawContent);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const theme = {
    card: isDarkMode ? "bg-white/[0.025] border-white/[0.07]" : "bg-white border-gray-200",
    border: isDarkMode ? "border-white/[0.07]" : "border-gray-200",
    text: isDarkMode ? "text-gray-100" : "text-gray-900",
    buttonBg: isDarkMode ? "bg-red-500/90 hover:bg-red-500" : "bg-red-500 hover:bg-red-600",
    buttonOutline: isDarkMode
      ? "border-white/[0.08] hover:bg-white/[0.06] text-gray-400 hover:text-gray-200"
      : "border-gray-300 hover:bg-gray-100 text-gray-600",
    shadow: isDarkMode ? "shadow-none" : "shadow-lg shadow-gray-200/60",
    prose: isDarkMode ? "prose-invert" : "prose-gray",
    accent: isDarkMode ? "text-red-400" : "text-red-600",
    codeBlockBg: isDarkMode ? "bg-white/[0.04]" : "bg-gray-50",
    header: isDarkMode ? "bg-white/[0.02]" : "bg-gray-50",
    dropdown: isDarkMode ? "bg-[#12151f] border-white/10" : "bg-white border-gray-200",
    dropdownHover: isDarkMode ? "hover:bg-white/[0.05]" : "hover:bg-gray-100",
    dropdownText: isDarkMode ? "text-gray-200" : "text-gray-800",
    dropdownInactive: isDarkMode ? "text-gray-400" : "text-gray-600",
    copyButton: isDarkMode
      ? "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-white"
      : "bg-white text-gray-600 hover:bg-gray-100",
  };

  if (!isCompleted || rawContent.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card
        className={`relative rounded-xl border ${theme.border} ${theme.shadow} ${theme.card} backdrop-blur-xl transition-colors duration-300 ${theme.text} overflow-visible`}
      >
        {/* ── Header ── */}
        <div
          className={`${theme.header} px-6 py-4 border-b ${theme.border} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className={`${theme.accent} shrink-0`} size={18} />
            <h2 className="text-base font-semibold truncate">{topic}</h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Copy */}
            <Button
              size="sm"
              variant="outline"
              className={`flex items-center gap-1.5 rounded border text-xs ${theme.buttonOutline}`}
              onClick={handleCopyToClipboard}
            >
              {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </Button>

            {/* ── Save to Dashboard ── */}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-1.5 rounded border text-xs transition-all ${
                  saved
                    ? isDarkMode
                      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                      : "border-yellow-400 bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                    : theme.buttonOutline
                }`}
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : saved ? (
                  <BookmarkCheck className="w-3 h-3" />
                ) : (
                  <Bookmark className="w-3 h-3" />
                )}
{saved ? "Saved" : "Save"}
              </Button>

              {/* Floating feedback toast */}
              {saveFeedback && (
                <div className={`absolute right-0 bottom-full mb-2 z-50 px-3 py-1.5 rounded-xl text-xs font-medium shadow-lg whitespace-nowrap pointer-events-none
                  ${isDarkMode
                    ? "bg-[#1a1d2a] border border-white/10 text-gray-200"
                    : "bg-white border border-gray-200 text-gray-700 shadow-md"
                  }`}>
                  {saveFeedback}
                </div>
              )}
            </div>

            {/* Export / Download */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className={`flex items-center gap-1.5 rounded text-xs ${theme.buttonBg} text-white transition-colors duration-200`}
                >
                  <Download className="w-3 h-3" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={`${theme.dropdown} border ${theme.shadow}`}>
                <DropdownMenuItem
                  className={`flex items-center gap-2 ${theme.dropdownText} ${theme.dropdownHover} cursor-pointer`}
                  onClick={handleMarkdownDownload}
                >
                  <FileText className={`w-4 h-4 ${theme.dropdownInactive}`} />
                  <div>
                    <p className="text-xs font-medium">Markdown <span className="opacity-50">.md</span></p>
                    <p className="text-[10px] opacity-40">Plain text format</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`flex items-center gap-2 ${theme.dropdownText} ${theme.dropdownHover} cursor-pointer`}
                  onClick={handleDocxDownload}
                >
                  <FileCode className={`w-4 h-4 ${theme.dropdownInactive}`} />
                  <div>
                    <p className="text-xs font-medium">Word Document <span className="opacity-50">.doc</span></p>
                    <p className="text-[10px] opacity-40">Opens in Word / Pages</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`flex items-center gap-2 ${theme.dropdownText} ${theme.dropdownHover} cursor-pointer`}
                  onClick={handlePdfDownload}
                  disabled={pdfGenerating}
                >
                  <Printer className={`w-4 h-4 ${theme.dropdownInactive}`} />
                  <div>
                    {pdfGenerating ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" /> Generating…
                      </span>
                    ) : (
                      <>
                        <p className="text-xs font-medium">PDF <span className="opacity-50">.pdf</span></p>
                        <p className="text-[10px] opacity-40">High quality export</p>
                      </>
                    )}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete */}
            {sessionId && (
              <div className="relative">
                {deleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      disabled={deleting}
                      onClick={handleDelete}
                      className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 rounded px-2 py-1 h-auto"
                    >
                      {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(false)}
                      className="text-xs text-gray-500 rounded px-2 py-1 h-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded px-2 h-8"
                    title="Delete this report"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Report body ── */}
        <div
          ref={reportRef}
          className={`prose ${theme.prose} prose-sm md:prose-base max-w-none
            prose-headings:${theme.accent}
            prose-a:${theme.accent}
            prose-pre:${theme.codeBlockBg}
            overflow-x-auto p-6 md:p-8`}
        >
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, inline, ...props }: CodeProps) {
                const match = /language-(\w+)/.exec(className || "");
                const language = match ? match[1] : "";
                if (!inline && language) {
                  const shProps: SyntaxHighlighterProps = {
                    style: oneLight,
                    language,
                    PreTag: "div",
                    children: String(children).replace(/\n$/, ""),
                    showLineNumbers: true,
                    wrapLines: true,
                    wrapLongLines: true,
                    customStyle: {
                      borderRadius: "0.5rem",
                      padding: "1rem",
                      boxShadow: isDarkMode
                        ? "0 4px 6px -1px rgba(0,0,0,0.2)"
                        : "0 4px 6px -1px rgba(0,0,0,0.1)",
                    },
                  };
                  return (
                    <div className="relative group">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${theme.copyButton}`}
                        onClick={() => navigator.clipboard.writeText(String(children))}
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                      <SyntaxHighlighter {...shProps} />
                    </div>
                  );
                }
                return (
                  <code
                    className={`${className} ${isDarkMode ? "bg-gray-800" : "bg-gray-100"} rounded px-1`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              h1: ({ ...props }) => <h1 className="text-3xl font-bold mb-6 border-b pb-2" {...props} />,
              h2: ({ ...props }) => <h2 className="text-2xl font-semibold mt-8 mb-4" {...props} />,
              h3: ({ ...props }) => <h3 className="text-xl font-medium mt-6 mb-3" {...props} />,
              blockquote: ({ ...props }) => (
                <blockquote
                  className={`border-l-4 ${isDarkMode ? "border-blue-500 bg-gray-800/50" : "border-blue-400 bg-blue-50/50"} pl-4 py-1 my-4 rounded-r`}
                  {...props}
                />
              ),
              table: ({ ...props }) => (
                <div className="overflow-x-auto my-6 rounded-lg border">
                  <table className={`${isDarkMode ? "border-gray-700" : "border-gray-300"} border-collapse w-full`} {...props} />
                </div>
              ),
              th: ({ ...props }) => (
                <th className={`${isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300"} border px-4 py-2 text-left`} {...props} />
              ),
              td: ({ ...props }) => (
                <td className={`${isDarkMode ? "border-gray-700" : "border-gray-300"} border px-4 py-2`} {...props} />
              ),
            }}
          >
            {rawContent}
          </Markdown>
        </div>
      </Card>
    </motion.div>
  );
};

export default ResearchReport;
