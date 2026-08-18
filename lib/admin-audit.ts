import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { AdminRole } from "@/lib/admin-permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AuditActor = {
  user: {
    id: string;
    email?: string | null;
  };
  profile: {
    name: string | null;
  };
  role: AdminRole;
};

export type AdminAuditEntry = {
  action: "created" | "updated" | "deleted";
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function recordAdminAudit(
  actor: AuditActor,
  entry: AdminAuditEntry
) {
  try {
    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient
      .from("admin_audit_logs")
      .insert({
        actor_user_id: actor.user.id,
        actor_name:
          actor.profile.name ||
          actor.user.email ||
          "Usuário administrativo",
        actor_email: actor.user.email ?? null,
        actor_role:
          actor.role === "admin"
            ? "admin"
            : "attendant",
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        summary: entry.summary,
        metadata: entry.metadata ?? {},
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(
      "Não foi possível registrar a atividade administrativa:",
      error
    );
    Sentry.captureException(error, {
      tags: {
        feature: "admin-audit",
        entity_type: entry.entityType,
        action: entry.action,
      },
    });
  }
}
