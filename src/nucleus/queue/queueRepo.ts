// src/nucleus/queue/queueRepo.ts
//
// DB access for the durable queue (supabase/migrations/
// 20260922000000_nucleus_queue.sql). Deliberately separate from
// queueEngine.ts's own class so the engine's control flow (retry
// counting, audit/billing hooks) stays readable and this file stays
// a thin, testable data-access layer -- same split nucleusDBBridge.ts
// uses for the other nucleus_* tables.
import { queueClient as client } from "./queueDB";
import type { Dynamic } from "../types/dynamic";

export interface QueueMessageRow {
  id: string;
  organization_id: string;
  queue: string;
  payload: Dynamic;
  attempts: number;
  max_attempts: number;
  status: "pending" | "processing" | "delivered" | "failed";
  last_error: Dynamic;
  created_at: string;
  updated_at: string;
}

export async function insertQueueMessage(
  organizationId: string,
  queue: string,
  payload: Dynamic,
  maxAttempts: number,
): Promise<QueueMessageRow> {
  const { data, error } = await client
    .from("nucleus_queue_messages")
    .insert({
      organization_id: organizationId,
      queue,
      payload: payload ?? {},
      max_attempts: maxAttempts,
    })
    .select()
    .single();

  if (error) throw error;
  return data as QueueMessageRow;
}

/** Atomically claims (and marks 'processing', increments attempts on)
 * the oldest pending message for a queue via the migration's
 * FOR UPDATE SKIP LOCKED function -- safe under concurrent pollers. */
export async function claimNextQueueMessage(queue: string): Promise<QueueMessageRow | null> {
  const { data, error } = await client.rpc("claim_next_queue_message", { p_queue: queue });
  if (error) throw error;
  return (data as QueueMessageRow | null) ?? null;
}

export async function markQueueMessageDelivered(id: string): Promise<void> {
  const { error } = await client
    .from("nucleus_queue_messages")
    .update({ status: "delivered", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Marks a failed attempt. If attempts are exhausted, marks 'failed'
 * terminally; otherwise resets to 'pending' so the next poll retries
 * it -- attempts was already incremented by claimNextQueueMessage(). */
export async function markQueueMessageFailed(
  id: string,
  attempts: number,
  maxAttempts: number,
  error: Dynamic,
): Promise<void> {
  const { error: dbError } = await client
    .from("nucleus_queue_messages")
    .update({
      status: attempts < maxAttempts ? "pending" : "failed",
      last_error: error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (dbError) throw dbError;
}

export async function listQueueMessages(queue: string): Promise<QueueMessageRow[]> {
  const { data, error } = await client
    .from("nucleus_queue_messages")
    .select()
    .eq("queue", queue)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as QueueMessageRow[]) ?? [];
}

/** Same as listQueueMessages but across every queue -- backs
 * QueueEngine.getDeliveries()'s no-argument "all queues" form. */
export async function listAllQueueMessages(): Promise<QueueMessageRow[]> {
  const { data, error } = await client
    .from("nucleus_queue_messages")
    .select()
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as QueueMessageRow[]) ?? [];
}

export async function clearQueueMessages(): Promise<void> {
  const { error } = await client
    .from("nucleus_queue_messages")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}
