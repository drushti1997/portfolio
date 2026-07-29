import Header from '../components/Header';
import Hero from '../components/Hero';
import ProductGrid from '../components/ProductGrid';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-fog">
      <Header />

      <main className="pt-14">
        <Hero />

        <section id="products" className="max-w-6xl mx-auto px-6 py-16">
          <div className="mb-10">
            <p className="text-xs font-semibold text-brand uppercase tracking-widest mb-2">Products</p>
            <h2 className="text-2xl font-bold text-ink mb-2">Products</h2>
            <p className="text-ash text-sm max-w-lg">
              Enterprise AI solutions across CRM, ERP, and operations. Click any product to explore or try it live.
            </p>
          </div>
          <ProductGrid />
        </section>
      </main>

      <Footer />
    </div>
  );
}
