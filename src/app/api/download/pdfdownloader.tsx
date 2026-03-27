import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Create PDF styles - Fixed version to prevent layout errors
const createPdfStyles = () => {
  return StyleSheet.create({
    page: {
      padding: 50,
      backgroundColor: '#ffffff',
      fontFamily: 'Helvetica',
      fontSize: 11,
      lineHeight: 1.6,
      color: '#111827',
    },
    
    // Header styles - Fixed flexDirection and positioning
    header: {
      marginBottom: 25,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      // Removed flexDirection: 'row' and justifyContent/alignItems that can cause issues
    },
    
    headerContent: {
      // Simplified header content without flex positioning
    },
    
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#2563eb',
      marginBottom: 5,
      lineHeight: 1,
      fontFamily: 'Helvetica-Bold', // Use specific font variant
    },
    
    subtitle: {
      fontSize: 14,
      color: '#4b5563',
      fontFamily: 'Helvetica',
    },
    
    // Section styles
    section: {
      marginVertical: 14,
    },
    
    // Typography - Fixed margin values
    h1: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#2563eb',
      marginTop: 20,
      marginBottom: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      fontFamily: 'Helvetica-Bold',
      lineHeight: 1.2,
    },
    
    h2: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#2563eb',
      marginTop: 18,
      marginBottom: 14,
      fontFamily: 'Helvetica-Bold',
      lineHeight: 1.2,
    },
    
    h3: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#2563eb',
      marginTop: 16,
      marginBottom: 12,
      fontFamily: 'Helvetica-Bold',
      lineHeight: 1.2,
    },
    
    h4: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#2563eb',
      marginTop: 14,
      marginBottom: 10,
      fontFamily: 'Helvetica-Bold',
      lineHeight: 1.2,
    },
    
    h5: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#2563eb',
      marginTop: 12,
      marginBottom: 8,
      fontFamily: 'Helvetica-Bold',
      lineHeight: 1.2,
    },
    
    h6: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#2563eb',
      marginTop: 12,
      marginBottom: 6,
      fontFamily: 'Helvetica-Bold',
      lineHeight: 1.2,
    },
    
    paragraph: {
      fontSize: 11,
      marginBottom: 12,
      lineHeight: 1.6,
      fontFamily: 'Helvetica',
      color: '#111827',
    },
    
    // Code styles
    codeBlock: {
      marginVertical: 12,
      padding: 12,
      backgroundColor: '#f3f4f6',
      // Removed borderRadius as it can cause issues in some cases
    },
    
    codeContent: {
      fontFamily: 'Courier',
      fontSize: 9,
      color: '#111827',
      lineHeight: 1.4,
    },
    
    inlineCode: {
      fontFamily: 'Courier',
      fontSize: 10,
      backgroundColor: '#f3f4f6',
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    
    // List styles - Simplified to prevent flex issues
    listContainer: {
      marginVertical: 12,
      paddingLeft: 20, // Fixed padding value
    },
    
    listItem: {
      marginBottom: 6, // Simplified margin
    },
    
    listItemText: {
      fontSize: 11,
      lineHeight: 1.6,
      fontFamily: 'Helvetica',
      color: '#111827',
    },
    
    // Bold text style
    boldText: {
      fontWeight: 'bold',
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    
    // Quote styles
    blockquote: {
      marginVertical: 12,
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: '#f3f4f6',
      borderLeftWidth: 4,
      borderLeftColor: '#3b82f6',
    },
    
    blockquoteText: {
      fontSize: 11,
      fontStyle: 'italic',
      color: '#4b5563',
      lineHeight: 1.6,
      fontFamily: 'Helvetica-Oblique',
    },
    
    // Table styles - Simplified to prevent layout issues
    table: {
      marginVertical: 14,
      borderWidth: 1,
      borderColor: '#e5e7eb',
    },
    
    tableRow: {
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      minHeight: 30, // Ensure minimum height
    },
    
    tableHeader: {
      backgroundColor: '#f9fafb',
    },
    
    tableCell: {
      padding: 8,
      fontSize: 10,
      color: '#111827',
      fontFamily: 'Helvetica',
      minWidth: 50, // Ensure minimum width
    },
    
    tableCellHeader: {
      padding: 8,
      fontSize: 10,
      fontWeight: 'bold',
      backgroundColor: '#f9fafb',
      color: '#111827',
      fontFamily: 'Helvetica-Bold',
      minWidth: 50,
    },
    
    // Image styles
    image: {
      marginVertical: 12,
      maxWidth: 500, // Prevent images from being too large
      maxHeight: 400,
    },
    
    // Divider styles
    divider: {
      marginVertical: 12,
      height: 1,
      backgroundColor: '#e5e7eb',
    },
    
    // Footer styles - Fixed positioning issues
    footer: {
      marginTop: 30,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      fontSize: 8,
      color: '#6b7280',
      textAlign: 'center', // Simplified footer layout
    },
  });
};

