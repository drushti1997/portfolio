import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const { name, slug, tagline, icon_emoji, tags, status } = product;
  const isLive = status === 'live';

  return (
    <Link
      to={`/${slug}`}
      className="group relative flex flex-col p-6 rounded-xl border border-gray-800 bg-surface card-hover cursor-pointer"
    >
      {/* Status badge */}
      <span
        className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-xs font-medium ${
          isLive
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-gray-700/50 text-gray-500 border border-gray-700'
        }`}
      >
        {isLive ? '● Live' : 'Coming Soon'}
      </span>

      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl mb-4">
        {icon_emoji}
      </div>

      {/* Name */}
      <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-indigo-300 transition-colors pr-20">
        {name}
      </h3>

      {/* Tagline */}
      <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">
        {tagline}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-xs text-gray-500 bg-gray-800 border border-gray-700"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Arrow */}
      <div className="mt-4 flex items-center gap-1 text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        {isLive ? 'Launch app' : 'View project'}
        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </Link>
  );
}
