import "server-only";

/**
 * Shared server-side shaping helpers for the customer API routes (Phase 4).
 *
 * Two jobs live here:
 *  1. Mapping snake_case DB rows into the exact camelCase shapes the existing frontend types
 *     (types/index.ts) already expect — so pages only need their DATA SOURCE changed (fetch
 *     instead of a store-hook), not their JSX. No field is renamed inconsistently between the
 *     database and what the frontend reads.
 *  2. Resolving *_images child tables + files + Supabase Storage into ordered URL arrays — the
 *     Core Principle's "same request data, read via joins, never copied" applies here too: this
 *     always reads request_images/diary_entry_images/project_update_images + files fresh, never a
 *     cached/duplicated copy of an image URL.
 *
 * Every function here takes an already-authenticated `supabase` client (lib/supabase/server.ts) —
 * RLS applies as the calling user throughout; nothing here uses the admin/service-role client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/types";
import { createSignedFileUrl, getPublicFileUrl, type StorageBucketKey } from "@/lib/supabase/storage";

type Supa = SupabaseClient<Database>;

/* ------------------------------------------------------------------ */
/* Ordered image resolution — *_images child table -> files -> Storage */
/* ------------------------------------------------------------------ */

export interface ResolvedImage {
  fileId: string;
  url: string;
}

async function resolveOrderedImagesFull(
  supabase: Supa,
  table: "request_images" | "diary_entry_images" | "project_update_images",
  parentColumn: "request_id" | "entry_id" | "update_id",
  parentId: string,
  bucket: StorageBucketKey
): Promise<ResolvedImage[]> {
  // Cast to `any` for this one query builder chain: `table`/`parentColumn` are deliberately a
  // closed union across three different tables (see the exported wrappers below), which the
  // generated Database types can't express as a single overload — the real safety here is that
  // only this file's callers, each passing a matched (table, column) pair, ever reach this code,
  // not any looser typing elsewhere.
  const { data, error } = await (supabase.from(table) as any)
    .select("position, files(id, storage_path)")
    .eq(parentColumn, parentId)
    .order("position", { ascending: true });

  if (error || !data) return [];

  const rows = data as { position: number; files: { id: string; storage_path: string } | null }[];
  const resolved = await Promise.all(
    rows.map(async (row) => {
      if (!row.files) return null;
      try {
        const url = await createSignedFileUrl(supabase, bucket, row.files.storage_path, 60 * 30);
        return { fileId: row.files.id, url };
      } catch {
        return null;
      }
    })
  );

  return resolved.filter((r): r is ResolvedImage => r !== null);
}

async function resolveOrderedImages(
  supabase: Supa,
  table: "request_images" | "diary_entry_images" | "project_update_images",
  parentColumn: "request_id" | "entry_id" | "update_id",
  parentId: string,
  bucket: StorageBucketKey
): Promise<string[]> {
  const images = await resolveOrderedImagesFull(supabase, table, parentColumn, parentId, bucket);
  return images.map((i) => i.url);
}

export const resolveRequestImages = (supabase: Supa, requestId: string) =>
  resolveOrderedImages(supabase, "request_images", "request_id", requestId, "requestImages");

/** Diary images need the fileId (not just the display url) too — editing an entry re-sends the
 *  full ordered set of imageFileIds, so the frontend needs a way to know which id each already-
 *  attached image corresponds to. */
export const resolveDiaryImagesFull = (supabase: Supa, entryId: string) =>
  resolveOrderedImagesFull(supabase, "diary_entry_images", "entry_id", entryId, "diaryImages");

/** Also fileId+url pairs (not just display urls) — the designer workspace's edit-update modal
 *  needs the fileId to re-populate its UploadedImage[] state (see mapProjectUpdate). */
export const resolveProjectUpdateImages = (supabase: Supa, updateId: string) =>
  resolveOrderedImagesFull(supabase, "project_update_images", "update_id", updateId, "projectUpdates");

/* ------------------------------------------------------------------ */
/* Designer summaries — for embedding into request/proposal/project    */
/* responses without a separate mock-data lookup on the frontend.      */
/* ------------------------------------------------------------------ */

