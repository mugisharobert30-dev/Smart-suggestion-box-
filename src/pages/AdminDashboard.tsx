import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LogOut, Filter, Search, Download, MessageSquare, 
  Clock, CheckCircle, AlertCircle, XCircle, Star 
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../utils/helpers'
import { 
  CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, 
} from '../types'
import type { SuggestionCategory, SuggestionStatus } from '../types'

interface Suggestion {
  id: string
  reference_number: string
  title: string
  description: string
  category: SuggestionCategory
  anonymous: boolean
  submitter_id: string | null
  status: SuggestionStatus
  priority: boolean
  created_at: string
  updated_at: string
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: '',
    priority: ''
  })
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null)
  const [responseText, setResponseText] = useState('')
  const [updating, setUpdating] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    completed: 0
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchSuggestions()
      fetchStats()
    }
  }, [user])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/admin/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut()
      navigate('/admin/login')
      return
    }

    setUser(session.user)
  }

  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('suggestions')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.priority === 'true') {
        query = query.eq('priority', true)
      }

      const { data, error } = await query
      if (error) throw error

      let filteredData = data || []
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredData = filteredData.filter(s => 
          s.title.toLowerCase().includes(searchLower) ||
          s.description.toLowerCase().includes(searchLower) ||
          s.reference_number.toLowerCase().includes(searchLower)
        )
      }

      setSuggestions(filteredData)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: all } = await supabase.from('suggestions').select('status')
      if (all) {
        setStats({
          total: all.length,
          pending: all.filter(s => s.status === 'submitted' || s.status === 'under_review').length,
          accepted: all.filter(s => s.status === 'accepted' || s.status === 'in_progress').length,
          completed: all.filter(s => s.status === 'accepted' && false).length // placeholder
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const updateSuggestion = async (suggestionId: string, updates: Partial<Suggestion>) => {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', suggestionId)

      if (error) throw error

      if (selectedSuggestion?.id === suggestionId) {
        setSelectedSuggestion({ ...selectedSuggestion, ...updates })
      }

      fetchSuggestions()
      fetchStats()
    } catch (error) {
      console.error('Error updating suggestion:', error)
    } finally {
      setUpdating(false)
    }
  }

  const addResponse = async () => {
    if (!selectedSuggestion || !responseText.trim()) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('responses')
        .insert({
          suggestion_id: selectedSuggestion.id,
          admin_id: user.id,
          response_text: responseText.trim()
        })

      if (error) throw error

      setResponseText('')
      alert('Response added successfully')
    } catch (error) {
      console.error('Error adding response:', error)
      alert('Error adding response')
    } finally {
      setUpdating(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Reference', 'Title', 'Category', 'Status', 'Priority', 'Anonymous', 'Created']
    const rows = suggestions.map(s => [
      s.reference_number,
      s.title,
      CATEGORY_LABELS[s.category],
      STATUS_LABELS[s.status],
      s.priority ? 'Yes' : 'No',
      s.anonymous ? 'Yes' : 'No',
      formatDate(s.created_at)
    ])

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `suggestions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const getStatusIcon = (status: SuggestionStatus) => {
    switch (status) {
      case 'submitted': return <Clock className="h-4 w-4" />
      case 'under_review': return <AlertCircle className="h-4 w-4" />
      case 'accepted':
      case 'in_progress': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.accepted}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <button
              onClick={exportToCSV}
              className="w-full h-full flex items-center justify-center text-blue-600 hover:text-blue-700"
            >
              <Download className="h-5 w-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search suggestions..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && fetchSuggestions()}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="true">High Priority</option>
                <option value="false">Normal</option>
              </select>
              <button
                onClick={fetchSuggestions}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : suggestions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No suggestions found</td>
                  </tr>
                ) : (
                  suggestions.map((suggestion) => (
                    <tr key={suggestion.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                        {suggestion.reference_number}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {suggestion.title}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {CATEGORY_LABELS[suggestion.category]}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[suggestion.status]}`}>
                          {getStatusIcon(suggestion.status)}
                          <span className="ml-1">{STATUS_LABELS[suggestion.status]}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {suggestion.priority ? (
                          <Star className="h-4 w-4 text-orange-500 fill-current" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {suggestion.anonymous ? 'Anonymous' : 'Identified'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(suggestion.created_at)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedSuggestion(suggestion)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedSuggestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Manage Suggestion</h2>
                  <button
                    onClick={() => setSelectedSuggestion(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{selectedSuggestion.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">Ref: {selectedSuggestion.reference_number}</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedSuggestion.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={selectedSuggestion.status}
                      onChange={(e) => updateSuggestion(selectedSuggestion.id, { status: e.target.value as SuggestionStatus })}
                      disabled={updating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <button
                      onClick={() => updateSuggestion(selectedSuggestion.id, { priority: !selectedSuggestion.priority })}
                      disabled={updating}
                      className={`w-full px-3 py-2 rounded-md border ${
                        selectedSuggestion.priority
                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                          : 'bg-gray-50 border-gray-300 text-gray-700'
                      }`}
                    >
                      {selectedSuggestion.priority ? '★ High Priority' : 'Mark as High Priority'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add Management Response</label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide feedback or update to the employee..."
                  />
                  <button
                    onClick={addResponse}
                    disabled={updating || !responseText.trim()}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Response
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
