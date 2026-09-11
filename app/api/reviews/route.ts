/**
 * Customer review submission. `customer_id`/`designer_id` are always derived server-side from the
 * project itself — never trusted from the request body — and the project is looked up scoped to
 * the caller's OWN customer_id, so a customer can't even attempt to review someone else's project.
 * The database's own defenses (reviews_enforce_project_rules trigger: project must be completed,
 * customer_id/designer_id must match the project; unique(project_id): no duplicate review) are the
 * final word regardless — see supabase/migrations/20260829180010_reviews.sql.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/supabase/authorization";
import { errorResponse, isPostgrestError } from "@/lib/supabase/errors";
import type { TablesInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ctx = await requireCustomer();
    const body = await request.json().catch(() => null);

    const projectId = typeof body?.projectId === "string" ? body.projectId : "";
    const rating = typeof body?.rating === "number" ? Math.round(body.rating) : 0;
    const reviewText = typeof body?.reviewText === "string" ? body.reviewText.trim() : "";
    if (!projectId || rating < 1 || rating > 5 || !reviewText) {
      return NextResponse.json(
        { status: "error", message: "A rating (1–5) and a written review are required." },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, designer_id, status")
      .eq("id", projectId)
      .eq("customer_id", ctx.customerId)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project) {
      return NextResponse.json({ status: "error", message: "Project not found." }, { status: 404 });
    }
    if (project.status !== "completed") {
      return NextResponse.json(
        { status: "error", message: "You can only review a project once it's completed." },
        { status: 400 }
      );
    }

    const insert: TablesInsert<"reviews"> = {
      project_id: project.id,
      designer_id: project.designer_id,
      customer_id: ctx.customerId,
      rating,
      review_text: reviewText,
    };
    const { data, error } = await supabase.from("reviews").insert(insert).select().single();
    if (error) {
      if (isPostgrestError(error) && error.code === "23505") {
        return NextResponse.json(
          { status: "error", message: "You've already reviewed this project." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      status: "ok",
      review: {
        id: data.id,
        projectId: data.project_id,
        designerId: data.designer_id,
        customerId: data.customer_id,
        rating: data.rating,
        text: data.review_text,
        date: data.created_at,
      },
    });
  } catch (err) {
    return errorResponse(err, "api.reviews.create");
  }
}
