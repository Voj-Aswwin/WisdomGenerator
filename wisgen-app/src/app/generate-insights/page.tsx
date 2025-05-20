'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShimmerButton } from "@/components/magicui/shimmer-button";

export default function GenerateInsightsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [insightsContent, setInsightsContent] = useState<string>('');

  useEffect(() => {
    // Run the Python script directly when the page loads
    runPythonScript();
  }, []);

  const runPythonScript = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Show a simple loading message
      setSuccess('Generating insights... This may take a minute.');
      
      // Create a timestamp to create a unique request (avoid caching)
      const timestamp = new Date().getTime();
      
      // Simple approach: Make a single GET request to a simple endpoint
      const response = await fetch(`/api/run-python-script?ts=${timestamp}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate insights');
      }
      
      const data = await response.json();
      setSuccess('Insights generated successfully!');
      
      // Now get the content
      const contentResponse = await fetch('/api/get-insights-content');
      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        setInsightsContent(contentData.content || 'No content available');
      } else {
        throw new Error('Generated insights but failed to retrieve content');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Insights Analysis</h1>
        <ShimmerButton
          className="rounded-xl bg-blue-100 px-6 py-3 font-medium text-blue-800 hover:bg-blue-200"
          onClick={handleBack}
        >
          Back to Home
        </ShimmerButton>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="text-xl mb-4">Generating insights...</div>
          <div className="text-sm text-gray-500">This may take a minute or two.</div>
          {success && <div className="mt-4 text-green-600">{success}</div>}
        </div>
      ) : error ? (
        <div className="bg-red-100 p-6 rounded-lg text-red-700">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <div className="mt-4">
            <ShimmerButton 
              className="bg-red-200 px-4 py-2 text-red-800 hover:bg-red-300 rounded-lg"
              onClick={runPythonScript}
            >
              Try Again
            </ShimmerButton>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-8 overflow-auto">
          {success && <div className="mb-6 text-green-600">{success}</div>}
          
          <div className="insights-content">
            {/* Render HTML content safely */}
            <div 
              dangerouslySetInnerHTML={{ __html: insightsContent }} 
              className="styled-insights"
            />
          </div>
        </div>
      )}
    </div>
  );
} 