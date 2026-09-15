// Row shape for the api_clients table (supabase/migrations/20260915d_api_clients.sql)
// -- credentials for external services calling nucleus's own Edge
// Function APIs (adjudicate-claim, weaver-score, guardian-status).
// key_hash is intentionally never part of this type: no code path in
// this app should ever need to read it back.

export interface ApiClient {
  client_id: string;
  label: string;
  enabled: boolean;
  created_at: string;
}
