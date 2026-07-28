import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadGeneratorApp from '../components/apps/LeadGeneratorApp';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Product not found' : 'Server error');
        return r.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-20">
        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-800 rounded w-1/2" />
            <div className="h-4 bg-gray-800 rounded w-3/4" />
            <div className="h-4 bg-gray-800 rounded w-2/3" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🤷</p>
            <h2 className="text-xl font-semibold text-white mb-2">{error}</h2>
            <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm mt-4 inline-block">
              ← Back to products
            </Link>
          </div>
        )}

        {product && (
          <>
            {/* Back link */}
            <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm mb-10 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              All products
            </Link>

            {/* Header */}
            <div className="flex items-start gap-5 mb-8">
              <div className="w-16 h-16 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl flex-shrink-0">
                {product.icon_emoji}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{product.name}</h1>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      product.status === 'live'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-gray-700/50 text-gray-500 border border-gray-700'
                    }`}
                  >
                    {product.status === 'live' ? '● Live' : 'Coming Soon'}
                  </span>
                </div>
                <p className="text-gray-400 text-lg">{product.tagline}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-10">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* App area */}
            {product.status === 'live' ? (
              <div className="rounded-xl border border-gray-800 bg-surface p-8 min-h-96">
                {product.slug === 'lead-generator' && <LeadGeneratorApp />}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-700 bg-surface/50 p-12 text-center">
                <div className="text-5xl mb-4">🚀</div>
                <h2 className="text-xl font-semibold text-white mb-2">Under Construction</h2>
                <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
                  {product.description}
                </p>
                <p className="text-gray-600 text-sm mt-6">
                  This product is being built. Check back soon.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
