import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadGeneratorApp from '../components/apps/LeadGeneratorApp';
import RagSearchApp from '../components/apps/RagSearchApp';

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
    <div className="min-h-screen bg-fog">
      <Header />

      <main className={`mx-auto px-6 pt-20 pb-20 ${['lead-generator', 'rag-search'].includes(product?.slug) ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {loading && (
          <div className="animate-pulse space-y-4 pt-8">
            <div className="h-8 bg-white border border-wire rounded w-1/2" />
            <div className="h-4 bg-white border border-wire rounded w-3/4" />
            <div className="h-4 bg-white border border-wire rounded w-2/3" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-ink mb-2">{error}</h2>
            <Link to="/" className="text-brand hover:text-brand-hover text-sm mt-4 inline-block transition-colors">
              ← All products
            </Link>
          </div>
        )}

        {product && (
          <>
            {/* Back link */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-ash hover:text-ink text-sm mb-8 transition-colors pt-6 block"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              All products
            </Link>

            {/* Header card */}
            <div className="bg-white rounded-xl border border-wire shadow-card p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-brand-soft border border-brand/20 flex items-center justify-center text-2xl flex-shrink-0">
                  {product.icon_emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-ink">{product.name}</h1>
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.status === 'live'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-fog text-ash border border-wire'
                      }`}
                    >
                      {product.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      {product.status === 'live' ? 'Live' : 'Coming soon'}
                    </span>
                  </div>
                  <p className="text-ash">{product.tagline}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-wire">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-md text-xs text-brand bg-brand-soft border border-brand/20 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* App area */}
            {product.status === 'live' ? (
              <div className={`rounded-xl border border-wire shadow-card overflow-hidden min-h-96 ${['lead-generator', 'rag-search'].includes(product.slug) ? '' : 'bg-white p-8'}`}>
                {product.slug === 'lead-generator' && <LeadGeneratorApp />}
                {product.slug === 'rag-search' && <RagSearchApp />}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-wire bg-white p-12 text-center">
                <div className="text-5xl mb-4">🚀</div>
                <h2 className="text-xl font-semibold text-ink mb-2">Under Construction</h2>
                <p className="text-ash max-w-md mx-auto leading-relaxed text-sm">
                  {product.description}
                </p>
                <p className="text-ash/50 text-xs mt-6">
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
