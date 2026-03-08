import { useState } from "react";
import { Plus, Search, Filter, Download, MoreHorizontal, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const mockContatos = [
  { id: 1, nome: "Maria Silva Santos", cpf: "123.456.789-00", email: "maria@email.com", whatsapp: "(11) 99999-1234", cidade: "São Paulo", estado: "SP", tipo: "Compradora" },
  { id: 2, nome: "João Carlos Oliveira", cpf: "987.654.321-00", email: "joao@email.com", whatsapp: "(21) 98888-5678", cidade: "Rio de Janeiro", estado: "RJ", tipo: "Vendedor" },
  { id: 3, nome: "Ana Paula Ferreira", cpf: "456.789.123-00", email: "ana@email.com", whatsapp: "(31) 97777-9012", cidade: "Belo Horizonte", estado: "MG", tipo: "Procuradora" },
  { id: 4, nome: "Roberto Mendes Lima", cpf: "321.654.987-00", email: "roberto@email.com", whatsapp: "(41) 96666-3456", cidade: "Curitiba", estado: "PR", tipo: "Comprador" },
  { id: 5, nome: "Carla Beatriz Costa", cpf: "789.123.456-00", email: "carla@email.com", whatsapp: "(51) 95555-7890", cidade: "Porto Alegre", estado: "RS", tipo: "Testemunha" },
];

const Contatos = () => {
  const [search, setSearch] = useState("");
  const filtered = mockContatos.filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-sm text-muted-foreground">{mockContatos.length} contatos cadastrados</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Novo Contato</Button>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome, CPF ou e-mail..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Filter className="mr-1 h-4 w-4" /> Filtros</Button>
              <Button variant="outline" size="sm"><Download className="mr-1 h-4 w-4" /> Exportar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPF</th>
                  <th className="hidden pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Contato</th>
                  <th className="hidden pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Cidade</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((contato) => (
                  <tr key={contato.id} className="transition-colors hover:bg-muted/50">
                    <td className="py-3">
                      <p className="text-sm font-medium text-foreground">{contato.nome}</p>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">{contato.cpf}</td>
                    <td className="hidden py-3 md:table-cell">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contato.email}</span>
                      </div>
                    </td>
                    <td className="hidden py-3 text-sm text-muted-foreground lg:table-cell">{contato.cidade}/{contato.estado}</td>
                    <td className="py-3">
                      <Badge variant="secondary" className="text-xs">{contato.tipo}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Contatos;
