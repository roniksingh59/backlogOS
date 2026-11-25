import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Loader2, X } from 'lucide-react';
import {
  BAX_CONTEXTUAL_SLOTS,
  resolveBaxAsset,
  type BaxExpression,
  type BaxPlacementSlot,
  type BaxPose,
  type BaxSize,
  type BaxTabGuideItem,
} from '@/lib/bax/bax-assets';

export interface BaxMascotProps {
  expression?: BaxExpression;
  pose?: BaxPose;
  size?: BaxSize;
  /** Optional placement slot used to inherit contextual defaults. */
  slot?: BaxPlacementSlot;
  /** Optional direct asset override; defaults to central BAX_ASSET_MAP. */
  customAssetSrc?: string | null;
  loading?: boolean;
  thinking?: boolean;
  message?: string;
  bubbleTitle?: string;
  showBubble?: boolean;
  bubblePlacement?: 'top' | 'right' | 'bottom' | 'left';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  footerSlot?: ReactNode;
  guideItems?: BaxTabGuideItem[];
  guideButtonLabel?: string;
  className?: string;
  'data-testid'?: string;
}

const SIZE_CLASSES: Record<BaxSize, { box: string; codeText: string; metaText: string }> = {
  xs: { box: 'h-9 w-9', codeText: 'text-[9px]', metaText: 'hidden' },
  sm: { box: 'h-14 w-14', codeText: 'text-[10px]', metaText: 'text-[8px]' },
  md: { box: 'h-20 w-20 sm:h-24 sm:w-24', codeText: 'text-xs', metaText: 'text-[9px]' },
  lg: { box: 'h-28 w-28 sm:h-32 sm:w-32', codeText: 'text-sm', metaText: 'text-[10px]' },
  xl: { box: 'h-36 w-36', codeText: 'text-base', metaText: 'text-[11px]' },
};

const POSE_SHORT_LABEL: Record<BaxPose, string> = {
  idle: 'idle',
  waving: 'wave',
  pointing: 'point',
  reading: 'read',
  cheering: 'cheer',
  resting: 'rest',
  focused: 'focus',
};

