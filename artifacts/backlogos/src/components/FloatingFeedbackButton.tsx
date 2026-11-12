import { MessageSquare } from 'lucide-react';

export const FEEDBACK_FORM_URL = '[PASTE YOUR GOOGLE FORM LINK HERE]';

interface FloatingFeedbackButtonProps {
  hasBottomNav?: boolean;
}

export function FloatingFeedbackButton({ hasBottomNav = false }: FloatingFeedbackButtonProps) {
  return (
    <a
      href={FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Feedback or Report Bug"
      data-testid="button-floating-feedback"
      className={`focus-ring fixed left-3 sm:left-6 z-40 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-border/80 bg-card/90 backdrop-blur-md px-3 py-2 text-[11px] sm:text-xs font-medium text-muted-foreground shadow-lg transition-all duration-200 hover:border-sky-400/40 hover:bg-card hover:text-foreground hover:-translate-y-0.5 active:scale-95 ${
        hasBottomNav ? 'bottom-20 lg:bottom-6' : 'bottom-4 sm:bottom-6'
      }`}
    >
      <MessageSquare size={13} className="text-sky-500 shrink-0" />
      <span className="whitespace-nowrap">Feedback / Report Bug</span>
    </a>
  );
}
