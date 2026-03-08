import { useState } from "react";
import { Plus, Search, Filter, Download, MoreHorizontal, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const mockEmpresas = [
  { id: 1, nomeFantasia: "Imobiliária Central", razaoSocial: "Central Imóveis Ltda", cnpj: "12.345.678/0001-90", cidade: "São Paulo", estado: "SP", email: "contato@central.com" },
  { id: 2, nomeFantasia: "Nova Casa Imóveis", razaoSocial: "Nova Casa Negócios Imobiliários S/A", cnpj: "98.765.432/0001-10", cidade: "Rio de Janeiro", estado: "RJ", email: "contato@novacasa.com" },
  { id: 3, nomeFantasia: "Prime Incorporadora", razaoSocial: "Prime Incorporações Ltda", cnpj: "45.678.901/0001-23", cidade: "Belo Horizonte", estado: "MG", email: "contato@prime.com" },
];

const Empresas = () => {
  const [search, setSearch] = useState("");
  const filtered = mockEmpresas.filter((e) => e.nomeFantasia.toLowerCase().includes(search.toLowerCase()) || e.cnpj.includes(search));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">{mockEmpresas.length} empresas cadastradas</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Nova Empresa</Button>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou CNPJ..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Filter className="mr-1 h-4 w-4" /> Filtros</Button>
              <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Exportar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((empresa) => (
              <div key={empresa.id} className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/50">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{empresa.nomeFantasia}</p>
                    <p className="truncate text-xs text-muted-foreground">{empresa.razaoSocial}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>CNPJ: {empresa.cnpj}</p>
                  <p>{empresa.cidade}/{empresa.estado}</p>
                  <p>{empresa.email}</p>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Empresas;
