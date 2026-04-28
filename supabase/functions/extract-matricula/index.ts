import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png"];

const PROMPT =
  'Analise esta matrícula de imóvel e extraia APENAS o trecho descritivo do imóvel. Esse trecho começa com a palavra "Imóvel:" e termina com o nome do bairro (ex: "Bairro Fernão Dias."). Retorne somente esse texto extraído, sem comentários, sem markdown, sem nada mais.';

function cleanOutput(raw: string): string {
  let txt = (raw || "").trim();
  // Remove cercas markdown ```...```
  txt = txt.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  // Remove crases simples envolvendo tudo
  if (txt.startsWith("`") && txt.endsWith("`")) {
    txt = txt.slice(1, -1).trim();
  }
  return txt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ success: false, error: "invalid_body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileBase64, mimeType } = body as { fileBase64?: string; mimeType?: string };

    if (!fileBase64 || typeof fileBase64 !== "string" || fileBase64.length < 10) {
      return new Response(JSON.stringify({ success: false, error: "missing_file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!mimeType || !ALLOWED_MIMES.includes(mimeType)) {
      return new Response(JSON.stringify({ success: false, error: "invalid_mime" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "api_key_missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${fileBase64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "rate_limit" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "payment_required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: "ai_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResult = await aiResponse.json();
    const raw = aiResult?.choices?.[0]?.message?.content ?? "";
    const descricao = cleanOutput(typeof raw === "string" ? raw : "");

    if (!descricao) {
      return new Response(JSON.stringify({ success: false, error: "empty" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, descricao }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-matricula error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