// Function to render formatted text with bold support
const renderFormattedText = (text: string, styles: ReturnType<typeof createPdfStyles>) => {
  if (!text) return '';
  
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part: string, index: number) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const boldText = part.slice(2, -2);
      return <Text key={index} style={styles.boldText}>{boldText}</Text>;
    }
    return part || '';
  });
};

// Type definitions for content items
interface ContentItem {
  type: string;
  content?: string;
  level?: number;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  src?: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  language?: string;
}

interface ContentRendererProps {
  item: ContentItem;
  styles: ReturnType<typeof createPdfStyles>;
}

// Content renderer component - Fixed to prevent layout issues
const ContentRenderer: React.FC<ContentRendererProps> = ({ item, styles }) => {
  switch (item.type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return (
        <Text style={styles[item.type as keyof typeof styles]}>
          {renderFormattedText(item.content || '', styles)}
        </Text>
      );
      
    case 'paragraph':
      return (
        <Text style={styles.paragraph}>
          {renderFormattedText(item.content || '', styles)}
        </Text>
      );
      
    case 'code':
      return (
        <View style={styles.codeBlock}>
          <Text style={styles.codeContent}>{item.content || ''}</Text>
        </View>
      );
      
    case 'blockquote':
      return (
        <View style={styles.blockquote}>
          <Text style={styles.blockquoteText}>
            {renderFormattedText(item.content || '', styles)}
          </Text>
        </View>
      );
      
    case 'list':
      return (
        <View style={styles.listContainer}>
          {item.items?.map((listItem: string, i: number) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listItemText}>
                • {renderFormattedText(listItem, styles)}
              </Text>
            </View>
          ))}
        </View>
      );
      
    case 'numbered-list':
      return (
        <View style={styles.listContainer}>
          {item.items?.map((listItem: string, i: number) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listItemText}>
                {`${i + 1}. `}{renderFormattedText(listItem, styles)}
              </Text>
            </View>
          ))}
        </View>
      );
      
    case 'table':
      if (!item.rows || item.rows.length === 0) return null;

      return (
        <View style={styles.table}>
          {/* Header row */}
          {item.headers && item.headers.length > 0 && (
            <View style={[styles.tableRow, styles.tableHeader]}>
              {item.headers.map((header: string, i: number) => (
                <View key={i} style={styles.tableCellHeader}>
                  <Text>{renderFormattedText(header, styles)}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Table rows */}
          {item.rows.map((row: string[], rowIndex: number) => (
            <View key={rowIndex} style={styles.tableRow}>
              {row.map((cell: string, cellIndex: number) => (
                <View key={cellIndex} style={styles.tableCell}>
                  <Text>{renderFormattedText(cell, styles)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
      
    case 'image':
      if (!item.src) return null;
      
      // Ensure image dimensions are reasonable
      const imageWidth = Math.min(item.width || 400, 500);
      const imageHeight = Math.min(item.height || 300, 400);
      
      return (
        <View style={styles.image}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image 
            src={item.src} 
            style={{ 
              width: imageWidth, 
              height: imageHeight,
              objectFit: 'contain' // Prevent image distortion
            }} 
          />
        </View>
      );
      
    case 'divider':
    case 'hr':
      return <View style={styles.divider} />;
      
    default:
      return null;
  }
};

// Fixed context interface
interface ParsingContext {
  inCodeBlock: boolean;
  codeLanguage: string | null;
  inList: boolean;
  inNumberedList: boolean;
  inBlockquote: boolean;
  inTable: boolean;
  tableHeaders: string[];
  tableRows: string[][];
  tempContent: string[];
  listItems: string[];
}

// Keep the same markdown parser but with proper typing
export const parseMarkdownForPdf = (markdown: string): ContentItem[] => {
  const lines = markdown.split('\n');
  const result: ContentItem[] = [];
  
  let currentContext: ParsingContext = {
    inCodeBlock: false,
    codeLanguage: null,
    inList: false,
    inNumberedList: false,
    inBlockquote: false,
    inTable: false,
    tableHeaders: [],
    tableRows: [],
    tempContent: [],
    listItems: [],
  };

  const flushContext = () => {
    if (currentContext.inCodeBlock && currentContext.tempContent.length > 0) {
      result.push({
        type: 'code',
        content: currentContext.tempContent.join('\n'),
        language: currentContext.codeLanguage || undefined,
      });
    } else if (currentContext.inList && currentContext.listItems.length > 0) {
      result.push({
        type: 'list',
        items: [...currentContext.listItems]
      });
    } else if (currentContext.inNumberedList && currentContext.listItems.length > 0) {
      result.push({
        type: 'numbered-list',
        items: [...currentContext.listItems]
      });
    } else if (currentContext.inBlockquote && currentContext.tempContent.length > 0) {
      result.push({
        type: 'blockquote',
        content: currentContext.tempContent.join('\n').replace(/^>\s*/gm, '')
      });
    } else if (currentContext.inTable) {
      result.push({
        type: 'table',
        headers: currentContext.tableHeaders,
        rows: currentContext.tableRows
      });
    } else if (currentContext.tempContent.length > 0) {
      const content = currentContext.tempContent.join('\n').trim();
      if (content) {
        result.push({
          type: 'paragraph',
          content
        });
      }
    }

    // Reset context with proper typing
    currentContext = {
      inCodeBlock: false,
      codeLanguage: null,
      inList: false,
      inNumberedList: false,
      inBlockquote: false,
      inTable: false,
      tableHeaders: [],
      tableRows: [],
      tempContent: [],
      listItems: [],
    };
  };

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (!currentContext.inCodeBlock) {
        flushContext();
        currentContext.inCodeBlock = true;
        const langMatch = line.trim().match(/^```(\w+)$/);
        currentContext.codeLanguage = langMatch ? langMatch[1] : null;
      } else {
        flushContext();
      }
      continue;
    }

    if (currentContext.inCodeBlock) {
      currentContext.tempContent.push(line);
      continue;
    }

    // Handle headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      flushContext();
      const level = headerMatch[1].length;
      result.push({
        type: `h${level}`,
        content: headerMatch[2].trim(),
        level
      });
      continue;
    }

    // Handle horizontal rules
    if (line.trim().match(/^[-*_]{3,}$/)) {
      flushContext();
      result.push({ type: 'divider' });
      continue;
    }

    // Handle tables
    if (line.includes('|')) {
      const cells = line.split('|').filter(cell => cell !== '');
      
      if (cells.length > 0) {
        if (line.trim().match(/^\|?\s*[-:]+[-:|\s]*$/)) {
          currentContext.inTable = true;
          continue;
        }
        
        if (!currentContext.inTable) {
          flushContext();
          currentContext.inTable = true;
          currentContext.tableHeaders = cells.map(cell => cell.trim());
        } else if (cells.length === currentContext.tableHeaders.length) {
          currentContext.tableRows.push(cells.map(cell => cell.trim()));
        }
        continue;
      }
    } else if (currentContext.inTable) {
      flushContext();
    }

    // Handle lists
    const unorderedListMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    if (unorderedListMatch) {
      if (!currentContext.inList) {
        flushContext();
        currentContext.inList = true;
      }
      currentContext.listItems.push(unorderedListMatch[1]);
      continue;
    }

    const orderedListMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (orderedListMatch) {
      if (!currentContext.inNumberedList) {
        flushContext();
        currentContext.inNumberedList = true;
      }
      currentContext.listItems.push(orderedListMatch[1]);
      continue;
    }

    // Handle blockquotes
    if (line.trim().startsWith('>')) {
      if (!currentContext.inBlockquote) {
        flushContext();
        currentContext.inBlockquote = true;
      }
      currentContext.tempContent.push(line);
      continue;
    }

    // Handle images
    const imageMatch = line.match(/!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)/);
    if (imageMatch) {
      flushContext();
      result.push({
        type: 'image',
        alt: imageMatch[1],
        src: imageMatch[2],
        title: imageMatch[3] || '',
      });
      continue;
    }

    // Handle empty lines
    if (line.trim() === '') {
      if (currentContext.inList || currentContext.inNumberedList || 
          currentContext.inBlockquote || currentContext.inTable) {
        flushContext();
      } else if (currentContext.tempContent.length > 0) {
        flushContext();
      }
      continue;
    }

    // Regular content
    if (!currentContext.inList && !currentContext.inNumberedList && 
        !currentContext.inBlockquote && !currentContext.inTable) {
      currentContext.tempContent.push(line);
    } else {
      flushContext();
      currentContext.tempContent.push(line);
    }
  }

  // Flush any remaining content
  flushContext();

  return result;
};

interface ResearchReportPdfProps {
  topic: string;
  content: string;
}

// Main PDF Document Component - Simplified layout
const ResearchReportPdf: React.FC<ResearchReportPdfProps> = ({ topic, content }) => {
  const parsedContent = parseMarkdownForPdf(content);
  const styles = createPdfStyles();
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Simplified Header section */}
        <View style={styles.header}>
          <Text style={styles.title}>{topic}</Text>
          <Text style={styles.subtitle}>Research Report</Text>
        </View>

        {/* Document Content */}
        <View style={styles.section}>
          {parsedContent.map((item, index) => (
            <ContentRenderer key={index} item={item} styles={styles} />
          ))}
        </View>

        {/* Simplified Footer */}
        <View style={styles.footer}>
          <Text>{topic} | Research Report</Text>
        </View>
      </Page>
    </Document>
  );
};

// PDF Generation Service with better error handling
export class EnhancedPdfGenerationService {
  static async generatePdf(topic: string, content: string) {
    try {
      // Validate inputs
      if (!topic || !content) {
        throw new Error('Topic and content are required');
      }

      // Import the pdf function only when needed
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(<ResearchReportPdf topic={topic} content={content} />).toBlob();
      
      if (!blob) {
        throw new Error('Failed to generate PDF blob');
      }
      
      return blob;
    } catch (error) {
      console.error("PDF generation failed:", error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async downloadPdf(topic: string, content: string) {
    try {
      const blob = await this.generatePdf(topic, content);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${topic.toLowerCase().replace(/\s+/g, '-')}-research-report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
      throw error;
    }
  }
}