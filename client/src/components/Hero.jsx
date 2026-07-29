export default function Hero() {
  return (
    <section className="bg-white border-b border-wire overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24 flex flex-col lg:flex-row items-center gap-14 lg:gap-20">

        {/* Left: text */}
        <div className="flex-1 min-w-0">
          <span className="inline-block text-xs font-semibold text-brand uppercase tracking-widest mb-6">
            Enterprise AI Developer
          </span>

          <h1 className="text-4xl lg:text-5xl xl:text-[3.5rem] font-bold text-ink leading-[1.1] mb-6">
            Hi, I'm<br />Drushti Chauhan
          </h1>

          <p className="text-ash text-lg leading-relaxed mb-10 max-w-md">
            I build CRM, ERP, and enterprise solutions driven by AI — helping businesses
            streamline operations, surface insights, and close more deals.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="#products"
              className="px-6 py-3 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-md transition-colors text-center"
            >
              See the products
            </a>
            <a
              href="mailto:drishtichauhan707@gmail.com"
              className="px-6 py-3 border border-wire hover:border-ash text-ink font-medium text-sm rounded-md transition-colors text-center"
            >
              Get in touch
            </a>
          </div>
        </div>

        {/* Right: image with orange offset accent */}
        <div className="flex-shrink-0" style={{ position: 'relative', width: '336px', height: '436px' }}>
          {/* Orange accent block — peeks behind the photo */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '320px',
              height: '420px',
              background: '#FF4800',
              borderRadius: '18px',
            }}
          />
          {/* Photo */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '320px',
              height: '420px',
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
            }}
          >
            <img
              src="/drushti.jpg"
              alt="Drushti Chauhan"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 8%',
              }}
            />
          </div>
        </div>

      </div>
    </section>
  );
}
