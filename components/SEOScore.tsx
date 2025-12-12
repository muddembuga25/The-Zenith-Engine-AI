
import React, { useState, useEffect } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { SeoChecklist } from '../types';
import { CheckCircleIcon, XCircleIcon } from './Icons';

interface SEOScoreProps {
  score: number;
  checklist: SeoChecklist;
}

const ChecklistItem: React.FC<{ label: string; checked: boolean; delay: number }> = ({ label, checked, delay }) => (
  <li className="flex items-center text-sm animate-fade-in-up" style={{ animationDelay: `${delay}ms`, opacity: 0, animationFillMode: 'forwards' }}>
    {checked ? (
      <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
    )}
    <span className={checked ? 'text-text-primary' : 'text-text-secondary'}>{label}</span>
  </li>
);

export const SEOScore: React.FC<SEOScoreProps> = ({ score, checklist }) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const animationDuration = 800; // ms
    const frameRate = 60; // fps
    const totalFrames = (animationDuration / 1000) * frameRate;
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const currentScore = Math.floor(score * progress);
      setDisplayScore(currentScore);
      
      if (frame >= totalFrames) {
        clearInterval(counter);
      }
    }, 1000 / frameRate);

    return () => clearInterval(counter);
  }, [score]);


  const scoreColor = score > 85 ? '#22c55e' : score > 60 ? '#f59e0b' : '#ef4444';
  const data = [{ name: 'score', value: score }];

  const checklistItems = [
      { section: "GEO Essentials", items: [
          { label: "Optimal title length (50-60 chars)", checked: checklist.titleLength },
          { label: "Meta description length (120-155 chars)", checked: checklist.metaDescriptionLength },
          { label: "Natural Language Optimization (Title)", checked: checklist.keywordInTitle },
          { label: "Contextual Description (Meta)", checked: checklist.keywordInMetaDescription },
          { label: "Clean URL Slug", checked: checklist.keywordInSlug },
          { label: "Direct Answer Introduction", checked: checklist.keywordInIntroduction },
      ]},
      { section: "Entity & Authority", items: [
          { label: "Entity & Concept Coverage (GEO)", checked: checklist.entityCoverage },
          { label: "Topical Depth & Nuance", checked: checklist.topicalDepth },
      ]},
      { section: "Content Quality", items: [
          { label: "In-depth content (>300 words)", checked: checklist.contentLength },
          { label: "Natural keyword usage (0.5-1.5%)", checked: checklist.keywordDensity },
          { label: "Structured Headings (H2/H3)", checked: checklist.keywordInHeading },
          { label: "Sufficient Sub-topics (2+)", checked: checklist.sufficientHeadings },
          { label: "Readability & Flow", checked: checklist.readability },
          { label: "Descriptive Image Alt Text", checked: checklist.imageAltText },
          { label: "Q&A Format (FAQ Section)", checked: checklist.faqSection },
          { label: "Rich Media (Video Embed)", checked: checklist.videoEmbed },
      ]},
      { section: "Trust & Citations (E-E-A-T)", items: [
          { label: "Internal Citation Structure (2+)", checked: checklist.internalLinks },
          { label: "Authoritative External Citations (2+)", checked: checklist.externalLinks },
          { label: "Author Credibility (Byline)", checked: checklist.authorMention },
          { label: "Author Bio Section", checked: checklist.aboutAuthorSection },
          { label: "Structured Data (Schema Markup)", checked: checklist.schemaMarkup },
      ]},
  ];

  return (
    <div className="w-full">
        <h3 className="text-xl font-bold mb-4 border-b border-border pb-2 text-blue-300">GEO Analysis</h3>
      <div className="relative w-40 h-40 mx-auto my-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="80%"
            outerRadius="100%"
            barSize={12}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              dataKey="value"
              cornerRadius={6}
              fill={scoreColor}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-extrabold animate-count-up" style={{ color: scoreColor }}>
            {displayScore}
          </span>
        </div>
      </div>
      <p className="text-center font-semibold text-lg mt-1 mb-6 text-text-primary">GEO Score</p>
      
      <div className="space-y-4">
        {checklistItems.map((section, sectionIndex) => (
            <div key={section.section}>
                <h4 className="font-semibold text-text-primary text-base mb-2">{section.section}</h4>
                <ul className="space-y-2.5">
                    {section.items.map((item, itemIndex) => (
                        <ChecklistItem key={item.label} label={item.label} checked={item.checked} delay={200 + (sectionIndex * 5 + itemIndex) * 30} />
                    ))}
                </ul>
            </div>
        ))}
      </div>
    </div>
  );
};
