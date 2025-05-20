'use client';

import React from 'react';
import Link from 'next/link';

export default function InsightsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Insights Page</h1>
      <p className="mb-4">This is a simple version of the insights page for debugging.</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Back to Home
      </Link>
    </div>
  );
} 