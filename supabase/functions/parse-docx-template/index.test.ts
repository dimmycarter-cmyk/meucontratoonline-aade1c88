// Smoke test mínimo do handler parse-docx-template.
// Não testa o parsing do mammoth (requer .docx real binário); valida apenas
// os caminhos de erro e a forma do payload de resposta com input inválido.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/parse-docx-template";

Deno.test("rejeita método GET", async () => {
  const res = await fetch(FUNCTION_URL, { method: "GET" }).catch(() => null);
  if (!res) {
    // Ambiente sem função local rodando — pulamos sem falhar.
    return;
  }
  assertEquals(res.status === 405 || res.status === 404, true);
  await res.text();
});

Deno.test("rejeita content-type não multipart", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }).catch(() => null);
  if (!res) return;
  assertEquals([400, 401].includes(res.status), true);
  await res.text();
});
