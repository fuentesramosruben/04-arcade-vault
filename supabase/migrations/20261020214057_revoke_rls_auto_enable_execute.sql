-- La función solo la ejecuta el event trigger ensure_rls; nadie la llama por RPC
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
