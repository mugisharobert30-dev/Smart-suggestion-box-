import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generateReferenceNumber, suggestCategory } from '../utils/helpers'
import { CATEGORY_LABELS } from '../types'
import type { SuggestionCategory } from '../types'

export default function SubmitSuggestion() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as SuggestionCategory | '',
    anonymous: true,
    submitterName: '',
    submitterEmail: ''
  })
  const [showIdentity, setShowIdentity] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestedCategory, setSuggestedCategory] = useState<string>('')

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const description = e.target.value
    setFormData({ ...formData, description })
    
    if (description.length > 10) {
      const suggested = suggestCategory(description)
      if (suggested !== formData.category) {
        setSuggestedCategory(CATEGORY_LABELS[suggested as SuggestionCategory])
      }
    }
  }

  const applySuggestedCategory = () => {
    if (suggestedCategory) {
      const categoryKey = Object.entries(CATEGORY_LABELS).find(
        ([_, label]) => label === suggestedCategory
      )?.[0] as SuggestionCategory
      if (categoryKey) {
        setFormData({ ...formData, category: categoryKey })
        setSuggestedCategory('')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    // Identity fields are optional now

    try {
      const referenceNumber = generateReferenceNumber()
      
      const { data, error: submitError } = await supabase
        .from('suggestions')
        .insert({
          reference_number: referenceNumber,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          anonymous: formData.anonymous,
          status: 'submitted',
          priority: false
        })
        .select()
        .single()

      if (submitError) throw submitError

      navigate('/submit/success', { 
        state: { 
          referenceNumber,
          title: formData.title 
        } 
      })
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a Suggestion</h1>
            <p className="text-gray-600">
              Share your ideas to help improve the company. All fields marked with * are required.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Suggestion Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief summary of your suggestion"
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={handleDescriptionChange}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Provide detailed explanation of your suggestion..."
                required
              />
            </div>

            {suggestedCategory && formData.description.length > 10 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Smart suggestion:</span> We think this might be related to "{suggestedCategory}"
                  </p>
                  <button
                    type="button"
                    onClick={applySuggestedCategory}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as SuggestionCategory })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a category</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-sm text-gray-700 mb-2">
                Submitting anonymously by default. Your identity will not be shown to management.
              </p>
              <button
                type="button"
                onClick={() => setShowIdentity(!showIdentity)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showIdentity ? 'Hide my information' : "I'd like to provide my identity (optional)"}
              </button>
            </div>

            {showIdentity && (
              <div className="space-y-4 p-4 bg-white border border-gray-300 rounded-md">
                <p className="text-sm font-medium text-gray-700">Your Information (Optional)</p>
                <div>
                  <label htmlFor="submitterName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="submitterName"
                    value={formData.submitterName}
                    onChange={(e) => setFormData({ ...formData, submitterName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name (optional)"
                  />
                </div>
                <div>
                  <label htmlFor="submitterEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="submitterEmail"
                    value={formData.submitterEmail}
                    onChange={(e) => setFormData({ ...formData, submitterEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email (optional)"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Suggestion
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
