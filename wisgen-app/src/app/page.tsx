'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RetroGrid } from "@/components/magicui/retro-grid";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { FlipText } from "@/components/magicui/flip-text";
import { MorphingText } from "@/components/magicui/morphing-text";
import { Globe } from "@/components/magicui/globe";



interface Newsletter {
  subject: string;
  source: string;
  date: string;
  filename: string;
  processedFilename?: string;
}

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [hasNewsletters, setHasNewsletters] = useState(false);
  const [insightsGenerated, setInsightsGenerated] = useState(false);

  // Check if newsletters exist on load
  useEffect(() => {
    checkNewsletters();
  }, []);

  const checkNewsletters = async () => {
    try {
      const response = await fetch('/api/get-newsletters', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.newsletters && data.newsletters.length > 0) {
          setNewsletters(data.newsletters);
          setHasNewsletters(true);
        } else {
          setHasNewsletters(false);
        }
      } else {
        // If API doesn't exist yet, don't show error
        setHasNewsletters(false);
      }
    } catch (err) {
      // If API doesn't exist yet, don't show error
      setHasNewsletters(false);
    }
  };

  const handlePullNewsletters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/pull-newsletters', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to pull newsletters');
      }

      setSuccess(data.message || 'Newsletters pulled successfully');
      console.log('Newsletters pulled successfully:', data);

      // After successfully pulling newsletters, check for them
      await checkNewsletters();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error pulling newsletters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/analyze-insights', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to analyze insights');
      }

      setSuccess(data.message || 'Insights analysis generated successfully');
      console.log('Insights analysis generated:', data);

      // Set insights as generated so we can show "Read Deep Insights" button
      setInsightsGenerated(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error analyzing insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInsights = () => {
    // Use Next.js router instead of window.location
    router.push('/insights');
  };

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{
        backgroundImage: "url('/NewspaperBackground.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Side Section */}
      <div className="relative w-2/5 overflow-hidden" style={{
        background: "linear-gradient(135deg, #2c3e50, #34495e, #2980b9)",
        boxShadow: "inset 0 0 30px rgba(255, 255, 255, 0.1)"
      }}>
        {/* RetroGrid always visible */}
        <div className="absolute inset-0 z-10 opacity-60">
          <div className="relative h-full w-full">
            <RetroGrid
              className="h-full"
              angle={15}
              cellSize={40}
              opacity={0.25}
              lightLineColor="#ecf0f1"
              darkLineColor="#bdc3c7"
            />
          </div>
        </div>

        {/* Conditional content based on hasNewsletters */}
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          {hasNewsletters ? (
            <div className="w-4/5 h-4/5">
              <Globe 
                config={{
                  width: 800,
                  height: 800,
                  onRender: () => {},
                  devicePixelRatio: 2,
                  phi: 0,
                  theta: 0.3,
                  dark: 0,
                  diffuse: 0.2,
                  mapSamples: 16000,
                  mapBrightness: 0.7,
                  baseColor: [1, 1, 1],
                  markerColor: [251 / 255, 100 / 255, 21 / 255],
                  glowColor: [1, 1, 1],
                  markers: [
                    { location: [14.5995, 120.9842], size: 0.03 },
                    { location: [19.076, 72.8777], size: 0.1 },
                    { location: [23.8103, 90.4125], size: 0.05 },
                    { location: [30.0444, 31.2357], size: 0.07 },
                    { location: [39.9042, 116.4074], size: 0.08 },
                    { location: [-23.5505, -46.6333], size: 0.1 },
                    { location: [19.4326, -99.1332], size: 0.1 },
                    { location: [40.7128, -74.006], size: 0.1 },
                    { location: [34.6937, 135.5022], size: 0.05 },
                    { location: [41.0082, 28.9784], size: 0.06 },
                  ],
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full px-4 -translate-y-[67px]">
              <MorphingText
                className="text-4xl md:text-5xl font-bold text-white drop-shadow-md text-center"
                texts={["Daily Newsletters", "Deep Insights", "Curated for You", "With Gemini AI"]}
              />
            </div>
          )}
        </div>
      </div>
      {/* Main Content Section */}
      <div className="relative w-3/5 flex flex-1 flex-col h-full bg-white/20 rounded-r-3xl shadow-lg">
        {hasNewsletters ? (
          // Show newsletters view with scrollable content
          <div className="flex flex-col h-full">
            {/* Fixed Header */}
            <div className="p-10 pb-4">
              <div className="text-4xl font-bold mb-4">
                <FlipText>Newsletters for Today</FlipText>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-10 pb-4">
              <div className="flex flex-col space-y-4">
                {newsletters.map((newsletter, index) => (
                  <a
                    key={index}
                    href={`/newsletter/${encodeURIComponent(newsletter.processedFilename || newsletter.filename)}`}
                    className="text-xl font-medium text-gray-800 hover:text-blue-600 decoration-4 decoration-gray-800 hover:decoration-blue-600 transition-all duration-200"
                  >
                    🗞️ {newsletter.subject} - {newsletter.source}
                  </a>
                ))}

                {/* If no newsletters in array but hasNewsletters is true */}
                {newsletters.length === 0 && (
                  <div className="text-xl text-gray-600">
                    <p>Yourstory News Letter - Subject</p>
                    <p>Mint Newsletter - Subject</p>
                    <p>Daily Brief Newsletter</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer with Buttons */}
            <div className="p-10 pt-4 border-t bg-white/20">
              <div className="flex w-full space-x-4">
                <ShimmerButton
                  className="flex-1 rounded-xl bg-teal-200 px-8 py-4 font-medium text-teal-900 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePullNewsletters}
                  disabled={isLoading}
                >
                  {isLoading ? 'Working...' : 'Refresh Newsletters'}
                </ShimmerButton>

                <ShimmerButton
                  className="flex-1 rounded-xl bg-emerald-200 px-8 py-4 font-medium text-emerald-900 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => router.push('/generate-insights')}
                  disabled={isLoading}
                >
                  {isLoading ? 'Working...' : 'Generate & View Insights'}
                </ShimmerButton>
              </div>

              {error && (
                <p className="mt-4 text-red-500 text-sm max-w-md text-center w-full">{error}</p>
              )}

              {success && (
                <p className="mt-4 text-green-500 text-sm max-w-md text-center w-full">{success}</p>
              )}
            </div>
          </div>
        ) : (
          // Show empty state
          <div className="flex flex-col items-center justify-center w-full h-full p-10">
            <Image
              src="/no-newsletters.png"
              alt="No Newsletters Available"
              width={120}
              height={120}
              className="object-contain mb-6"
            />
            <ShimmerButton
              className="rounded-xl bg-teal-200 px-8 py-4 font-medium text-teal-900 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePullNewsletters}
              disabled={isLoading}
            >
              {isLoading ? 'Pulling Newsletters...' : 'Pull Newsletters'}
            </ShimmerButton>
          </div>
        )}
      </div>
    </div>
  );
}