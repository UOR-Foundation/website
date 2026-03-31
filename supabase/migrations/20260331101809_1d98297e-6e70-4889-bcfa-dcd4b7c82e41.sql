
-- Remove sensitive tables from Realtime publication to prevent cross-user data leaks
ALTER PUBLICATION supabase_realtime DROP TABLE public.trust_connections;
ALTER PUBLICATION supabase_realtime DROP TABLE public.mirror_bonds;
ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_messages;
