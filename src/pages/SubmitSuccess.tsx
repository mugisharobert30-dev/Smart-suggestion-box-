import { useLocation, Link } from 'react-router-dom'
import { CheckCircle, Copy } from 'lucide-react'
import { useState } from 'react'

export default function SubmitSuccess() {
  const location = useLocation()
  const { referenceNumber, title } = location.state || {}
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    if (referenceNumber) {
      navigator.clipboard.writeText(referenceNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!referenceNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No submission data found</p>
          <Link to="/submit" className="text-blue-600 hover:text-blue-700">
            Submit a new suggestion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Suggestion Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your suggestion. Your feedback has been received.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Reference Number</p>
            <div className="flex items-center justify-center space-x-2">
              <code className="text-lg font-mono font-bold text-blue-600 bg-white px-3 py-1 rounded border">
                {referenceNumber}
              </code>
              <button
                onClick={copyToClipboard}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 mt-2">Copied to clipboard!</p>
            )}
          </div>

          <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-blue-900 mb-1">Suggestion:</p>
            <p className="text-sm text-blue-800">{title}</p>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Save this reference number to track the status of your suggestion.
          </p>

          <div className="space-y-3">
            <Link
              to="/track"
              className="w-full block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Track Status
            </Link>
            <Link
              to="/submit"
              className="w-full block px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Submit Another Suggestion
            </Link>
            <Link
              to="/"
              className="w-full block px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
