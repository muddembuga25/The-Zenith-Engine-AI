
import React, { useMemo } from 'react';

interface DiffViewerProps {
  originalHtml: string;
  refreshedHtml: string;
}

interface DiffResult {
  type: 'added' | 'removed' | 'common';
  value: string;
}

// A simple diffing algorithm (Longest Common Subsequence based)
const diffLines = (original: string, refreshed: string): DiffResult[] => {
    const originalLines = original.split('\n');
    const refreshedLines = refreshed.split('\n');
    const n = originalLines.length;
    const m = refreshedLines.length;
    const dp = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (originalLines[i - 1] === refreshedLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const result: DiffResult[] = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && originalLines[i - 1] === refreshedLines[j - 1]) {
            result.unshift({ type: 'common', value: originalLines[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'added', value: refreshedLines[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            result.unshift({ type: 'removed', value: originalLines[i - 1] });
            i--;
        } else {
            break;
        }
    }
    return result;
};

export const DiffViewer: React.FC<DiffViewerProps> = ({ originalHtml, refreshedHtml }) => {
    const diff = useMemo(() => diffLines(originalHtml, refreshedHtml), [originalHtml, refreshedHtml]);

    return (
        <div className="font-mono text-xs leading-5 bg-panel rounded-lg p-4 border border-border-subtle max-h-[1000px] overflow-auto">
            <pre>
                <code>
                    {diff.map((line, index) => {
                        let bgClass = '';
                        let sign = '  ';
                        let lineClass = 'text-text-secondary';
                        let signColor = 'text-gray-500';

                        if (line.type === 'added') {
                            bgClass = 'bg-green-900/30';
                            sign = '+ ';
                            lineClass = 'text-green-300';
                            signColor = 'text-green-400';
                        } else if (line.type === 'removed') {
                            bgClass = 'bg-red-900/30';
                            sign = '- ';
                            lineClass = 'text-red-300';
                            signColor = 'text-red-400';
                        }
                        
                        return (
                            <div key={index} className={`flex ${bgClass}`}>
                                <span className={`w-6 text-center select-none flex-shrink-0 ${signColor}`}>{sign}</span>
                                <span className={`flex-1 whitespace-pre-wrap break-words ${lineClass}`}>{line.value}</span>
                            </div>
                        );
                    })}
                </code>
            </pre>
        </div>
    );
};
