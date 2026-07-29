export default function Hero() {
  return (
    <section className="bg-white border-b border-wire">
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-12 items-center">

        {/* Left: text */}
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-ink leading-tight mb-4">
            Hi, I'm Drushti Chauhan
          </h1>

          <p className="text-ash text-lg leading-relaxed mb-8 max-w-lg">
            I build CRM, ERP, and enterprise solutions driven by AI — helping businesses
            streamline operations, surface insights, and close more deals.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="#products"
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white font-medium text-sm rounded-md transition-colors text-center"
            >
              See the products
            </a>
            <a
              href="mailto:drishtichauhan707@gmail.com"
              className="px-5 py-2.5 border border-wire hover:border-ash text-ink font-medium text-sm rounded-md transition-colors text-center"
            >
              Get in touch
            </a>
          </div>
        </div>

        {/* Right: profile card */}
        <div className="flex justify-center lg:justify-end">
          <div
            style={{
              width: '280px',
              borderRadius: '1.25rem',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 24px 0 rgb(0 0 0 / 0.10)',
              background: '#fff',
            }}
          >
            {/* Photo */}
            <div style={{ width: '100%', height: '320px', overflow: 'hidden' }}>
              <img
                src="/drushti.png"
                alt="Drushti Chauhan"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>
            {/* Name + title */}
            <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '1.125rem', color: '#0F172A', marginBottom: '0.25rem' }}>
                Drushti Chauhan
              </p>
              <p style={{ fontSize: '0.875rem', color: '#64748B' }}>
                Enterprise AI Developer
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
