import React from 'react'
import { Link } from 'react-router-dom'
import { MessageSquarePlus, Search, Shield, Home } from 'lucide-react'

interface NavbarProps {
  role?: 'employee' | 'admin' | null
}

export default function Navbar({ role }: NavbarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <MessageSquarePlus className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Smart Suggestion Box</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </Link>
            <Link
              to="/submit"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
            >
              <MessageSquarePlus className="h-4 w-4 mr-1" />
              Submit Suggestion
            </Link>
            <Link
              to="/track"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
            >
              <Search className="h-4 w-4 mr-1" />
              Track Status
            </Link>
            <Link
              to="/admin/login"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
            >
              <Shield className="h-4 w-4 mr-1" />
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
