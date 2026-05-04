import { z } from "zod";

function validarCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === +d[10];
}

function validarCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (str: string, w: number[]) =>
    w.reduce((a, v, i) => a + +str[i] * v, 0);
  const mod = (n: number) => {
    const r = n % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return (
    mod(calc(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])) === +d[12] &&
    mod(calc(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])) === +d[13]
  );
}

export const cpfSchema = z
  .string()
  .min(1, "CPF é obrigatório")
  .refine(validarCPF, "CPF inválido");

export const cnpjSchema = z
  .string()
  .min(1, "CNPJ é obrigatório")
  .refine(validarCNPJ, "CNPJ inválido");

export const cepSchema = z
  .string()
  .min(1, "CEP é obrigatório")
  .refine((v) => /^\d{5}-?\d{3}$/.test(v), "CEP inválido");

export const telefoneBRSchema = z
  .string()
  .refine(
    (v) => !v || /^(\(?\d{2}\)?\s?)(\d{4,5}[-\s]?\d{4})$/.test(v.replace(/\s/g, "")),
    "Telefone inválido",
  );

export const emailSchema = z
  .string()
  .min(1, "E-mail é obrigatório")
  .email("E-mail inválido");
