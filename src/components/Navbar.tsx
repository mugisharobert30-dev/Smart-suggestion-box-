import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquarePlus, Search, Shield, Home, Menu, X } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/submit', label: 'Submit Suggestion', icon: MessageSquarePlus },
  { to: '/track', label: 'Track Status', icon: Search },
  { to: '/admin/login', label: 'Admin', icon: Shield },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center min-w-0">
            <Link to="/" className="flex items-center min-w-0" onClick={() => setMenuOpen(false)}>
              <MessageSquarePlus className="h-8 w-8 text-blue-600 shrink-0" />
              <span className="ml-2 text-base sm:text-xl font-bold text-gray-900 truncate">
                Smart Suggestion Box
              </span>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