/** The signed-in customer's name/avatar, for the persistent Navbar header (Phase 7 fix — the
 *  Navbar used to always show the seeded mock customer, regardless of who was actually signed
 *  in). Same customer_profiles + avatars-bucket shape app/api/profile/customer/route.ts already
 *  reads for the Profile page, kept as its own small query here rather than exported from that
 *  route file, so a working route isn't touched to serve an unrelated caller. */
export async function getOwnCustomerIdentity(supabase: Supa, userId: string): Promise<{ name: string; avatar: string }> {
  const { data } = await supabase
    .from("customer_profiles")
    .select("name, files:files!customer_profiles_avatar_file_id_fkey(storage_path)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { name: "", avatar: "" };
  const avatarPath = (data as unknown as { files: { storage_path: string } | null }).files?.storage_path;
  return { name: data.name ?? "", avatar: avatarPath ? getPublicFileUrl(supabase, "avatars", avatarPath) : "" };
}

export interface DesignerSummary {
  id: string;
  name: string;
  studioName: string;
  type: string;
  avatar: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
}

/** Fetches summaries for a batch of designer_profiles ids in a small, fixed number of queries
 *  (never N+1) — three simple queries stitched together in JS rather than a single fragile
 *  PostgREST embed across two different FKs into files. */
export async function getDesignerSummaries(
  supabase: Supa,
  designerIds: string[]
): Promise<Map<string, DesignerSummary>> {
  const ids = [...new Set(designerIds)].filter(Boolean);
  const result = new Map<string, DesignerSummary>();
  if (ids.length === 0) return result;

  // Approval status comes from designer_public_profiles (a view, not designer_verifications
  // directly) — designer_verifications RLS is intentionally owner-or-admin-only, so a customer's
  // own client can never see another designer's row there at all (Phase 7 fix: this silently made
  // `verified` false for every designer summary a customer ever saw, since Phase 4/5).
  const [{ data: designers }, { data: approvals }] = await Promise.all([
    supabase
      .from("designer_profiles")
      .select("id, user_id, studio_name, type, rating, review_count, avatar_file_id")
      .in("id", ids),
    supabase.from("designer_public_profiles").select("id, is_approved").in("id", ids),
  ]);
  if (!designers) return result;

  const userIds = designers.map((d) => d.user_id);
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, display_name").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameByUserId = new Map((users ?? []).map((u) => [u.id, u.display_name ?? ""]));

  const avatarFileIds = designers.map((d) => d.avatar_file_id).filter((id): id is string => !!id);
  const { data: avatarFiles } = avatarFileIds.length
    ? await supabase.from("files").select("id, storage_path").in("id", avatarFileIds)
    : { data: [] as { id: string; storage_path: string }[] };
  const pathByFileId = new Map((avatarFiles ?? []).map((f) => [f.id, f.storage_path]));

  const approvedByDesignerId = new Map((approvals ?? []).map((a) => [a.id, !!a.is_approved]));

  for (const d of designers) {
    const avatarPath = d.avatar_file_id ? pathByFileId.get(d.avatar_file_id) : undefined;
    result.set(d.id, {
      id: d.id,
      name: nameByUserId.get(d.user_id) || d.studio_name,
      studioName: d.studio_name,
      type: d.type,
      avatar: avatarPath ? getPublicFileUrl(supabase, "avatars", avatarPath) : "",
      verified: approvedByDesignerId.get(d.id) ?? false,
      rating: Number(d.rating),
      reviewCount: d.review_count,
    });
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* fashion_requests -> frontend FashionRequest shape                   */
/* ------------------------------------------------------------------ */

export function mapRequest(row: Tables<"fashion_requests">, inspirationImages: string[]) {
  return {
    id: row.id,
    customerId: row.customer_id,
    title: row.title,
    category: row.category,
    occasion: row.occasion ?? "",
    gender: row.gender ?? "",
    size: row.size ?? "",
    measurements: (row.measurements as Record<string, string>) ?? {},
    inspirationImages,
    description: row.description,
    fabricPreference: row.fabric_preference ?? "",
    budgetMin: row.budget_min !== null ? Number(row.budget_min) : 0,
    budgetMax: row.budget_max !== null ? Number(row.budget_max) : 0,
    location: row.location ?? "",
    dueDate: row.due_date ?? "",
    preferredDesignerId: row.preferred_designer_id ?? undefined,
    additionalPreferences: row.additional_preferences ?? "",
    status: row.status,
    createdAt: row.created_at,
  };
}

/* ------------------------------------------------------------------ */
/* proposals -> frontend Proposal shape (+ embedded designer summary)  */
/* ------------------------------------------------------------------ */

export function mapProposal(row: Tables<"proposals">, designer?: DesignerSummary) {
  return {
    id: row.id,
    requestId: row.request_id,
    designerId: row.designer_id,
    price: Number(row.price),
    estimatedDays: row.estimated_days ?? 0,
    description: row.description ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    status: row.status,
    designer,
  };
}

/* ------------------------------------------------------------------ */
/* diary_entries -> frontend DiaryEntry shape                          */
/* ------------------------------------------------------------------ */

export function mapDiaryEntry(row: Tables<"diary_entries">, images: ResolvedImage[]) {
  return {
    id: row.id,
    customerId: row.customer_id,
    title: row.title,
    note: row.note ?? "",
    mood: row.mood ?? "",
    // Plain display urls, matching the frontend DiaryEntry type exactly (list/detail read this).
    images: images.map((i) => i.url),
    // fileId+url pairs, for the edit modal to re-populate ImageUploader/UploadedImage[] state
    // without losing track of which already-attached image is which when the user saves without
    // touching images (PATCH's imageFileIds is a full ordered replacement, not a diff).
    imageFiles: images,
    date: row.created_at,
    updatedAt: row.updated_at !== row.created_at ? row.updated_at : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* customer_saved_items -> frontend CustomerSavedItem shape            */
/* One of four target columns is set per row (see the DB CHECK         */
/* constraint) — itemId collapses whichever one is non-null.           */
/* ------------------------------------------------------------------ */

export function mapSavedItem(row: Tables<"customer_saved_items">) {
  const itemId = row.designer_id ?? row.dress_id ?? row.collection_id ?? row.project_id ?? "";
  return {
    id: row.id,
    customerId: row.customer_id,
    itemType: row.item_type,
    itemId,
    createdAt: row.created_at,
  };
}

/* ------------------------------------------------------------------ */
/* projects -> frontend Project shape.                                 */
/*                                                                      */
/* This is the Core Principle in code: projects itself stores ONLY     */
/* request_id/proposal_id/customer_id/designer_id + its own genuinely  */
/* project-specific fields (stage/stages/progress/status/dates). Every */
/* "what is this project actually FOR" field (title, category,         */
/* description, measurements, budget, images...) is read fresh off the */
/* request this project references, and confirmedPrice off the         */
/* accepted proposal — never a second stored copy.                     */
/* ------------------------------------------------------------------ */

export function mapProject(
  project: Tables<"projects">,
  request: Tables<"fashion_requests">,
  proposal: Tables<"proposals">,
  inspirationImages: string[]
) {
  return {
    id: project.id,
    requestId: project.request_id,
    customerId: project.customer_id,
    designerId: project.designer_id,
    title: request.title,
    category: request.category,
    occasion: request.occasion ?? "",
    gender: request.gender ?? "",
    referenceImages: inspirationImages,
    description: request.description,
    fabricPreference: request.fabric_preference ?? "",
    measurements: (request.measurements as Record<string, string>) ?? {},
    additionalPreferences: request.additional_preferences ?? "",
    budgetMin: request.budget_min !== null ? Number(request.budget_min) : 0,
    budgetMax: request.budget_max !== null ? Number(request.budget_max) : 0,
    location: request.location ?? "",
    confirmedPrice: Number(proposal.price),
    stage: project.stage,
    stages: project.stages,
    dueDate: request.due_date ?? "",
    progressPercent: project.progress_percent,
    status: project.status,
    completedAt: project.completed_at ?? undefined,
    changesRequestedAt: project.changes_requested_at ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/* project_updates -> frontend ProgressUpdate shape                    */
/* ------------------------------------------------------------------ */

export function mapProjectUpdate(row: Tables<"project_updates">, images: ResolvedImage[]) {
  return {
    id: row.id,
    stage: row.stage,
    note: row.note ?? "",
    // Plain display urls, matching the frontend ProgressUpdate type (list/workspace read this).
    images: images.map((i) => i.url),
    // fileId+url pairs, so the designer workspace's edit-update modal can re-populate
    // UploadedImage[] state without losing track of which already-attached image is which.
    imageFiles: images,
    date: row.created_at,
  };
}
