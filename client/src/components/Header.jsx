import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-gray-800 bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-semibold text-white text-lg tracking-tight">
          <span className="gradient-text">DC</span>
          <span className="ml-2 text-gray-400 font-normal text-sm">Drushti Chauhan</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#products" className="text-gray-400 hover:text-white transition-colors">
            Products
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
