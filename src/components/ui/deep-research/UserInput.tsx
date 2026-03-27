"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Search, ArrowRight } from "lucide-react";
import { useDeepResearchStore } from "@/store/deepResearch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  input: z.string().min(2, {
    message: "Input must be at least 2 characters.",
  }).max(300, {
    message: "Input must not exceed 300 characters.",
  }),
});

interface UserInputProps {
  isDarkMode?: boolean;
}

const UserInput = ({ isDarkMode = true }: UserInputProps) => {
  const { setQuestions, setTopic } = useDeepResearchStore();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_CHARS = 300;
  const MAX_HEIGHT = 180;
  const MIN_HEIGHT = 48;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      input: "",
    },
  });

  // Improved resize function with better performance
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to measure scrollHeight accurately
    textarea.style.height = "0px";
    
    // Get new height based on content
    const newHeight = Math.max(
      MIN_HEIGHT,
      Math.min(textarea.scrollHeight, MAX_HEIGHT)
    );
    
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [MAX_HEIGHT, MIN_HEIGHT]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCharCount(value.length);
    form.setValue("input", value);
    resizeTextarea();
  };

  // Handle key down events for Enter and Shift+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow Shift+Enter for new line, no special handling needed as it's default
        return;
      } else {
        // If form is valid and not already submitting, submit on Enter
        e.preventDefault();
        const inputValue = form.getValues("input");
        if (inputValue.length >= 2 && inputValue.length <= MAX_CHARS && !isSubmitting) {
          form.handleSubmit(onSubmit)();
        }
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isSubmitting) return; // Prevent double submissions
    
    try {
      setIsSubmitting(true);
      setTopic(values.input);
      
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic: values.input })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      setQuestions(data.questions);
      
      // Reset form
      form.reset();
      setCharCount(0);
      if (textareaRef.current) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`;
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      // You could add error handling UI here
    } finally {
      setIsSubmitting(false);
    }
  }

  // Initialize textarea height on mount
  useEffect(() => {
    if (textareaRef.current) {
      resizeTextarea();
    }
    
    const handleResize = () => {
      requestAnimationFrame(resizeTextarea);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeTextarea]);

  // Theme styles with improved contrast and accessibility
  const styles = {
    inputBg: isDarkMode ? 'bg-gray-800' : 'bg-white',
    inputBorder: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    inputText: isDarkMode ? 'text-white' : 'text-gray-800',
    inputPlaceholder: isDarkMode ? 'placeholder:text-gray-400' : 'placeholder:text-gray-500',
    inputFocus: isDarkMode ? 'focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-blue-400 focus:border-blue-400',
    buttonBg: isDarkMode 
      ? 'bg-blue-600 hover:bg-blue-700' 
      : 'bg-blue-500 hover:bg-blue-600',
    buttonDisabled: 'opacity-60 cursor-not-allowed',
    iconColor: isDarkMode ? 'text-blue-400' : 'text-blue-500',
    countText: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    countWarning: 'text-amber-500',
    countLimit: 'text-red-500',
  };

  // Character count styling
  const getCountStyle = () => {
    if (charCount >= MAX_CHARS) return styles.countLimit;
    if (charCount >= MAX_CHARS * 0.8) return styles.countWarning; 
    return styles.countText;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-start gap-3">
        <FormField
          control={form.control}
          name="input"
          render={({ field }) => (
            <FormItem className="w-full relative">
              <div className={`absolute left-5 top-1/2 transform -translate-y-1/2 ${styles.iconColor} transition-colors duration-200`}>
                <Search size={20} strokeWidth={2} />
              </div>
              <FormControl>
                <Textarea 
                  {...field}
                  ref={(e) => {
                    textareaRef.current = e;
                    field.ref(e);
                  }}
                  placeholder="What would you like to research today?" 
                  className={`
                    rounded-xl w-full pl-12 pr-4 py-3
                    ${styles.inputBg} ${styles.inputBorder} ${styles.inputText} ${styles.inputPlaceholder} ${styles.inputFocus}
                    border shadow-sm
                    text-lg min-h-[3rem]
                    transition-colors duration-200
                    focus:outline-none focus:ring-2
                    scrollbar-thin
                  `}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={resizeTextarea}
                  rows={1}
                  maxLength={MAX_CHARS}
                  style={{
                    height: `${MIN_HEIGHT}px`,
                    resize: "none",
                  }}
                  disabled={isSubmitting}
                  aria-label="Research topic input"
                />
              </FormControl>
              
              <div className={`absolute right-4 bottom-3 text-xs font-medium ${getCountStyle()} transition-colors duration-200`}>
                {charCount}/{MAX_CHARS}
              </div>
              
              <FormMessage className="text-red-500 text-sm mt-1 ml-4 absolute" />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          className={`
            ${styles.buttonBg} text-white font-medium 
            rounded-xl px-6 py-3 h-12 md:min-w-32 self-start
            text-base transition-all duration-200 
            hover:shadow-md 
            flex items-center justify-center gap-2
            ${isSubmitting || charCount < 2 ? styles.buttonDisabled : ''}
          `}
          disabled={isSubmitting || charCount < 2}
          aria-label="Submit search"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Genrating...
            </span>
          ) : (
            <>
              <span>Search</span>
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default UserInput;