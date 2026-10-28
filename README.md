# Smart Suggestion Box System

A simple, modern, and intelligent company suggestion box system that allows employees to submit suggestions, ideas, complaints, and feedback to improve the company's operations.

## Features

### Employee Interface
- **Submit Suggestions** - Easy form with title, description, category, and anonymous option
- **Smart Categorization** - Automatically suggests categories based on content
- **Anonymous Submission** - Submit without revealing identity
- **Track Suggestions** - Check status using unique reference number
- **View Responses** - See management feedback and updates

### Management/Admin Dashboard
- **View All Suggestions** - Manage all submitted suggestions in one place
- **Filter & Search** - Filter by category, status, priority, or search keywords
- **Update Status** - Change status (Submitted, Under Review, Accepted, In Progress, Rejected)
- **Add Responses** - Provide feedback and explanations
- **Mark Priority** - Flag important suggestions
- **Statistics Dashboard** - View submission counts and metrics
- **Export to CSV** - Download suggestion records

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend/Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Routing:** React Router DOM
- **Icons:** Lucide React

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd "Smart suggestion box"
```

2. Install dependencies
```bash
npm install
```

3. Set up Supabase

Create a new Supabase project at [supabase.com](https://supabase.com). Then run the following SQL in your Supabase SQL editor:

```sql
-- Create suggestions table
CREATE TABLE suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(30) NOT NULL,
  anonymous BOOLEAN DEFAULT FALSE,
  submitter_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'submitted',
  priority BOOLEAN DEFAULT FALSE,
  attachment_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create responses table
CREATE TABLE responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID REFERENCES suggestions(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id),
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name VARCHAR(100),
  role VARCHAR(10) DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suggestions
CREATE POLICY "Anyone can insert suggestions" ON suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view suggestions by reference" ON suggestions FOR SELECT USING (true);
CREATE POLICY "Admins can update suggestions" ON suggestions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can view all suggestions" ON suggestions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
);

-- RLS Policies for responses
CREATE POLICY "Admins can insert responses" ON responses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Anyone can view responses for suggestions" ON responses FOR SELECT USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
);
```

4. Configure environment variables

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Create an admin user

In Supabase Auth, create a user, then in the profiles table, insert a record with role 'admin'.

6. Run the development server
```bash
npm run dev
```

## Usage

1. **Employees:** Go to the homepage and click "Submit a Suggestion" to submit ideas
2. **Track:** Use "Track Status" with your reference number to check progress
3. **Admins:** Login at "/admin/login" with admin credentials to manage suggestions

## Deployment

This app can be deployed to Vercel, Netlify, or any static hosting provider.

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder

## Security Notes

- Anonymous submissions do not expose submitter identity in the management interface
- Row Level Security (RLS) is enabled on all tables
- Admin routes require authentication and role verification
- Input validation is implemented on all forms

## License

This project is built for internal company use.
