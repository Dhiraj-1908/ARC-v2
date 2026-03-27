/* eslint-disable @typescript-eslint/no-explicit-any */
import { callModel } from "./model-caller";
import { ANALYSIS_SYSTEM_PROMPT, EXTRACTION_SYSTEM_PROMPT, getAnalysisPrompt, getExtractionPrompt, getPlanningPrompt, getReportPrompt, PLANNING_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT } from "./promts";
import { exa } from "./services";
import { ActivityTracker, ResearchFindings, ResearchState, SearchResult } from "./types";

import { z } from "zod";
import { combineFindings, handleError } from "./utils";
import { MAX_CONTENT_CHARS, MAX_ITERATIONS, MAX_SEARCH_RESULTS, MODELS } from "./constants";

export async function generateSearchQueries(researchState: ResearchState, activityTracker: ActivityTracker) {


    try{
        activityTracker.add( "planning","pending","Planning the research");

    const result  = await callModel({
        model: MODELS.PLANNING,
        prompt: getPlanningPrompt(researchState.topic, researchState.clarificationsText),
        system: PLANNING_SYSTEM_PROMPT,
        schema: z.object({
            searchQueries: z.array(z.string().min(1))
              .length(3)
              .describe("Exactly 3 search queries for comprehensive research")
        }),
        activityType: "planning"
    }, researchState, activityTracker);

    activityTracker.add( "planning","complete","Crafted the research plan");
    return result;
  } catch(error){
    return handleError(error, `Research planning`, activityTracker, "planning", {
      searchQueries: [`${researchState.topic} best practices`,`${researchState.topic} guidelines`, `${researchState.topic} examples`  ]
  })
  
  }
}

export async function search(
    query: string,
    ResearchState: ResearchState,
    activityTracker: ActivityTracker
): Promise<SearchResult[]>{

    activityTracker.add( "search","pending",`Searching for ${query}`);

    try{
        const searchResult = await exa.searchAndContents(
              query,
            {
              type: "keyword",
              numResults: MAX_SEARCH_RESULTS,
              startPublishedDate: new Date(Date.now() - 365*24*60*60*1000).toISOString(),
              endPublishedDate: new Date().toISOString(),
              startCrawlDate: new Date(Date.now() - 365*24*60*60*1000).toISOString(),
              endCrawlDate:  new Date().toISOString(),
              excludeDomains: ["https://www.youtube.com"],
              text: {
                maxCharacters: MAX_CONTENT_CHARS
              }
            }
          )

          const filteredResults = searchResult.results.filter(r => r.title && r.text != undefined).map(r => ({
            title: r.title || "",
            url: r.url,
            content: r.text || "",
          }))

          ResearchState.completedSteps++;
          activityTracker.add( "search","complete",`Found ${filteredResults.length} results for ${query}`);

          return filteredResults
          

    }catch(error){
           console.log("error: ", error);
           return handleError(error, `Searching for ${query}`, activityTracker, "search", []) || []
    }
}


