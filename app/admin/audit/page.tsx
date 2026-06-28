import { createAdminSupabase } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

interface AuditEntry {
  id: string;
  actor_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  before: unknown;
  after: unknown;
  note: string | null;
  created_at: string;
}

const actionLabel: Record<string, string> = {
  fee_config_update: "Platform fee changed",
  organizer_fee_override_set: "Organizer fee override set",
  organizer_fee_override_clear: "Organizer fee override cleared",
};

// Actions that target an organizer — clicking the badge deep-links to
// that organizer's admin detail page. Easier to investigate "why did
// Lymora's payouts look weird last month" by jumping straight to the
// org from the audit row.
const ORG_TARGETED_ACTIONS = new Set<string>([
  "organizer_fee_override_set",
  "organizer_fee_override_clear",
]);

export default async function AdminAuditPage() {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const entries: AuditEntry[] = data ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Eyebrow>Audit log</Eyebrow>
        <h1 className="font-display text-display-md sm:text-display-lg text-stamp-white mt-2">
          Who changed what.
        </h1>
        <p className="text-stamp-muted-2 text-sm mt-3">
          Every admin write action. Last 100 entries, most recent first.
        </p>
      </div>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-stamp-muted-2">No admin actions yet.</p>
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id}>
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-display text-display-xs text-stamp-white">
                    {actionLabel[entry.action] ?? entry.action}
                  </p>
                  <p className="text-stamp-muted-2 text-xs mt-1">
                    by <span className="text-stamp-white">{entry.actor_email}</span>
                    {" · "}
                    {new Date(entry.created_at).toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {entry.target_type && entry.target_id && ORG_TARGETED_ACTIONS.has(entry.action) ? (
                  <a
                    href={`/admin/organizers/${entry.target_id}`}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <Badge tone="default">{entry.target_type} →</Badge>
                  </a>
                ) : entry.target_type ? (
                  <Badge tone="default">{entry.target_type}</Badge>
                ) : null}
              </div>

              {entry.note && (
                <p className="text-sm text-stamp-white mt-3 italic">
                  "{entry.note}"
                </p>
              )}

              {(entry.before !== null || entry.after !== null) && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-stamp-muted-2 hover:text-stamp-white">
                    Show diff
                  </summary>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <Eyebrow>Before</Eyebrow>
                      <pre className="mt-1 p-3 rounded-md bg-stamp-surface2 border border-stamp-border text-stamp-muted-2 text-[11px] overflow-x-auto">
                        {JSON.stringify(entry.before, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <Eyebrow>After</Eyebrow>
                      <pre className="mt-1 p-3 rounded-md bg-stamp-surface2 border border-stamp-border text-stamp-white text-[11px] overflow-x-auto">
                        {JSON.stringify(entry.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
