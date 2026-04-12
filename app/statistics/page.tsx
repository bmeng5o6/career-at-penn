import React from 'react';
import Navbar from '../components/Navbar';

// 1. Define dummy data
const STATS_DATA = [
  { label: "85% of Finance concentrators secured IB/PE/HF internships by junior summer", icon: "📈" },
  { label: "Stats + CIS dual majors had the highest starting salaries across all Penn schools", icon: "📖" },
  { label: "Management concentrators in consulting clubs: 60% MBB placement rate", icon: "👥" },
  { label: "Real Estate concentrators with local internships had 90% Philly job placement", icon: "⭐" },
];

const PATH_DATA = [
  {
    insight: "Finance concentrators in the Wharton Undergraduate Finance Club who took FNCE 2070 overwhelmingly placed into PE/HF",
    tags: ["FNCE 1010", "FNCE 1070", "STAT 1020", "Wharton Finance Club"],
    path: "Goldman Sachs → Blackstone"
  },
  {
    insight: "Quant-focused Wharton students with CIS cross-enrollment dominated quantitative trading roles",
    tags: ["FNCE 1070", "FNCE 1070", "CIS 1100", "Penn Blockchain", "Sigma Eta Pi"],
    path: "Citadel → Two Sigma"
  }
];

export default function StatisticsPage() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto py-12 px-6">
        <h2 className="text-xl font-bold text-zinc-900">Quad-School Intelligence</h2>
        <p className="text-zinc-500 mb-8">
          Personalized for <span className="font-semibold text-zinc-700">Healthcare Management</span> at <span className="font-semibold text-zinc-700">Wharton</span>, Class of 2026
        </p>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {STATS_DATA.map((stat, i) => (
            <div key={i} className="flex items-center p-6 bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <span className="text-2xl mr-4">{stat.icon}</span>
              <p className="text-sm font-medium text-zinc-800">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Placeholder for Chart */}
        <div className="bg-white border border-zinc-200 rounded-xl p-8 mb-12 shadow-sm">
          <h3 className="text-lg font-bold mb-6 text-zinc-800 underline decoration-zinc-300">Wharton → Full-Time Outcomes</h3>
          <div className="h-48 w-full bg-zinc-50 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-200">
            <p className="text-zinc-400 font-mono text-sm">[ Bar Chart Component Goes Here ]</p>
          </div>
        </div>

        {/* Alumni Path Intelligence */}
        <h2 className="text-xl font-bold text-zinc-900 mb-6">Alumni Path Intelligence</h2>
        <div className="space-y-4">
          {PATH_DATA.map((item, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
              <p className="italic text-zinc-700 mb-4">"{item.insight}"</p>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {item.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-200">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Path: <span className="text-zinc-600">{item.path}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}