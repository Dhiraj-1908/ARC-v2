// researchpapers/api/researchapi.ts
export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  category: string;
  publishedDate: string;
  url: string;
  pdfUrl: string;
}

export type ResearchFieldType = 'cs' | 'physics' | 'math' | 'biology' | 'medicine' | 'all';

/**
 * Fetches latest papers from ArXiv based on the research field
 */
export async function fetchLatestPapers(field: ResearchFieldType = 'all', maxResults: number = 10): Promise<Paper[]> {
  try {
    // Construct query based on field
    let query = '';
    
    switch (field) {
      case 'cs':
        query = 'cat:cs.*';
        break;
      case 'physics':
        query = 'cat:physics.*';
        break;
      case 'math':
        query = 'cat:math.*';
        break;
      case 'biology':
        query = 'cat:q-bio.*';
        break;
      case 'medicine':
        query = 'cat:q-bio.* OR cat:physics.med-ph';
        break;
      case 'all':
      default:
        query = 'all';
        break;
    }
    
    // Encode the query parameters
    const encodedQuery = encodeURIComponent(query);
    const sortBy = 'submittedDate';
    const sortOrder = 'descending';
    
    const url = `https://export.arxiv.org/api/query?search_query=${encodedQuery}&start=0&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    
    return await fetchAndParseArxivResults(url);
  } catch (error) {
    console.error("Error fetching ArXiv data:", error);
    throw error;
  }
}

/**
 * Searches for papers on ArXiv based on query and field
 */
export async function searchArxivPapers(searchQuery: string, field: ResearchFieldType = 'all', maxResults: number = 10): Promise<Paper[]> {
  try {
    if (!searchQuery.trim()) {
      return fetchLatestPapers(field, maxResults);
    }
    
    // Construct field-specific query
    let fieldQuery = '';
    switch (field) {
      case 'cs':
        fieldQuery = 'AND cat:cs.*';
        break;
      case 'physics':
        fieldQuery = 'AND cat:physics.*';
        break;
      case 'math':
        fieldQuery = 'AND cat:math.*';
        break;
      case 'biology':
        fieldQuery = 'AND cat:q-bio.*';
        break;
      case 'medicine':
        fieldQuery = 'AND (cat:q-bio.* OR cat:physics.med-ph)';
        break;
      case 'all':
      default:
        fieldQuery = '';
        break;
    }
    
    // Format search query for ArXiv API
    // Search in title, abstract, and author fields
    const formattedQuery = `(ti:"${searchQuery}" OR abs:"${searchQuery}" OR au:"${searchQuery}") ${fieldQuery}`;
    const encodedQuery = encodeURIComponent(formattedQuery);
    
    const url = `https://export.arxiv.org/api/query?search_query=${encodedQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;
    
    return await fetchAndParseArxivResults(url);
  } catch (error) {
    console.error("Error searching ArXiv data:", error);
    throw error;
  }
}

/**
 * Helper function to fetch and parse ArXiv API results
 */
async function fetchAndParseArxivResults(url: string): Promise<Paper[]> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`ArXiv API error: ${response.statusText}`);
  }
  
  const data = await response.text();
  
  // Parse the XML response
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, "text/xml");
  
  // Extract entries
  const entries = Array.from(xmlDoc.getElementsByTagName("entry"));
  
  // Map entries to our Paper interface
  return entries.map(entry => {
    const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() || "";
    const summary = entry.getElementsByTagName("summary")[0]?.textContent?.trim() || "";
    const published = entry.getElementsByTagName("published")[0]?.textContent || "";
    const id = entry.getElementsByTagName("id")[0]?.textContent || "";
    const arxivId = id.split('/').pop()?.split('v')[0] || "";
    
    // Get authors
    const authorElements = entry.getElementsByTagName("author");
    const authors = Array.from(authorElements).map(author => 
      author.getElementsByTagName("name")[0]?.textContent || ""
    );
    
    // Get primary category
    const primaryCategory = entry.getElementsByTagName("category")[0]?.getAttribute("term") || "";
    
    // Get PDF link
    const links = Array.from(entry.getElementsByTagName("link"));
    const pdfLink = links.find(link => link.getAttribute("title") === "pdf")?.getAttribute("href") || "";
    
    return {
      id: arxivId,
      title,
      authors,
      abstract: summary,
      category: primaryCategory,
      publishedDate: published,
      url: `https://arxiv.org/abs/${arxivId}`,
      pdfUrl: pdfLink
    };
  });
}