export async function extractContent(
    content: string,
    url: string,
    researchState: ResearchState,
    activityTracker: ActivityTracker

  ) {

    try{
  
    activityTracker.add( "extract","pending",`Extracting content from ${url}`);

          const result = await callModel(
            {
              model: MODELS.EXTRACTION,
              prompt: getExtractionPrompt(
                content,
                researchState.topic,
                researchState.clarificationsText
              ),
              system: EXTRACTION_SYSTEM_PROMPT,
              schema: z.object({
                summary: z.string().describe("A comprehensive summary of the content"),
              }),
              activityType: "extract"
            },
            researchState, activityTracker
          );

          activityTracker.add( "extract","complete",`Extracted content from ${url}`);

                
          return {
            url,
            summary: (result as any).summary,
          };
        } catch(error){
          return handleError(error, `Content extraction from ${url}`, activityTracker, "extract", null) || null
      }
  }
  
  export async function processSearchResults(
    searchResults: SearchResult[],
    researchState: ResearchState,
    activityTracker: ActivityTracker

  ): Promise<ResearchFindings[]> {


    const extractionPromises = searchResults.map((result) =>
      extractContent(result.content, result.url, researchState, activityTracker)
    );

    const extractionResults = await Promise.allSettled(extractionPromises);
  
    type ExtractionResult = { url: string; summary: string };
  
    const newFindings = extractionResults.filter(
        (result): result is PromiseFulfilledResult<ExtractionResult> =>
          result.status === "fulfilled" &&
          result.value !== null &&
          result.value !== undefined
      )
      .map((result) => {
        const { summary, url } = result.value;
        return {
          summary,
          source: url,
        };
      });
  
    return newFindings;
  }
  
 
  
  export async function analyzeFindings(
    researchState: ResearchState,
    currentQueries: string[],
    currentIteration: number,
    activityTracker: ActivityTracker

) {
    try {
        activityTracker.add( "analyze","pending",`Analyzing research findings (iteration ${currentIteration}) of ${MAX_ITERATIONS}`);

        const contentText = combineFindings(researchState.findings);
  
        // Define the result type to avoid TypeScript errors
        type AnalysisResult = {
            sufficient: boolean;
            gaps: string | string[];
            queries: string[];
        };
        
        const result = await callModel<AnalysisResult>(
            {
                model: MODELS.ANALYSIS,
                prompt: getAnalysisPrompt(
                    contentText,
                    researchState.topic,
                    researchState.clarificationsText,
                    currentQueries,
                    currentIteration,
                    MAX_ITERATIONS,
                    contentText.length
                ),
                system: ANALYSIS_SYSTEM_PROMPT,
                schema: z.object({
                    sufficient: z.boolean()
                        .describe("Whether the collected content is sufficient for a useful report"),
                    gaps: z.union([
                        z.string().describe("Identified gaps in the content as a text description"),
                        z.array(z.string()).describe("Identified gaps in the content as a list")
                    ]),
                    queries: z.array(z.string())
                        .describe("Search queries for missing information. Max 3 queries."),
                }),
                activityType: "analyze"
            },
            researchState , activityTracker
        );
      
        // Create a normalized copy of the result using a type assertion to ensure TypeScript knows it's an object
        const normalizedResult: AnalysisResult = result as AnalysisResult;
        
        // Handle the gaps normalization
        if (typeof normalizedResult.gaps === 'string') {
            // Convert string into an array by splitting on bullet points or newlines
            const gapsText = normalizedResult.gaps;
            const gapsArray = gapsText
                .split(/\n-|\r\n-/)  // Split on newline followed by dash (bullet points)
                .map((item: string) => item.trim())
                .filter((item: string) => item.length > 0);
                
            // Replace the string with the array
            normalizedResult.gaps = gapsArray.length > 0 ? gapsArray : [gapsText];
        }
        
        const isContentSufficient = typeof result !== 'string' && result.sufficient
        activityTracker.add("analyze", "complete", `Analyzed the collected research findings: ${isContentSufficient ? 'content is sufficient' : 'More research is needed!'}`);

        return normalizedResult;
    } catch (error) {
        console.log("Error in analyzeFindings:", error);
        // Return a default response to prevent the research process from breaking
        return {
            sufficient: false,
            gaps: ["Error analyzing findings, continuing with research"],
        };
    }
}
  
  export async function generateReport(
    researchState: ResearchState, 
    activityTracker: ActivityTracker
  ) {
    try {
      activityTracker.add("generate","pending",`Geneating comprehensive report!`);
  
      const contentText = combineFindings(researchState.findings);
  
      const report = await callModel(
        {
          model: MODELS.REPORT,
          prompt: getReportPrompt(
            contentText,
            researchState.topic,
            researchState.clarificationsText
          ),
          system: REPORT_SYSTEM_PROMPT,
          activityType: "generate"
        },
        researchState, activityTracker
      );
  
      activityTracker.add("generate","complete",`Generated comprehensive report, Total tokens used: ${researchState.tokenUsed}. Research completed in ${researchState.completedSteps} steps.`);
  
      return report;
    } catch (error) {
      console.log(error);
     return handleError(error, `Report Generation`, activityTracker, "generate", "Error generating report. Please try again. ")
    }
  }  