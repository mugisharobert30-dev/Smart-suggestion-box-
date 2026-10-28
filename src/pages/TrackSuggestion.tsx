import { useState } from 'react'
import { Search, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../utils/helpers'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '../types'

interface SuggestionData {
  id: string
  reference_number: string
  title: string
  description: string
  category: string
  anonymous: boolean
  status: string
  priority: boolean
  created_at: string
  updated_at: string
}

interface ResponseData {
  id: string
  response_text: string
  created_at: string
  admin_id: string
}

export default function TrackSuggestion() {
  const [referenceNumber, setReferenceNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null)
  const [responses, setResponses] = useState<ResponseData[]>([])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuggestion(null)
    setResponses([])

    if (!referenceNumber.trim()) {
      setError('Please enter a reference number')
      setLoading(false)
      return
    }

    try {
      const { data: suggestionData, error: suggestionError } = await supabase
        .from('suggestions')
        .select('*')
        .eq('reference_number', referenceNumber.trim().toUpperCase())
        .single()

      if (suggestionError) {
        if (suggestionError.code === 'PGRST116') {
          setError('Suggestion not found. Please check your reference number.')
        } else {
          throw suggestionError
        }
        setLoading(false)
        return
      }

      setSuggestion(suggestionData)

      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .eq('suggestion_id', suggestionData.id)
        .order('created_at', { ascending: true })

      if (!responsesError && responsesData) {
        setResponses(responsesData)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-5 w-5 text-gray-500" />
      case 'under_review':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'accepted':
      case 'in_progress':
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Suggestion</h1>
          <p className="text-gray-600">
            Enter your reference number to check the status and responses
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Enter reference number (e.g., SG-241027-AB12)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                'Searching...'
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {suggestion && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">{suggestion.title}</h2>
                  <p className="text-sm text-gray-500">Ref: {suggestion.reference_number}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(suggestion.status)}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[suggestion.status as keyof typeof STATUS_COLORS]}`}>
                    {STATUS_LABELS[suggestion.status as keyof typeof STATUS_LABELS]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Category:</span>
                  <span className="ml-2 text-gray-900">{CATEGORY_LABELS[suggestion.category as keyof typeof CATEGORY_LABELS]}</span>
                </div>
                <div>
                  <span className="text-gray-500">Submitted:</span>
                  <span className="ml-2 text-gray-900">{formatDate(suggestion.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2 text-gray-900">{formatDate(suggestion.updated_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Submission Type:</span>
                  <span className="ml-2 text-gray-900">{suggestion.anonymous ? 'Anonymous' : 'Identified'}</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Description</p>
                <p className="text-gray-900 whitespace-pre-wrap">{suggestion.description}</p>
              </div>

              {suggestion.priority && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-sm text-orange-700 font-medium">⚠️ Marked as High Priority</p>
                </div>
              )}
            </div>

            {responses.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Management Responses</h3>
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div key={response.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">Management Response</span>
                        <span className="text-xs text-blue-700">{formatDate(response.created_at)}</span>
                      </div>
                      <p className="text-blue-800 whitespace-pre-wrap">{response.response_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {responses.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No responses yet</p>
                <p className="text-sm text-gray-500 mt-1">Management will review your suggestion soon</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
