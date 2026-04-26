import { Icon } from './Icon';

/** Small visual marker for any AI-generated content, signalling provenance. */
export function AIBadge({
  provider,
  model,
  className = '',
}: {
  provider?: string;
  model?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-brand-100 text-brand-700 ${className}`}
      title={provider && model ? `${provider} · ${model}` : 'AI generated'}
    >
      <Icon name="sparkles" size={12} />
      AI
    </span>
  );
}

/** Inline AI label with a gold tint, for premium upsells. */
export function AIUpsell({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gold-100 text-gold-700 ${className}`}
    >
      <Icon name="lock" size={12} />
      Sigma AI
    </span>
  );
}
