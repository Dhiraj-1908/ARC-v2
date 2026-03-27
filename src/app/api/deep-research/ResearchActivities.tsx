"use client";
import { useDeepResearchStore } from "@/store/deepResearch";
import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerTitle,
  DrawerHeader,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  FileText, 
  X, 
  Clock,
  ExternalLink,
  Menu
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import Link from "next/link";
import { motion } from "framer-motion";

interface ResearchActivitiesProps {
  isDarkMode: boolean;
}

const ResearchActivities = ({ isDarkMode }: ResearchActivitiesProps) => {
  const { activities, sources } = useDeepResearchStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);
  
  // Enhanced theme colors with better mobile drawer support
  const theme = {
    // Base colors
    card: isDarkMode ? "bg-gray-800/95" : "bg-white/95",
    border: isDarkMode ? "border-gray-700" : "border-black/10",
    text: isDarkMode ? "text-gray-100" : "text-gray-800",
    mutedText: isDarkMode ? "text-gray-400" : "text-gray-500",
    
    // Tab styling
    tabBackground: isDarkMode ? "bg-gray-800/95" : "bg-white",
    tabsList: isDarkMode ? "bg-gray-900/80" : "bg-white",
    tabActive: isDarkMode ? "bg-blue-600 text-white border-blue-500" : "bg-gray-100 text-gray-800",
    tabInactive: isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700/50" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
    
    // List items
    listItemBorder: isDarkMode ? "border-gray-700" : "border-gray-200",
    listItemHover: isDarkMode ? "hover:bg-gray-700/50" : "hover:bg-gray-50",
    
    // Button styling
    button: isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-white hover:bg-gray-100",
    buttonText: isDarkMode ? "text-gray-200" : "text-gray-700",
    
    // Links
    link: isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700",
    
    // Shadows
    shadow: isDarkMode ? "shadow-lg shadow-black/30" : "shadow-lg shadow-[#c9d6e3]/40",
    
    // Status colors
    statusComplete: "bg-green-500",
    statusError: "bg-red-500",
    statusPending: "bg-yellow-500",

    // Icons
    iconColor: isDarkMode ? "text-blue-400" : "text-blue-600",

    // Drawer specific
    drawerBackground: isDarkMode ? "bg-gray-900" : "bg-white",
    drawerHeader: isDarkMode ? "bg-gray-800" : "bg-gray-50",
  };

  if (activities.length === 0) return null;

  const slideVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3 } }
  };
  
  // Content for both drawer and desktop sidebar
  const content = (
    <Tabs 
      defaultValue="activities" 
      className={`w-full h-full ${theme.shadow} backdrop-blur-sm rounded-xl overflow-hidden border ${theme.border}`}
    >
      <TabsList className={`w-full px-2 py-4 ${theme.tabsList} flex h-16 gap-1`}>
        <TabsTrigger
          value="activities"
          className={`
            flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-medium transition-all duration-200
            data-[state=active]:${theme.tabActive.replace(/\s+/g, ' ')}
            data-[state=inactive]:${theme.tabInactive.replace(/\s+/g, ' ')}
            ${isDarkMode ? 'data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50 data-[state=active]:ring-1 data-[state=active]:ring-blue-400/30' : 'data-[state=active]:shadow-sm'}
          `}
        >
          <Activity className="h-5 w-5" />
          <span>Activities</span>
        </TabsTrigger>
        {sources.length > 0 && (
          <TabsTrigger 
            value="sources"
            className={`
              flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-medium transition-all duration-200
              data-[state=active]:${theme.tabActive.replace(/\s+/g, ' ')}
              data-[state=inactive]:${theme.tabInactive.replace(/\s+/g, ' ')}
              ${isDarkMode ? 'data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/50 data-[state=active]:ring-1 data-[state=active]:ring-blue-400/30' : 'data-[state=active]:shadow-sm'}
            `}
          >
            <FileText className="h-5 w-5" />
            <span>Sources</span>
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent
        value="activities"
        className={`h-[calc(100%-64px)] overflow-y-auto ${theme.card} backdrop-blur-sm rounded-b-xl`}
      >
        <ul className="space-y-2 p-4">
          {activities.map((activity, index) => (
            <motion.li
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              key={index}
              className={`flex flex-col gap-2 border-b ${theme.listItemBorder} p-3 ${theme.listItemHover} rounded-md text-sm transition-colors duration-200 ${theme.text}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`
                    ${
                      activity.status === "complete"
                        ? theme.statusComplete
                        : activity.status === "error"
                        ? theme.statusError
                        : theme.statusPending
                    } min-w-2 min-h-2 h-2 w-2 block rounded-full
                  `}
                >
                  &nbsp;
                </span>

                <p className="break-words">
                  {activity.message.includes("https://")
                    ? activity.message.split("https://")[0] +
                      "https://" + activity.message.split("https://")[1].split("/")[0]
                    : activity.message}
                </p>
              </div>
              {activity.timestamp && (
                <div className={`flex items-center text-xs ${theme.mutedText}`}>
                  <Clock className="w-3 h-3 mr-1" />
                  {format(activity.timestamp, "HH:mm:ss")}
                </div>
              )}
            </motion.li>
          ))}
        </ul>
      </TabsContent>
      {sources.length > 0 && (
        <TabsContent
          value="sources"
          className={`h-[calc(100%-64px)] overflow-y-auto ${theme.card} backdrop-blur-sm rounded-b-xl`}
        >
          <ul className="space-y-2 p-4">
            {sources.map((source, index) => (
              <motion.li
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                key={index}
                className={`flex flex-col gap-2 border-b ${theme.listItemBorder} p-3 ${theme.listItemHover} rounded-md transition-colors duration-200`}
              >
                <Link
                  href={source.url}
                  target="_blank"
                  className={`text-sm ${theme.link} hover:underline flex items-center justify-between`}
                >
                  <span className="line-clamp-2">{source.title}</span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0 ml-2" />
                </Link>
              </motion.li>
            ))}
          </ul>
        </TabsContent>
      )}
    </Tabs>
  );

  // For mobile: return a drawer component with proper dark mode support
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`fixed top-4 left-4 z-30 flex items-center gap-2 ${theme.button} border ${theme.border} ${theme.text} shadow-md`}
          >
            <Menu className="h-5 w-5" />
            <div className="flex items-center">
              <Activity className={`h-4 w-4 mr-2 ${theme.iconColor}`} />
              <span className="font-medium">Research Progress</span>
            </div>
          </Button>
        </DrawerTrigger>
        <DrawerContent className={`h-[80vh] ${theme.card} border-t ${theme.border}`}>
          <DrawerHeader className={`px-4 py-3 ${theme.card} border-b ${theme.border}`}>
            <div className="flex items-center gap-3">
              <Activity className={`h-5 w-5 flex-shrink-0 ${theme.iconColor}`} />
              <div>
                <DrawerTitle className={`${theme.text} text-lg font-medium leading-none`}>
                  Research Progress
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  View research activities and sources
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>
          <div className="p-4 h-full">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  // For desktop: return the sidebar
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={slideVariants}
      className="fixed top-4 left-4 z-10 w-[400px] h-[80vh]"
    >
      <div className="w-full h-full flex flex-col">
        <div className="flex justify-between items-center mb-2 px-2">
          <div className={`flex items-center gap-2 ${theme.text}`}>
            <Activity className={`h-5 w-5 ${theme.iconColor}`} />
            <span className="font-medium">Research Progress</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className={`w-9 p-0 ${theme.button} ${theme.buttonText} border ${theme.border} rounded-full`}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle</span>
          </Button>
        </div>
        
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "calc(100% - 2rem)" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-grow"
          >
            {content}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ResearchActivities;