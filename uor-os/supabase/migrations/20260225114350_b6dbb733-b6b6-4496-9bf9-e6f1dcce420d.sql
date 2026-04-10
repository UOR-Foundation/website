
-- Conversations table
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  model_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Conversation policies
CREATE POLICY "Users can read own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Message policies (scoped through conversation ownership)
CREATE POLICY "Users can read own messages"
  ON public.ai_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE id = ai_messages.conversation_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in own conversations"
  ON public.ai_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE id = ai_messages.conversation_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own messages"
  ON public.ai_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE id = ai_messages.conversation_id AND user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);

-- Auto-update timestamp trigger
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
