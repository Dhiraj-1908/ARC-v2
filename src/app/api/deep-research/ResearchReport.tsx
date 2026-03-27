"use client";
import React, { ComponentPropsWithRef, useState } from "react";
import { useDeepResearchStore } from "@/store/deepResearch";
import { Card } from "@/components/ui/card";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Prism as SyntaxHighlighter,
  SyntaxHighlighterProps,
} from "react-syntax-highlighter";
import {
  oneLight,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
  Download,
  BookOpen,
  Copy,
  Check,
  FileText,
  FileCode,
  Printer,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { EnhancedPdfGenerationService } from "../download/pdfdownloader";

type CodeProps = ComponentPropsWithRef<"code"> & {
  inline?: boolean;
};

interface ResearchReportProps {
  isDarkMode: boolean;
}

const ResearchReport = ({ isDarkMode }: ResearchReportProps) => {
  const { report, isCompleted, topic } = useDeepResearchStore();
  const [copied, setCopied] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  // Theme colors based on light/dark mode
  const theme = {
    card: isDarkMode ? "bg-gray-800/90" : "bg-white/90",
    border: isDarkMode ? "border-gray-700" : "border-black/10",
    text: isDarkMode ? "text-gray-100" : "text-gray-800",
    mutedText: isDarkMode ? "text-gray-400" : "text-gray-500",
    buttonBg: isDarkMode
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-blue-500 hover:bg-blue-600",
    buttonOutline: isDarkMode
      ? "border-gray-600 hover:bg-gray-700 hover:text-white text-gray-900"
      : "border-gray-300 hover:bg-gray-100",
    buttonText: "text-white",
    buttonIcon: isDarkMode ? "text-gray-300" : "text-gray-600",
    shadow: isDarkMode
      ? "shadow-lg shadow-black/30"
      : "shadow-lg shadow-[#c9d6e3]/40",
    prose: isDarkMode ? "prose-invert" : "prose-gray",
    accent: isDarkMode ? "text-blue-400" : "text-blue-600",
    codeBlockBg: isDarkMode ? "bg-gray-900" : "bg-gray-50",
    success: isDarkMode ? "bg-green-600" : "bg-green-500",
    header: isDarkMode ? "bg-gray-900/80" : "bg-gray-50/90",
    dropdown: isDarkMode
      ? "bg-gray-800 border-gray-700"
      : "bg-white border-gray-200",
    dropdownHover: isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100",
    dropdownText: isDarkMode ? "text-white" : "text-gray-800",
    dropdownActive: isDarkMode ? "text-black bg-blue-300" : "hover:bg-gray-100",
    dropdownInactive: isDarkMode ? "text-blue-300" : "text-gray-600",
    copyButton: isDarkMode 
      ? "bg-gray-700 text-gray-900 hover:bg-gray-600 hover:text-white"
      : "bg-white text-gray-600 hover:bg-gray-100",
  };

  const handleMarkdownDownload = () => {
    const content = report.split("<report>")[1].split("</report>")[0];
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic}-research-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTextDownload = () => {
    const content = report.split("<report>")[1].split("</report>")[0];
    const cleanText = content
      .replace(/\n#{1,6}\s/g, "\n")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "");
    const blob = new Blob([cleanText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic}-research-report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simplified PDF generation using the external service
  const handlePdfDownload = async () => {
    if (!topic || !report) return;
    
    try {
      setPdfGenerating(true);
      
      // Extract markdown content
      const content = report.split("<report>")[1].split("</report>")[0];
      
      // Use the enhanced PDF generation service with dark mode matching the UI
      await EnhancedPdfGenerationService.downloadPdf(topic, content);
      
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    const content = report.split("<report>")[1].split("</report>")[0];
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Don't render anything if research hasn't completed
  if (!isCompleted) return null;

  // Don't render the loading state here, we handle it in ResearchPhase
  if (report.length <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] xl:max-w-[65vw] mx-auto my-8 md:mt-0 md:ml-[420px]"
    >
      <Card
        className={`relative rounded-xl border ${theme.border} ${theme.shadow} ${theme.card} backdrop-blur-xl transition-colors duration-300 ${theme.text} overflow-hidden`}
      >
        {/* Report Header */}
        <div
          className={`${theme.header} px-6 py-4 border-b ${theme.border} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className={theme.accent} />
            <h2 className="text-xl font-semibold">{topic}</h2>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              size="sm"
              variant="outline"
              className={`flex items-center gap-2 rounded border ${theme.buttonOutline}`}
              onClick={handleCopyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className={`flex items-center gap-2 rounded ${theme.buttonBg} ${theme.buttonText} transition-colors duration-200`}
                >
                  <Download className="w-4 h-4" /> Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className={`${theme.dropdown} border ${theme.shadow}`}
              >
                <DropdownMenuItem
                  className={`flex items-center gap-2 ${theme.dropdownText} ${theme.dropdownHover} cursor-pointer`}
                  onClick={handleMarkdownDownload}
                >
                  <FileText className={`w-4 h-4 ${theme.dropdownInactive}`} />
                  <span>Markdown (.md)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`flex items-center gap-2 ${theme.dropdownText} ${theme.dropdownHover} cursor-pointer`}
                  onClick={handleTextDownload}
                >
                  <FileCode className={`w-4 h-4 ${theme.dropdownInactive}`} />
                  <span>Plain Text (.txt)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`flex items-center gap-2 ${theme.dropdownText} ${theme.dropdownHover} cursor-pointer`}
                  onClick={handlePdfDownload}
                  disabled={pdfGenerating}
                >
                  <Printer className={`w-4 h-4 ${theme.dropdownInactive}`} />
                  <span>
                    {pdfGenerating ? (
                      <span className="flex items-center">
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Generating PDF...
                      </span>
                    ) : (
                      "PDF Document (.pdf)"
                    )}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div
          ref={reportRef}
          className={`prose ${theme.prose} prose-sm md:prose-base max-w-none prose-headings:${theme.accent} prose-a:${theme.accent} prose-pre:${theme.codeBlockBg} overflow-x-auto p-6 md:p-8`}
        >
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, inline, ...props }: CodeProps) {
                const match = /language-(\w+)/.exec(className || "");
                const language = match ? match[1] : "";

                if (!inline && language) {
                  const SyntaxHighlighterProps: SyntaxHighlighterProps = {
                    style: isDarkMode ? oneLight : oneLight,
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
                        ? "0 4px 6px -1px rgba(0, 0, 0, 0.2)"
                        : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    },
                  };

                  return (
                    <div className="relative group">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${theme.copyButton}`}
                        onClick={() => {
                          navigator.clipboard.writeText(String(children));
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                      <SyntaxHighlighter {...SyntaxHighlighterProps} />
                    </div>
                  );
                }

                return (
                  <code
                    className={`${className} ${
                      isDarkMode ? "bg-gray-800" : "bg-gray-100"
                    } 
                    rounded px-1`}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              h1: ({ ...props }) => (
                <h1
                  className="text-3xl font-bold mb-6 border-b pb-2"
                  {...props}
                />
              ),
              h2: ({ ...props }) => (
                <h2 className="text-2xl font-semibold mt-8 mb-4" {...props} />
              ),
              h3: ({ ...props }) => (
                <h3 className="text-xl font-medium mt-6 mb-3" {...props} />
              ),
              blockquote: ({ ...props }) => (
                <blockquote
                  className={`border-l-4 ${
                    isDarkMode
                      ? "border-blue-500 bg-gray-800/50"
                      : "border-blue-400 bg-blue-50/50"
                  } pl-4 py-1 my-4 rounded-r`}
                  {...props}
                />
              ),
              table: ({ ...props }) => (
                <div className="overflow-x-auto my-6 rounded-lg border">
                  <table
                    className={`${
                      isDarkMode ? "border-gray-700" : "border-gray-300"
                    } border-collapse w-full`}
                    {...props}
                  />
                </div>
              ),
              th: ({ ...props }) => (
                <th
                  className={`${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600"
                      : "bg-gray-100 border-gray-300"
                  } border px-4 py-2 text-left`}
                  {...props}
                />
              ),
              td: ({ ...props }) => (
                <td
                  className={`${
                    isDarkMode ? "border-gray-700" : "border-gray-300"
                  } border px-4 py-2`}
                  {...props}
                />
              ),
            }}
          >
            {report.split("<report>")[1].split("</report>")[0]}
          </Markdown>
        </div>
      </Card>
    </motion.div>
  );
};

export default ResearchReport;