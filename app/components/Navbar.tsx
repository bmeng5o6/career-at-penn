export default function Navbar() {
    return (
      <nav className="flex items-center justify-between px-8 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1a2a6c] flex items-center justify-center text-white font-semibold text-sm">
            P
          </div>
          <span className="text-lg font-semibold text-gray-900">Career @ Penn</span>
        </div>
  
        <div className="flex items-center gap-2">
          <a href="/" className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Home</a>
          <a href="/statistics" className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Statistics</a>
          <a href="/internship" className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Internship</a>
          <a href="/signin" className="px-4 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Sign in</a>
          <a href="/register" className="px-4 py-1.5 text-sm bg-[#1a2a6c] text-white rounded-md hover:bg-[#253a8e]">Register</a>
        </div>
      </nav>
    );
  }