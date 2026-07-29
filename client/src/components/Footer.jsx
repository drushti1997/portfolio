export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white border-t border-wire mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ash">
        <span>© {year} Drushti Chauhan</span>
        <div className="flex items-center gap-5">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">GitHub</a>
          <a href="https://www.linkedin.com/in/drushtichauhan/" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">LinkedIn</a>
          <a href="mailto:drishtichauhan707@gmail.com" className="hover:text-ink transition-colors">Email</a>
        </div>
      </div>
    </footer>
  );
}
