import { cn } from '@/utils/cn';
import '@/styles/tiptap.css';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

/**
 * Checks if a string contains HTML tags (from TipTap) vs plain text (legacy content).
 */
function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Convert legacy @[Name](userId) mention format to HTML spans for display.
 */
function convertLegacyMentions(text: string): string {
  return text.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    '<span data-mention data-id="$2" class="mention">@$1</span>',
  );
}

/**
 * Convert plain text to basic HTML (for legacy content that has no HTML tags).
 */
function plainTextToHtml(text: string): string {
  // Escape HTML entities
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Convert mentions
  const withMentions = convertLegacyMentions(escaped);
  // Convert newlines to <br>
  return withMentions.replace(/\n/g, '<br>');
}

export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  if (!content) {
    return null;
  }

  let html: string;
  if (isHtml(content)) {
    // Already HTML from TipTap - just pass through
    // Still convert any legacy mentions that might be mixed in
    html = convertLegacyMentions(content);
  } else {
    // Plain text legacy content
    html = plainTextToHtml(content);
  }

  return (
    <div
      className={cn('rich-text-display text-sm text-surface-200 break-words', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
