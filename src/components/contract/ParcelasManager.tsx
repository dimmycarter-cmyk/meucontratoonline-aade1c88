import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatBRL, valorPorExtenso } from "@/lib/contract-formatters";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

type Dados = Record<string, string>;

interface ParcelasManagerProps {
  dados: Dados;
  onChange: (next: Dados) => void;
}

const parseBRL = (s: string): number => {
  if (!s) return 0;
  const cleaned = String(s).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
};

const addMonthsISO = (iso: string, months: number): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(y, m - 1 + months, d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const ParcelasManager = ({ dados, onChange }: ParcelasManagerProps) => {
  // Detect existing parcelas count by inspecting dados
  const initialCount = useMemo(() => {
    let max = 0;
    for (let i = 1; i <= 12; i++) {
      if (dados[`parcela${i}_data`] || dados[`parcela${i}_valor`]) max = i;
    }
    return max;
  }, []); // run once on mount

  const [count, setCount] = useState<number>(initialCount);
  const [open, setOpen] = useState<boolean>(initialCount > 0);

  const setField = (key: string, value: string) => onChange({ ...dados, [key]: value });

  const handleValorBlur = (i: number) => {
    const k = `parcela${i}_valor`;
    const raw = dados[k];
    if (!raw) return;
    const num = parseBRL(raw);
    if (!num) return;
    onChange({
      ...dados,
      [k]: formatBRL(num),
      [`parcela${i}_valor_extenso`]: valorPorExtenso(num),
    });
  };

  const distribuirIgualmente = () => {
    if (count <= 0) return;
    const total = parseBRL(dados.valor_remanescente || "") || parseBRL(dados.valor_total || "");
    if (!total) return;
    const part = total / count;
    const next = { ...dados };
    for (let i = 1; i <= count; i++) {
      next[`parcela${i}_valor`] = formatBRL(part);
      next[`parcela${i}_valor_extenso`] = valorPorExtenso(part);
    }
    onChange(next);
  };

  const mensalDesdePrimeira = () => {
    const base = dados.parcela1_data;
    if (!base || count < 2) return;
    const next = { ...dados };
    for (let i = 2; i <= count; i++) {
      next[`parcela${i}_data`] = addMonthsISO(base, i - 1);
    }
    onChange(next);
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Parcelas
          {count > 0 && (
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              ({count} {count === 1 ? "parcela" : "parcelas"})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Número de parcelas: <span className="font-semibold text-foreground">{count}</span>
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={distribuirIgualmente}
                  disabled={count === 0}
                >
                  Distribuir igualmente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={mensalDesdePrimeira}
                  disabled={count < 2 || !dados.parcela1_data}
                >
                  Mensal a partir da 1ª
                </Button>
              </div>
            </div>
            <Slider
              value={[count]}
              min={0}
              max={12}
              step={1}
              onValueChange={(v) => {
                const newCount = v[0] ?? 0;
                if (newCount < count) {
                  // clear removed parcelas
                  const next = { ...dados };
                  for (let i = newCount + 1; i <= count; i++) {
                    delete next[`parcela${i}_data`];
                    delete next[`parcela${i}_valor`];
                    delete next[`parcela${i}_valor_extenso`];
                  }
                  onChange(next);
                }
                setCount(newCount);
              }}
            />
          </div>

          {count === 0 ? (
            <p className="text-xs text-muted-foreground">
              Use o controle acima para definir até 12 parcelas.
            </p>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: count }, (_, i) => i + 1).map((i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr] gap-3 items-end">
                  <div>
                    <Label className="mb-1 text-xs text-muted-foreground">Parcela</Label>
                    <div className="h-10 flex items-center justify-center rounded-md border border-border bg-muted/30 text-sm font-semibold text-foreground">
                      {i}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1 text-xs text-muted-foreground">Data</Label>
                    <Input
                      type="date"
                      value={dados[`parcela${i}_data`] || ""}
                      onChange={(e) => setField(`parcela${i}_data`, e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 text-xs text-muted-foreground">Valor</Label>
                    <Input
                      value={dados[`parcela${i}_valor`] || ""}
                      onChange={(e) => setField(`parcela${i}_valor`, e.target.value)}
                      onBlur={() => handleValorBlur(i)}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ParcelasManager;
