"use client";

import React, { useState, useEffect } from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useDeepResearchStore } from '@/store/deepResearch';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const formSchema = z.object({
  answer: z.string().min(1, "Answer is required"),
});

interface QuestionFormProps {
  isDarkMode?: boolean;
}

const QuestionForm = ({ isDarkMode = false }: QuestionFormProps) => {
  const {
    questions, currentQuestion, answers,
    setCurrentQuestion, setAnswers, setIsCompleted, isLoading,
  } = useDeepResearchStore();

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { answer: answers[currentQuestion] || "" },
  });

  useEffect(() => {
    if (!hasMounted) return;
    form.setValue("answer", answers[currentQuestion] || "");
  }, [currentQuestion, answers, form, hasMounted]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!questions || questions.length === 0) return;
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = values.answer;
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsCompleted(true);
    }
  }

  if (!hasMounted || !questions || questions.length === 0) return null;

  // Fix #2: progress based on completed questions, not current index
  const progress = (currentQuestion / questions.length) * 100;
  const isLast = currentQuestion === questions.length - 1;

  // Theme
  const dm = isDarkMode;
  const questionText   = dm ? "text-gray-200"     : "text-gray-800";
  const progressTrack  = dm ? "bg-white/[0.06]"   : "bg-gray-200";
  const metaText       = dm ? "text-gray-400"      : "text-gray-500";
  const textareaBg     = dm
    ? "bg-white/[0.04] border-white/[0.08] text-gray-200 placeholder-gray-600 focus:border-red-500/40 focus:bg-white/[0.06]"
    : "bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-red-400 focus:bg-white";
  const prevBtn        = dm
    ? "text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]"
    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100";

  return (
    <div className="w-full space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[11px] font-medium ${metaText}`}>
          Question {currentQuestion + 1} of {questions.length}
        </span>
        <span className={`text-[11px] ${metaText}`}>{Math.round(progress)}%</span>
      </div>
      <div className={`h-0.5 w-full ${progressTrack} rounded-full overflow-hidden`}>
        <div
          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <p className={`text-sm leading-relaxed font-medium pt-1 ${questionText}`}>
        {questions[currentQuestion]}
      </p>

      {/* Answer textarea */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <textarea
          {...form.register("answer")}
          placeholder="Type your answer here…"
          rows={3}
          disabled={isLoading}
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none leading-relaxed ${textareaBg}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }
          }}
        />
        {form.formState.errors.answer && (
          <p className="text-red-400 text-xs">{form.formState.errors.answer.message}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => {
              if (currentQuestion > 0) {
                const cur = form.getValues().answer;
                if (cur) {
                  const na = [...answers];
                  na[currentQuestion] = cur;
                  setAnswers(na);
                }
                setCurrentQuestion(currentQuestion - 1);
              }
            }}
            disabled={currentQuestion === 0 || isLoading}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed ${prevBtn}`}
          >
            <ArrowLeft size={13} /> Previous
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-red-500/90 hover:bg-red-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLast ? "Start Research" : "Next"}
            <ArrowRight size={13} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionForm;