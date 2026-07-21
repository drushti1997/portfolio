import Header from '../components/Header';
import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />

      <section id="products" className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">
            Products
          </h2>
          <p className="text-gray-400 max-w-lg">
            AI tools built for modern sales teams. Click any product to explore or try it live.
          </p>
        </div>
        <ProductGrid />
      </section>

      <Footer />
    </div>
  );
}
