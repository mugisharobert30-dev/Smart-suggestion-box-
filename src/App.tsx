import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import SubmitSuggestion from './pages/SubmitSuggestion'
import SubmitSuccess from './pages/SubmitSuccess'
import TrackSuggestion from './pages/TrackSuggestion'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Routes>
          <Route path="/" element={<><Navbar /><Home /></>} />
          <Route path="/submit" element={<><Navbar /><SubmitSuggestion /></>} />
          <Route path="/submit/success" element={<SubmitSuccess />} />
          <Route path="/track" element={<><Navbar /><TrackSuggestion /></>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
