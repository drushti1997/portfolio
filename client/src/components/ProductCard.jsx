import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const { name, slug, tagline, icon_emoji, tags, status } = product;
  const isLive = status === 'live';

  const cardContent = (
    <>
      {/* Status badge */}
      {isLive ? (
        <span className="absolute top-5 right-5 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
      ) : (
        <span className="absolute top-5 right-5 px-2 py-0.5 rounded-full text-xs font-semibold bg-wire text-ash border border-wire">
          Coming soon
        </span>
      )}

      {/* Icon */}
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl mb-5 flex-shrink-0 ${
        isLive ? 'bg-brand-soft border border-brand/20' : 'bg-wire/60 border border-wire'
      }`}>
        <span className={isLive ? '' : 'opacity-50'}>{icon_emoji}</span>
      </div>

      {/* Name */}
      <h3 className={`font-semibold text-base mb-1.5 pr-24 leading-snug ${
        isLive ? 'text-ink group-hover:text-brand transition-colors' : 'text-ash/70'
      }`}>
        {name}
      </h3>

      {/* Tagline */}
      <p className={`text-sm leading-relaxed mb-5 flex-1 ${isLive ? 'text-ash' : 'text-ash/50'}`}>
        {tagline}
      </p>

      {/* Not yet built notice for coming-soon */}
      {!isLive && (
        <p className="text-xs text-ash/50 italic mb-4">Not yet built — planned for a future release.</p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`px-2 py-0.5 rounded text-xs border ${
              isLive ? 'text-ash bg-fog border-wire' : 'text-ash/40 bg-wire/40 border-wire/60'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA — live only */}
      {isLive && (
        <div className="flex items-center gap-1 text-brand text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Launch app
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      )}
    </>
  );

  if (isLive) {
    return (
      <Link
        to={`/${slug}`}
        className="group relative flex flex-col p-6 bg-white rounded-xl border border-wire shadow-card card-hover cursor-pointer"
        style={{ borderLeftColor: '#FF4800', borderLeftWidth: '3px' }}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <div className="relative flex flex-col p-6 rounded-xl border border-wire/60 cursor-default" style={{ background: '#F5F2EC' }}>
      {cardContent}
    </div>
  );
}
