
-- WhatsApp connections: links phone numbers to Hologram user profiles
CREATE TABLE public.whatsapp_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  onboarding_step TEXT NOT NULL DEFAULT 'intro',
  conversation_context JSONB NOT NULL DEFAULT '{}',
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone_number)
);

-- Enable RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Users can manage their own connections
CREATE POLICY "Users can read own WhatsApp connections"
  ON public.whatsapp_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own WhatsApp connections"
  ON public.whatsapp_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own WhatsApp connections"
  ON public.whatsapp_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own WhatsApp connections"
  ON public.whatsapp_connections FOR DELETE
  USING (auth.uid() = user_id);

-- WhatsApp message log for audit and context
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'inbound', -- 'inbound' or 'outbound'
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'voice', 'image'
  content TEXT NOT NULL,
  meta JSONB,
  whatsapp_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own WhatsApp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_connections wc
    WHERE wc.id = whatsapp_messages.connection_id
    AND wc.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own WhatsApp messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_connections wc
    WHERE wc.id = whatsapp_messages.connection_id
    AND wc.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live message updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