export function BaxMascot({
  expression,
  pose,
  size = 'md',
  slot,
  customAssetSrc,
  loading = false,
  thinking = false,
  message,
  bubbleTitle,
  showBubble,
  bubblePlacement = 'right',
  actionLabel,
  onAction,
  onDismiss,
  footerSlot,
  guideItems,
  guideButtonLabel = 'How this tab works',
  className = '',
  'data-testid': testId,
}: BaxMascotProps) {
  const slotConfig = slot ? BAX_CONTEXTUAL_SLOTS[slot] : null;
  const resolvedGuideItems = guideItems ?? slotConfig?.guideItems;
  const [guideOpen, setGuideOpen] = useState(false);

  const effectiveExpression: BaxExpression =
    loading || thinking
      ? 'thinking'
      : guideOpen
      ? 'explaining'
      : expression || slotConfig?.defaultExpression || 'happy';
  const effectivePose: BaxPose | undefined = guideOpen
    ? 'reading'
    : pose || slotConfig?.defaultPose;
  const resolved = resolveBaxAsset(effectiveExpression, effectivePose);

  const candidateSrc =
    customAssetSrc !== undefined ? customAssetSrc : resolved.resolvedImageSrc;

  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [candidateSrc]);

  const sizeMeta = SIZE_CLASSES[size];
  const displaySrc = candidateSrc && !imgFailed ? candidateSrc : null;
  const hasMessage = Boolean(message || (showBubble && slotConfig?.defaultMessage));
  const resolvedMessage = message ?? slotConfig?.defaultMessage;
  const resolvedTitle = bubbleTitle ?? slotConfig?.title;
  const renderBubble = showBubble ?? Boolean(message || loading || thinking);

  const layoutClasses =
    bubblePlacement === 'top'
      ? 'flex-col-reverse items-start'
      : bubblePlacement === 'bottom'
      ? 'flex-col items-start'
      : bubblePlacement === 'left'
      ? 'flex-row-reverse items-center'
      : 'flex-row items-center';

  return (
    <div
      className={`inline-flex gap-3 ${layoutClasses} ${className}`}
      data-testid={testId || 'bax-mascot'}
      data-bax-expression={effectiveExpression}
      data-bax-pose={resolved.activePose}
      data-bax-loading={loading ? 'true' : 'false'}
      data-bax-thinking={thinking ? 'true' : 'false'}
    >
      {/* Free-standing Bax Mascot (or fallback frame if asset missing) */}
      <div
        role="img"
        aria-label={
          loading
            ? 'Bax mascot loading'
            : thinking
            ? 'Bax mascot thinking'
            : `${resolved.alt} (${resolved.activePose})`
        }
        className={`relative flex shrink-0 flex-col items-center justify-center select-none transition-transform duration-200 ${sizeMeta.box} ${
          displaySrc
            ? ''
            : `rounded-2xl border font-mono ${resolved.accentClass} ring-2 ${resolved.ringClass}`
        }`}
        data-testid="bax-avatar-frame"
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={resolved.alt}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain drop-shadow-[0_6px_14px_rgba(16,185,129,0.22)]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center leading-none text-center px-1">
            {loading ? (
              <Loader2
                size={size === 'xs' ? 13 : size === 'sm' ? 16 : 20}
                className="animate-spin"
              />
            ) : (
              <>
                <span className={`font-bold tracking-tight ${sizeMeta.codeText}`}>
                  {resolved.placeholderTag}
                </span>
                {size !== 'xs' && (
                  <span
                    className={`mt-1 uppercase tracking-wider opacity-75 ${sizeMeta.metaText}`}
                  >
                    {POSE_SHORT_LABEL[resolved.activePose]}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {(thinking || loading) && size !== 'xs' && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-md border border-border bg-card px-1 py-0.5 text-[9px] font-mono font-bold text-foreground shadow-2xs"
          >
            {loading ? <Loader2 size={10} className="animate-spin text-sky-500" /> : '...'}
          </span>
        )}
      </div>

      {/* Contextual Speech Bubble */}
      {renderBubble && (hasMessage || loading || thinking) && (
        <div
          className="relative min-w-0 flex-1 max-w-lg rounded-xl border border-border bg-card px-3.5 py-2.5 text-left text-xs text-foreground shadow-sm"
          data-testid="bax-speech-bubble"
        >
          {(resolvedTitle || onDismiss) && (
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground min-w-0">
                <span className="font-semibold text-foreground truncate">
                  {resolvedTitle || 'Bax'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="capitalize shrink-0">{resolved.label}</span>
              </div>
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label="Dismiss Bax message"
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer shrink-0"
                  data-testid="button-bax-dismiss"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          <p className="text-[13px] leading-relaxed text-foreground/90">
            {loading || thinking
              ? resolvedMessage || 'Thinking through your study plan...'
              : resolvedMessage}
          </p>

          {resolvedGuideItems && resolvedGuideItems.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setGuideOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/8 hover:bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
                aria-expanded={guideOpen}
                data-testid={slot ? `button-bax-guide-${slot}` : 'button-bax-guide'}
              >
                <HelpCircle size={12} />
                <span>{guideOpen ? 'Hide feature guide' : guideButtonLabel}</span>
                {guideOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {guideOpen && (
                <ul
                  className="mt-2.5 space-y-2 border-t border-border/70 pt-2.5 text-xs"
                  data-testid={slot ? `list-bax-guide-${slot}` : 'list-bax-guide'}
                >
                  {resolvedGuideItems.map((item, idx) => (
                    <li key={item.label} className="leading-relaxed">
                      <span className="font-semibold text-foreground">
                        {idx + 1}. {item.label}:{' '}
                      </span>
                      <span className="text-muted-foreground">{item.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(actionLabel || footerSlot) && (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/70">
              {actionLabel && onAction && (
                <button
                  type="button"
                  onClick={onAction}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer whitespace-nowrap"
                  data-testid="button-bax-action"
                >
                  {actionLabel}
                </button>
              )}
              {footerSlot}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Contextual slot wrapper that respects BAX_CONTEXTUAL_SLOTS configuration.
 * Renders only when explicitly enabled (either via prop override or central slot config),
 * preventing Bax from appearing everywhere simultaneously.
 */
export function BaxContextualSlot({
  slot,
  active,
  size = 'md',
  expression,
  pose,
  message,
  bubblePlacement = 'right',
  actionLabel,
  onAction,
  onDismiss,
  guideItems,
  guideButtonLabel,
  className = '',
}: {
  slot: BaxPlacementSlot;
  active?: boolean;
  size?: BaxSize;
  expression?: BaxExpression;
  pose?: BaxPose;
  message?: string;
  bubblePlacement?: 'top' | 'right' | 'bottom' | 'left';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  guideItems?: BaxTabGuideItem[];
  guideButtonLabel?: string;
  className?: string;
}) {
  const cfg = BAX_CONTEXTUAL_SLOTS[slot];
  const shouldShow = active ?? cfg.enabledByDefault;
  if (!shouldShow) return null;

  return (
    <BaxMascot
      slot={slot}
      size={size}
      expression={expression}
      pose={pose}
      message={message}
      showBubble
      bubblePlacement={bubblePlacement}
      actionLabel={actionLabel}
      onAction={onAction}
      onDismiss={onDismiss}
      guideItems={guideItems}
      guideButtonLabel={guideButtonLabel}
      className={className}
      data-testid={`bax-slot-${slot}`}
    />
  );
}
