import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const { name, slug, tagline, icon_emoji, tags, status } = product;
  const isLive = status === 'live';

  return (
    <Link
      to={`/${slug}`}
      className="group relative flex flex-col p-6 bg-white rounded-xl border border-wire shadow-card card-hover cursor-pointer"
      style={isLive ? { borderLeftColor: '#0566C8', borderLeftWidth: '3px' } : {}}
    >
      {/* Status */}
      <span
        className={`absolute top-5 right-5 flex items-center gap-1.5 text-xs font-medium ${
          isLive ? 'text-emerald-600' : 'text-ash'
        }`}
      >
        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        {isLive ? 'Live' : 'Coming soon'}
      </span>

      {/* Icon */}
      <div className="w-11 h-11 rounded-lg bg-brand-soft border border-brand/20 flex items-center justify-center text-xl mb-5 flex-shrink-0">
        {icon_emoji}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-ink text-base mb-1.5 group-hover:text-brand transition-colors pr-24 leading-snug">
        {name}
      </h3>

      {/* Tagline */}
      <p className="text-ash text-sm leading-relaxed mb-5 flex-1">
        {tagline}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-xs text-ash bg-fog border border-wire"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-1 text-brand text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        {isLive ? 'Launch app' : 'View project'}
        <svg
          className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </Link>
  );
}
