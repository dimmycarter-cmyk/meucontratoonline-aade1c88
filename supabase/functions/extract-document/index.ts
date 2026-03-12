import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id, file_path, document_type } = await req.json();

    if (!document_id || !file_path) {
      return new Response(JSON.stringify({ error: "document_id and file_path are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to processing
    await supabase
      .from("participant_documents")
      .update({ processing_status: "processing" })
      .eq("id", document_id);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("contract-documents")
      .download(file_path);

    if (downloadError || !fileData) {
      await supabase
        .from("participant_documents")
        .update({ processing_status: "failed" })
        .eq("id", document_id);
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    const mimeType = fileData.type || "image/jpeg";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await supabase
        .from("participant_documents")
        .update({ processing_status: "failed" })
        .eq("id", document_id);
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docTypeHint = document_type || "outro";
    const systemPrompt = `Você é um especialista em extração de dados de documentos brasileiros para contratos imobiliários. Analise a imagem do documento e extraia todos os dados pessoais visíveis com precisão. O documento é do tipo: ${docTypeHint}.`;

    const userPrompt = `Extraia todos os dados pessoais visíveis neste documento brasileiro. Seja preciso e retorne APENAS os campos que conseguir identificar com clareza. Para campos que não estão visíveis ou ilegíveis, não inclua no resultado.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_document_data",
              description: "Retorna os dados extraídos do documento brasileiro",
              parameters: {
                type: "object",
                properties: {
                  full_name: { type: "string", description: "Nome completo" },
                  cpf: { type: "string", description: "CPF (formato: 000.000.000-00)" },
                  rg: { type: "string", description: "Número do RG" },
                  issuing_agency: { type: "string", description: "Órgão expedidor do RG" },
                  birth_date: { type: "string", description: "Data de nascimento (formato: YYYY-MM-DD)" },
                  nationality: { type: "string", description: "Nacionalidade" },
                  marital_status: { type: "string", description: "Estado civil" },
                  profession: { type: "string", description: "Profissão" },
                  gender: { type: "string", description: "Sexo/Gênero" },
                  father_name: { type: "string", description: "Nome do pai" },
                  mother_name: { type: "string", description: "Nome da mãe" },
                  address_zipcode: { type: "string", description: "CEP" },
                  address_street: { type: "string", description: "Rua/Logradouro" },
                  address_number: { type: "string", description: "Número" },
                  address_complement: { type: "string", description: "Complemento" },
                  address_neighborhood: { type: "string", description: "Bairro" },
                  address_city: { type: "string", description: "Cidade" },
                  address_state: { type: "string", description: "UF/Estado" },
                  cnpj: { type: "string", description: "CNPJ se aplicável" },
                  company_name: { type: "string", description: "Razão social se aplicável" },
                  trade_name: { type: "string", description: "Nome fantasia se aplicável" },
                  confidence: {
                    type: "number",
                    description: "Confiança geral da extração de 0 a 100",
                  },
                  field_confidences: {
                    type: "object",
                    description: "Confiança por campo de 0 a 100",
                    additionalProperties: { type: "number" },
                  },
                },
                required: ["confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_document_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        await supabase.from("participant_documents").update({ processing_status: "failed" }).eq("id", document_id);
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase.from("participant_documents").update({ processing_status: "failed" }).eq("id", document_id);
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("participant_documents").update({ processing_status: "failed" }).eq("id", document_id);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      await supabase.from("participant_documents").update({ processing_status: "failed" }).eq("id", document_id);
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    const confidence = extractedData.confidence || 0;

    // Save extracted data
    const { error: insertError } = await supabase.from("extracted_document_data").insert({
      document_id,
      extracted_json: extractedData,
      confidence_score: confidence,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    // Update processing status
    const status = confidence >= 70 ? "completed" : "low_confidence";
    await supabase
      .from("participant_documents")
      .update({ processing_status: status })
      .eq("id", document_id);

    return new Response(JSON.stringify({ success: true, data: extractedData, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
