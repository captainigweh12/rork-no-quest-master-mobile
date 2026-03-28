-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team tasks (No Tasks assigned to teams)
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  category TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  xp INTEGER NOT NULL DEFAULT 10,
  min_no_required INTEGER DEFAULT 3,
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team task assignments (tracking which team members are working on which tasks)
CREATE TABLE IF NOT EXISTS public.team_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_task_id UUID REFERENCES public.team_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'failed')),
  no_count INTEGER DEFAULT 0,
  yes_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_task_id, user_id)
);

-- Team invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_email TEXT,
  invitee_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Team members can view their teams" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their teams" ON public.teams
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete their teams" ON public.teams
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for team_members
CREATE POLICY "Team members can view team members" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can insert team members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and managers can update team members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      LEFT JOIN public.team_members tm ON t.id = tm.team_id AND tm.user_id = auth.uid()
      WHERE t.id = team_id AND (t.owner_id = auth.uid() OR tm.role IN ('owner', 'manager'))
    )
  );

CREATE POLICY "Team owners can delete team members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- RLS Policies for team_tasks
CREATE POLICY "Team members can view team tasks" ON public.team_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_tasks.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and managers can create team tasks" ON public.team_tasks
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_tasks.team_id AND user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Team owners and managers can update team tasks" ON public.team_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_tasks.team_id AND user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Team owners and managers can delete team tasks" ON public.team_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_tasks.team_id AND user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- RLS Policies for team_task_assignments
CREATE POLICY "Users can view their team task assignments" ON public.team_task_assignments
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.team_tasks tt
      INNER JOIN public.team_members tm ON tt.team_id = tm.team_id
      WHERE tt.id = team_task_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Team managers can create task assignments" ON public.team_task_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_tasks tt
      INNER JOIN public.team_members tm ON tt.team_id = tm.team_id
      WHERE tt.id = team_task_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Users can update their task assignments" ON public.team_task_assignments
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for team_invites
CREATE POLICY "Team members can view team invites" ON public.team_invites
  FOR SELECT USING (
    auth.uid() = inviter_id OR 
    auth.uid() = invitee_id OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = team_invites.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can create invites" ON public.team_invites
  FOR INSERT WITH CHECK (
    auth.uid() = inviter_id AND
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can update team invites" ON public.team_invites
  FOR UPDATE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_team_id ON public.team_tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_team_task_assignments_team_task_id ON public.team_task_assignments(team_task_id);
CREATE INDEX IF NOT EXISTS idx_team_task_assignments_user_id ON public.team_task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_invite_code ON public.team_invites(invite_code);

-- Function to update updated_at timestamp for teams
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update updated_at timestamp for team_tasks
DROP TRIGGER IF EXISTS update_team_tasks_updated_at ON public.team_tasks;
CREATE TRIGGER update_team_tasks_updated_at
  BEFORE UPDATE ON public.team_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically add team owner as a team member
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();
