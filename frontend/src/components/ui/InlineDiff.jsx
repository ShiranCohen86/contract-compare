import { diffWords } from 'diff';

/**
 * Renders Word-style track-changes inline diff.
 * Deleted text = red strikethrough, Added text = green bold.
 */
export default function InlineDiff({ before, after }) {
  if (!before && !after) return null;
  if (!before) return <span className="diff-inline diff-inline--added">{after}</span>;
  if (!after)  return <span className="diff-inline diff-inline--removed">{before}</span>;

  const parts = diffWords(before, after);

  return (
    <span className="diff-inline">
      {parts.map((part, i) => {
        if (part.added)   return <span key={i} className="diff-inline__added">{part.value}</span>;
        if (part.removed) return <span key={i} className="diff-inline__removed">{part.value}</span>;
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}
