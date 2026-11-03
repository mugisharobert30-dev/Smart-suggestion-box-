DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update suggestions" ON suggestions;
DROP POLICY IF EXISTS "Admins can view all suggestions" ON suggestions;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow all operations on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can update all suggestions" ON suggestions FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin')
);
CREATE POLICY "Admins can view all suggestions" ON suggestions FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin')
);
