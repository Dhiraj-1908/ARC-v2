export function buildTheme(isDarkMode: boolean): Record<string, string> {
  return isDarkMode ? {
    bg: "bg-[#0d0f16]",
    sidebar: "bg-[#0b0d14] border-white/[0.06]",
    topbar: "bg-[#0d0f16]/95 border-white/[0.06]",
    card: "bg-white/[0.03] border-white/[0.07]",
    text: "text-gray-100",
    muted: "text-gray-500",
    hover: "hover:bg-white/[0.05]",
    sessionItem: "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]",
    inputCard: "bg-white/[0.025] border-white/[0.08]",
  } : {
    bg: "bg-[#f4f6fb]",
    sidebar: "bg-white border-gray-200",
    topbar: "bg-white/95 border-gray-200",
    card: "bg-white border-gray-200",
    text: "text-gray-900",
    muted: "text-gray-500",
    hover: "hover:bg-gray-100",
    sessionItem: "text-gray-500 hover:text-gray-800 hover:bg-gray-100",
    inputCard: "bg-white border-gray-200",
  };
}