
import React from 'react';

interface HtmlRendererProps {
  content: string;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({ content }) => {
  return (
    <div 
      className="prose prose-invert max-w-none 
                 prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:border-border prose-h2:pb-3 prose-h2:text-brand-primary
                 prose-p:my-4 prose-p:text-text-secondary prose-p:leading-relaxed
                 prose-ul:list-disc prose-ul:ml-5 prose-ul:text-text-secondary
                 prose-a:text-brand-primary prose-a:font-medium hover:prose-a:text-brand-primary-hover prose-a:transition-colors prose-a:no-underline hover:prose-a:underline
                 prose-strong:text-text-primary
                 prose-blockquote:border-l-4 prose-blockquote:border-brand-primary prose-blockquote:pl-4 prose-blockquote:text-text-secondary prose-blockquote:italic"
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  );
};
