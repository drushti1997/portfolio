import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-wire">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded bg-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            DC
          </span>
          <span className="font-semibold text-ink text-sm">Drushti Chauhan</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <a href="#products" className="px-3 py-1.5 text-ash hover:text-ink hover:bg-fog rounded-md transition-colors">
            Products
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-ash hover:text-ink hover:bg-fog rounded-md transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/drushtichauhan/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-ash hover:text-ink hover:bg-fog rounded-md transition-colors"
          >
            LinkedIn
          </a>
        </nav>
      </div>
    </header>
  );
}
