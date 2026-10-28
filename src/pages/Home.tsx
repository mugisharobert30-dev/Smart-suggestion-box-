import { Link } from 'react-router-dom'
import { MessageSquarePlus, Search, Shield } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <MessageSquarePlus className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Smart Company Suggestion Box
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Share your ideas, feedback, and suggestions to help improve our workplace, 
            services, and operations. Your voice matters.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Link
            to="/submit"
            className="block p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
          >
            <MessageSquarePlus className="h-10 w-10 text-blue-600 mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Submit a Suggestion</h2>
            <p className="text-gray-600">
              Share your ideas quickly and easily. Submit anonymously or with your identity.
            </p>
          </Link>

          <Link
            to="/track"
            className="block p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
          >
            <Search className="h-10 w-10 text-blue-600 mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Track Your Suggestion</h2>
            <p className="text-gray-600">
              Check the status and responses to your submitted suggestions using your reference number.
            </p>
          </Link>

          <Link
            to="/admin/login"
            className="block p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
          >
            <Shield className="h-10 w-10 text-blue-600 mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Management Access</h2>
            <p className="text-gray-600">
              For administrators to review, manage, and respond to employee suggestions.
            </p>
          </Link>
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How it works</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Submit your suggestion in under a minute</li>
            <li>• Choose to remain anonymous or identified</li>
            <li>• Get a reference number to track progress</li>
            <li>• Management reviews and responds to suggestions</li>
            <li>• Track updates on the status of your ideas</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
