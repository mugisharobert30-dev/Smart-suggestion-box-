import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  LogOut, Filter, Search, Download, MessageSquare, 
  Clock, CheckCircle, AlertCircle, XCircle, Star,
  UserPlus, Users, Pencil, Trash2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, isAdminRole } from '../utils/helpers'
import { 
  CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, 
} from '../types'
import type { SuggestionCategory, SuggestionStatus, Response } from '../types'

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

interface AdminProfile {
  user_id: string
  display_name: string | null
  role: string
  created_at: string
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
  const [activeTab, setActiveTab] = useState<'details' | 'manage' | 'respond'>('details')
  const [responseText, setResponseText] = useState('')
  const [decision, setDecision] = useState<'accepted' | 'rejected' | ''>('')
  const [responses, setResponses] = useState<Response[]>([])
  const [responsesLoading, setResponsesLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    completed: 0
  })
  const [role, setRole] = useState('')
  const [showAdmins, setShowAdmins] = useState(false)
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [adminForm, setAdminForm] = useState({ displayName: '', email: '', password: '' })
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')
  const [editingAdmin, setEditingAdmin] = useState<AdminProfile | null>(null)
  const [adminEditForm, setAdminEditForm] = useState({ displayName: '', role: 'admin', password: '' })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchSuggestions()
      fetchStats()
      fetchAdmins()
    }
  }, [user])

  useEffect(() => {
    if (selectedSuggestion) {
      fetchResponses(selectedSuggestion.id)
    } else {
      setResponses([])
    }
  }, [selectedSuggestion?.id])

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

    if (!profile || !isAdminRole(profile.role)) {
      await supabase.auth.signOut()
      navigate('/admin/login')
      return
    }

    setRole((profile.role || '').toLowerCase())
    setUser(session.user)
  }

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, role, created_at')
      .in('role', ['admin', 'superadmin'])
      .order('created_at', { ascending: true })

    if (!error && data) setAdmins(data as AdminProfile[])
  }

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError('')
    setAdminSuccess('')

    if (!adminForm.displayName.trim() || !adminForm.email.trim()) {
      setAdminError('Name and email are required.')
      return
    }
    if (adminForm.password.length < 6) {
      setAdminError('Password must be at least 6 characters.')
      return
    }

    setAdminSaving(true)
    try {
      const { error } = await supabase.rpc('create_admin_account', {
        p_email: adminForm.email.trim(),
        p_password: adminForm.password,
        p_display_name: adminForm.displayName.trim()
      })

      if (error) throw error

      setAdminSuccess(`Admin account created for ${adminForm.email.trim()}.`)
      setAdminForm({ displayName: '', email: '', password: '' })
      fetchAdmins()
    } catch (err: any) {
      setAdminError(err?.message || 'Failed to create admin.')
    } finally {
      setAdminSaving(false)
    }
  }

  const startEditAdmin = (admin: AdminProfile) => {
    setAdminError('')
    setAdminSuccess('')
    setEditingAdmin(admin)
    setAdminEditForm({
      displayName: admin.display_name || '',
      role: admin.role === 'superadmin' ? 'superadmin' : 'admin',
      password: ''
    })
  }

  const saveAdminChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAdmin) return

    setAdminError('')
    setAdminSuccess('')
    setAdminSaving(true)
    try {
      const { error } = await supabase.rpc('update_admin_account', {
        p_user_id: editingAdmin.user_id,
        p_display_name: adminEditForm.displayName.trim(),
        p_role: adminEditForm.role,
        p_password: adminEditForm.password ? adminEditForm.password : null
      })

      if (error) throw error

      setAdminSuccess('Admin account updated.')
      setEditingAdmin(null)
      fetchAdmins()
    } catch (err: any) {
      setAdminError(err?.message || 'Failed to update admin.')
    } finally {
      setAdminSaving(false)
    }
  }

  const deleteAdmin = async (admin: AdminProfile) => {
    const label = admin.display_name || admin.user_id
    if (!window.confirm(`Delete admin "${label}"? This cannot be undone.`)) return

    setAdminError('')
    setAdminSuccess('')
    setAdminSaving(true)
    try {
      const { error } = await supabase.rpc('delete_admin_account', {
        p_user_id: admin.user_id
      })

      if (error) throw error

      setAdminSuccess('Admin account deleted.')
      if (editingAdmin?.user_id === admin.user_id) setEditingAdmin(null)
      fetchAdmins()
    } catch (err: any) {
      setAdminError(err?.message || 'Failed to delete admin.')
    } finally {
      setAdminSaving(false)
    }
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

  const fetchResponses = async (suggestionId: string) => {
    setResponsesLoading(true)
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('suggestion_id', suggestionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setResponses((data || []) as Response[])
    } catch (error) {
      console.error('Error fetching responses:', error)
      setResponses([])
    } finally {
      setResponsesLoading(false)
    }
  }

  const submitResponse = async (nextDecision: 'accepted' | 'rejected') => {
    if (!selectedSuggestion) return

    setUpdating(true)
    try {
      const fallback =
        nextDecision === 'accepted' ? 'Suggestion accepted.' : 'Suggestion rejected.'
      const payload: Record<string, unknown> = {
        suggestion_id: selectedSuggestion.id,
        admin_id: user.id,
        response_text: responseText.trim() || fallback,
        decision: nextDecision
      }

      let { error } = await supabase.from('responses').insert(payload)

      if (error && /decision/i.test(error.message)) {
        delete payload.decision
        ;({ error } = await supabase.from('responses').insert(payload))
      }

      if (error) throw error

      const { error: statusError } = await supabase
        .from('suggestions')
        .update({ status: nextDecision, updated_at: new Date().toISOString() })
        .eq('id', selectedSuggestion.id)

      if (statusError) throw statusError

      setResponseText('')
      setDecision('')
      setSelectedSuggestion({ ...selectedSuggestion, status: nextDecision })
      fetchResponses(selectedSuggestion.id)
      fetchSuggestions()
      fetchStats()
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
          <div className="flex items-center justify-between gap-2 h-16">
            <div className="flex items-center min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              {role === 'superadmin' && (
                <button
                  onClick={() => setShowAdmins(true)}
                  aria-label="Manage admins"
                  className="flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  <Users className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Manage Admins</span>
                </button>
              )}
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600"
              >
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <div className="w-full sm:flex-1 sm:min-w-64">
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
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="true">High Priority</option>
                <option value="false">Normal</option>
              </select>
              <button
                onClick={fetchSuggestions}
                className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : suggestions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No suggestions found</td>
                  </tr>
                ) : (
                  suggestions.map((suggestion) => (
                    <tr
                      key={suggestion.id}
                      onClick={() => {
                        setSelectedSuggestion(suggestion)
                        setActiveTab('details')
                      }}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                        {suggestion.reference_number}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {suggestion.priority && (
                            <Star className="h-4 w-4 text-orange-500 fill-current shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {suggestion.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[suggestion.status]}`}>
                          {getStatusIcon(suggestion.status)}
                          <span className="ml-1">{STATUS_LABELS[suggestion.status]}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(suggestion.created_at)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedSuggestion(suggestion)
                            setActiveTab('details')
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{selectedSuggestion.title}</h2>
                    <p className="text-sm text-gray-500">Ref: {selectedSuggestion.reference_number}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSuggestion(null)
                      setResponseText('')
                      setDecision('')
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 flex gap-1 border-b border-gray-200 -mb-4 sm:-mb-6">
                  {([
                    { key: 'details', label: 'Details' },
                    { key: 'manage', label: 'Manage' },
                    { key: 'respond', label: 'Respond' }
                  ] as const).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                        activeTab === tab.key
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Category</p>
                        <p className="text-sm font-medium text-gray-900">{CATEGORY_LABELS[selectedSuggestion.category]}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                        <span className={`inline-flex items-center px-2 py-1 mt-1 text-xs font-medium rounded-full ${STATUS_COLORS[selectedSuggestion.status]}`}>
                          {getStatusIcon(selectedSuggestion.status)}
                          <span className="ml-1">{STATUS_LABELS[selectedSuggestion.status]}</span>
                        </span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Priority</p>
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          {selectedSuggestion.priority ? (
                            <>
                              <Star className="h-4 w-4 text-orange-500 fill-current" />
                              High Priority
                            </>
                          ) : 'Normal'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
                        <p className="text-sm font-medium text-gray-900">{selectedSuggestion.anonymous ? 'Anonymous' : 'Identified'}</p>
                      </div>
                    </div>

                    {!selectedSuggestion.anonymous && ((selectedSuggestion as any).submitter_name || (selectedSuggestion as any).submitter_email) && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                        <p className="font-medium text-blue-900">Submitter Information</p>
                        {(selectedSuggestion as any).submitter_name && <p className="text-blue-800">Name: {(selectedSuggestion as any).submitter_name}</p>}
                        {(selectedSuggestion as any).submitter_email && <p className="text-blue-800">Email: {(selectedSuggestion as any).submitter_email}</p>}
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Submitted</p>
                      <p className="text-sm text-gray-600 mb-3">{formatDate(selectedSuggestion.created_at)}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedSuggestion.description}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'manage' && (
                  <div className="space-y-4">
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
                )}

                {activeTab === 'respond' && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Conversation History
                      </h3>
                      {responsesLoading ? (
                        <p className="text-sm text-gray-500">Loading previous responses...</p>
                      ) : responses.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No responses yet. This suggestion is under review.
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {responses.map((response) => {
                            const isAccepted = response.decision === 'accepted'
                            const isRejected = response.decision === 'rejected'
                            return (
                              <div
                                key={response.id}
                                className={`p-3 rounded-md border ${
                                  isAccepted
                                    ? 'bg-green-50 border-green-200'
                                    : isRejected
                                      ? 'bg-red-50 border-red-200'
                                      : 'bg-blue-50 border-blue-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span
                                    className={`text-xs font-medium ${
                                      isAccepted
                                        ? 'text-green-700'
                                        : isRejected
                                          ? 'text-red-700'
                                          : 'text-blue-700'
                                    }`}
                                  >
                                    {isAccepted ? 'Accepted' : isRejected ? 'Rejected' : 'Comment'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(response.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                                  {response.response_text}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Decision
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDecision('accepted')}
                          disabled={updating}
                          className={`flex items-center justify-center px-3 py-2 rounded-md border font-medium disabled:opacity-50 ${
                            decision === 'accepted'
                              ? 'bg-green-600 border-green-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecision('rejected')}
                          disabled={updating}
                          className={`flex items-center justify-center px-3 py-2 rounded-md border font-medium disabled:opacity-50 ${
                            decision === 'rejected'
                              ? 'bg-red-600 border-red-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-red-50'
                          }`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comment <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a comment to explain your decision..."
                      />
                    </div>

                    <button
                      onClick={() => decision && submitResponse(decision)}
                      disabled={updating || !decision}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updating
                        ? 'Sending...'
                        : decision === 'accepted'
                          ? 'Send Acceptance'
                          : decision === 'rejected'
                            ? 'Send Rejection'
                            : 'Select Accept or Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showAdmins && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Manage Admins</h2>
                  <p className="text-sm text-gray-500">Create an account and grant it admin access.</p>
                </div>
                <button
                  onClick={() => {
                    setShowAdmins(false)
                    setAdminError('')
                    setAdminSuccess('')
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
                {adminError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{adminError}</div>
                )}
                {adminSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">{adminSuccess}</div>
                )}

                <form onSubmit={createAdmin} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={adminForm.displayName}
                      onChange={(e) => setAdminForm({ ...adminForm, displayName: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="password"
                    placeholder="Temporary password (min 6 characters)"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={adminSaving}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {adminSaving ? 'Creating...' : 'Create Admin'}
                  </button>
                </form>

                {editingAdmin && (
                  <form onSubmit={saveAdminChanges} className="p-4 border border-blue-200 bg-blue-50 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-blue-900">
                        Edit {editingAdmin.display_name || 'admin'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditingAdmin(null)}
                        className="text-sm text-blue-700 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Full name"
                        value={adminEditForm.displayName}
                        onChange={(e) => setAdminEditForm({ ...adminEditForm, displayName: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={adminEditForm.role}
                        onChange={(e) => setAdminEditForm({ ...adminEditForm, role: e.target.value })}
                        disabled={editingAdmin.user_id === user?.id}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>
                    <input
                      type="password"
                      placeholder="New password (leave blank to keep current)"
                      value={adminEditForm.password}
                      onChange={(e) => setAdminEditForm({ ...adminEditForm, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={adminSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {adminSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Existing Admins</h3>
                  <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
                    {admins.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500">No admins found.</p>
                    ) : (
                      admins.map((admin) => (
                        <div key={admin.user_id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{admin.display_name || 'Unnamed admin'}</p>
                            <p className="text-xs text-gray-500 font-mono truncate">{admin.user_id}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                admin.role === 'superadmin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {admin.role}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditAdmin(admin)}
                              aria-label="Edit admin"
                              title="Edit admin"
                              className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {admin.user_id !== user?.id && (
                              <button
                                type="button"
                                onClick={() => deleteAdmin(admin)}
                                disabled={adminSaving}
                                aria-label="Delete admin"
                                title="Delete admin"
                                className="p-1.5 rounded-md text-red-600 hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
