import { NextResponse } from "next/server";
import {generateObject} from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from "zod";


const openrouter = createOpenRouter({
    apiKey: process.env.NEW_KEY || "",                   //DEEPSEEK_API_KEY     //LLAMA_PAID_API_KEY
  });

const clarifyResearchGoals = async (topic: string) => {

    const prompt = `
    Given the research topic <topic>${topic}</topic>, please generate 3-4 focused clarifying questions to help narrow down the research scope. Focus on identifying 
    - Specific aspects of interest
    - Required depth/complexity level of research
    - Target the core dimensions of the topic that need exploration
    - Any particular perspective or excluded sources
    `
    try{
        const { object } = await generateObject({                                  //google/gemini-2.5-flash-preview   (cheaper)
            model: openrouter("anthropic/claude-3-haiku"),                     //google/gemini-2.0-flash-001    //openai/gpt-4.1 //openai/gpt-4.1-mini(reliable)     //openai/gpt-4.1 (context) --paid
            prompt,
            schema: z.object({
                questions: z.array(z.string())
            }),
            maxTokens: 500, // Add this line to limit the token usage
          });
          return object;
    }catch(error){
          console.log("Error while generating questions: ", error);
          return null; // Return null on error so we can handle it in the main function

    }
}

export async function POST(req: Request) {

    const {topic} = await req.json();

    console.log("Topic: ", topic);
    try{
           const questions = await clarifyResearchGoals(topic);
           console.log("Questions: ", questions)

           return NextResponse.json(questions)
    }
    catch(error){
        console.error("Error while generating questions: ", error)
        return NextResponse.json({
            success: false , error: "Failed to generate questions"
        }, {status: 500})
    }

    
}