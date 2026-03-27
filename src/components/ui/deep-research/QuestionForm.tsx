"use client";

import React, { useState, useEffect } from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from '../textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDeepResearchStore } from '@/store/deepResearch';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  answer: z.string().min(1, "Answer is required!"),
});

const QuestionForm = () => {
  const router = useRouter();
  const { 
    questions, 
    currentQuestion, 
    answers, 
    setCurrentQuestion, 
    setAnswers, 
    setIsCompleted, 
    isLoading, 
  } = useDeepResearchStore();
  
  // State for client-side rendering safety
  const [hasMounted, setHasMounted] = useState(false);
  
  // Set mounted state after hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      answer: answers[currentQuestion] || "",
    },
  });
  
  // Update form value when currentQuestion changes
  useEffect(() => {
    if (!hasMounted) return;
    
    if (answers[currentQuestion]) {
      form.setValue("answer", answers[currentQuestion]);
    } else {
      form.setValue("answer", "");
    }
  }, [currentQuestion, answers, form, hasMounted]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Update answers in store
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = values.answer;
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // This is the key part - only set isCompleted to true
      // when the user submits the final question
      setIsCompleted(true);
      // Navigate to research page
      router.push('/research');
    }
  }

  // Handle case where there are no questions yet or component is not mounted
  if (!hasMounted || !questions || questions.length === 0) {
    return null;
  }

  return (
    <Card className='w-full max-w-[80vw] sm:max-w-[80vw] xl:max-w-[80vw] shadow-none'>
      <CardHeader className='px-4 sm:px-5'>
        <CardTitle className='text-base text-primary/50'>Question {currentQuestion + 1} of {questions.length}</CardTitle>
      </CardHeader>

      <CardContent className='space-y-6 w-full px-4 sm:px-5'>
        <p className='text-base'>{questions[currentQuestion]}</p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Type your answer here..." 
                      {...field}
                      className='px-4 py-2 text-base resize-none placeholder:text-sm border-black/20'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex justify-between items-center'>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  if (currentQuestion > 0) {
                    // Save current answer before navigating
                    const currentAnswer = form.getValues().answer;
                    if (currentAnswer) {
                      const newAnswers = [...answers];
                      newAnswers[currentQuestion] = currentAnswer;
                      setAnswers(newAnswers);
                    }
                    
                    // Go to previous question
                    setCurrentQuestion(currentQuestion - 1);
                  }
                }}
                disabled={currentQuestion === 0 || isLoading}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                <span>Previous</span>
              </Button>

              <Button 
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {currentQuestion === questions.length - 1 ? "Start Research" : "Next"}
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </Form>

        <div className='h-1 w-full bg-gray-200 rounded'>
          <div 
            className='h-1 bg-primary rounded transition-all duration-300'
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionForm;