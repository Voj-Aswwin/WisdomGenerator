'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import DOMPurify from 'dompurify';

export default function NewsletterPage() {
  const router = useRouter();
  const params = useParams();
  const { filename } = params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isProcessed, setIsProcessed] = useState(false);
  
  useEffect(() => {
    if (filename) {
      fetchNewsletter(decodeURIComponent(filename as string));
    }
  }, [filename]);
  
  const fetchNewsletter = async (filename: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/get-newsletter-content?filename=${encodeURIComponent(filename)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch newsletter content');
      }
      
      const data = await response.json();
      setHtmlContent(data.content);
      setIsProcessed(data.isProcessed);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching newsletter:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to safely sanitize HTML
  const sanitizeHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 
        'b', 'strong', 'i', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
        'blockquote', 'q', 'cite', 'pre', 'code', 'img', 'br', 'hr',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
        'span', 'div', 'section', 'article', 'header', 'footer'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id', 'name', 'style',
        'target', 'rel', 'width', 'height'
      ],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });
  };
  
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white py-4 z-10 border-b">
          <ShimmerButton
            className="rounded-xl bg-blue-100 px-4 py-2 font-medium text-blue-800 hover:bg-blue-200"
            onClick={() => router.push('/')}
          >
            ← Back to Newsletters
          </ShimmerButton>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-40 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ) : (
          <div className="newsletter-content">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: sanitizeHtml(htmlContent)
              }} 
              className="newsletter-html"
            />
          </div>
        )}
      </div>
      
      {/* Add global styles for newsletter content */}
      <style jsx global>{`
        .newsletter-html {
          max-width: 100%;
          overflow-x: hidden;
        }
        
        .newsletter-html img {
          max-width: 100%;
          height: auto;
        }
        
        .newsletter-html a {
          color: #3182ce;
          text-decoration: underline;
        }
        
        .newsletter-html h1, 
        .newsletter-html h2, 
        .newsletter-html h3, 
        .newsletter-html h4, 
        .newsletter-html h5, 
        .newsletter-html h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
          line-height: 1.25;
        }
        
        .newsletter-html h1 {
          font-size: 2em;
        }
        
        .newsletter-html h2 {
          font-size: 1.5em;
        }
        
        .newsletter-html h3 {
          font-size: 1.25em;
        }
        
        .newsletter-html p,
        .newsletter-html ul,
        .newsletter-html ol {
          margin-bottom: 1em;
          line-height: 1.6;
        }
        
        .newsletter-html ul,
        .newsletter-html ol {
          padding-left: 1.5em;
        }
        
        .newsletter-html ul {
          list-style-type: disc;
        }
        
        .newsletter-html ol {
          list-style-type: decimal;
        }
        
        .newsletter-html blockquote {
          border-left: 4px solid #e2e8f0;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
        }
        
        .newsletter-html pre {
          background-color: #f7fafc;
          border-radius: 0.25rem;
          padding: 1em;
          overflow-x: auto;
        }
        
        .newsletter-html table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
        }
        
        .newsletter-html th,
        .newsletter-html td {
          border: 1px solid #e2e8f0;
          padding: 0.5rem;
        }
        
        .newsletter-html th {
          background-color: #f7fafc;
        }
        
        /* Fix common email newsletter formatting issues */
        .newsletter-html .body,
        .newsletter-html .email-body,
        .newsletter-html .email-content {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .newsletter-html table[width="600"],
        .newsletter-html table[width="640"],
        .newsletter-html table[width="720"] {
          width: 100% !important;
        }
      `}</style>
    </div>
  );
} 