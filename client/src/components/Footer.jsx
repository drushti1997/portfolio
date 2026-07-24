export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-800 py-8 mt-20">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
        <span>© {year} Drushti Chauhan</span>
        <div className="flex items-center gap-4">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">GitHub</a>
          <a href="https://www.linkedin.com/in/drushtichauhan/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">LinkedIn</a>
          <a href="mailto:hello@drushtichauhan.com" className="hover:text-gray-400 transition-colors">Email</a>
        </div>
      </div>
    </footer>
  );
}
