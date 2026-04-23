// One-shot seeding function — Leva 1 (T1-T5)
// Insere 5 templates globais e 3 fixtures de teste com PII fictícia.
// Idempotente: deleta globais com mesmo nome antes de inserir.
// Requer: chamador autenticado como super_admin (RLS garante).
// Para uso administrativo apenas — pode ser removida após a Leva 1.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import payload from "./payload.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Template {
  nome: string;
  descricao: string;
  tipo: string;
  conteudo: string;
  variaveis: string[];
}

interface Fixture {
  nome: string;
  descricao: string;
  template_nome: string;
  conteudo_original: string;
  pii_detected: unknown[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing authorization" }, 401);

    // Service role client (bypasses RLS) — operação administrativa
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verificar que o caller é super_admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthenticated" }, 401);
    const { data: roleCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleCheck) return json({ error: "super_admin required" }, 403);

    const { templates, fixtures } = payload as {
      templates: Template[];
      fixtures: Fixture[];
    };

    // 1. Idempotência: delete globais com mesmo nome
    const names = templates.map((t) => t.nome);
    const { error: delErr } = await admin
      .from("contract_templates")
      .delete()
      .eq("is_global", true)
      .in("nome", names);
    if (delErr) throw delErr;

    // 2. Insert templates
    const { data: inserted, error: insErr } = await admin
      .from("contract_templates")
      .insert(
        templates.map((t) => ({
          nome: t.nome,
          descricao: t.descricao,
          tipo: t.tipo,
          conteudo: t.conteudo,
          variaveis: t.variaveis,
          is_global: true,
          tenant_id: null,
          status: "ativo",
        }))
      )
      .select("id, nome");
    if (insErr) throw insErr;

    const idByName = new Map(inserted!.map((r: any) => [r.nome, r.id]));

    // 3. Idempotência fixtures
    const fixNames = fixtures.map((f) => f.nome);
    const { error: delFixErr } = await admin
      .from("contract_test_fixtures")
      .delete()
      .in("nome", fixNames);
    if (delFixErr) throw delFixErr;

    // 4. Insert fixtures
    const { error: insFixErr } = await admin
      .from("contract_test_fixtures")
      .insert(
        fixtures.map((f) => ({
          nome: f.nome,
          descricao: f.descricao,
          template_id: idByName.get(f.template_nome) ?? null,
          conteudo_original: f.conteudo_original,
          pii_detected: f.pii_detected,
        }))
      );
    if (insFixErr) throw insFixErr;

    return json({
      ok: true,
      templates_inserted: inserted!.length,
      fixtures_inserted: fixtures.length,
      template_names: inserted!.map((r: any) => r.nome),
    });
  } catch (e) {
    console.error("seed-templates-leva1 error:", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
