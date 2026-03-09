import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText, Users, Clock, CheckCircle2, TrendingUp, TrendingDown,
  Plus, ArrowUpRight, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { useContracts } from "@/hooks/useContracts";
import { useContacts } from "@/hooks/useContacts";
import { useTenantLimits } from "@/hooks/useTenantLimits";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
const STATUS_COLORS: Record<string, string> = {
  rascunho: "hsl(215, 16%, 47%)",
  "em preenchimento": "hsl(217, 91%, 60%)",
  preenchimento: "hsl(217, 91%, 60%)",
  pronto: "hsl(152, 69%, 40%)",
  exportado: "hsl(38, 92%, 50%)",
  cancelado: "hsl(0, 84%, 60%)",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  "em preenchimento": "Em preenchimento",
  preenchimento: "Em preenchimento",
  pronto: "Pronto",
  exportado: "Exportado",
  cancelado: "Cancelado",
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

const Dashboard = () => {
  const { contracts, isLoading: contractsLoading, canCreateContract, limits } = useContracts();
  const { contacts, isLoading: contactsLoading } = useContacts();

  const isLoading = contractsLoading || contactsLoading;
  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const contractsThisMonth = contracts.filter(c => {
      const date = parseISO(c.created_at);
      return date >= thisMonth;
    }).length;

    const contractsLastMonth = contracts.filter(c => {
      const date = parseISO(c.created_at);
      return isWithinInterval(date, { start: lastMonth, end: lastMonthEnd });
    }).length;

    const contractsChange = contractsLastMonth > 0 
      ? Math.round(((contractsThisMonth - contractsLastMonth) / contractsLastMonth) * 100)
      : contractsThisMonth > 0 ? 100 : 0;

    const pendingContracts = contracts.filter(c => 
      c.status === "rascunho" || c.status === "em preenchimento" || c.status === "preenchimento"
    ).length;

    const finishedContracts = contracts.filter(c => 
      c.status === "pronto" || c.status === "exportado"
    ).length;

    return [
      { 
        label: "Contratos este mês", 
        value: contractsThisMonth.toString(), 
        change: `${contractsChange >= 0 ? "+" : ""}${contractsChange}%`, 
        isPositive: contractsChange >= 0,
        icon: FileText, 
        color: "text-primary" 
      },
      { 
        label: "Total de contatos", 
        value: contacts.length.toString(), 
        change: "", 
        isPositive: true,
        icon: Users, 
        color: "text-info" 
      },
      { 
        label: "Contratos pendentes", 
        value: pendingContracts.toString(), 
        change: "", 
        isPositive: true,
        icon: Clock, 
        color: "text-warning" 
      },
      { 
        label: "Finalizados", 
        value: finishedContracts.toString(), 
        change: "", 
        isPositive: true,
        icon: CheckCircle2, 
        color: "text-success" 
      },
    ];
  }, [contracts, contacts]);

  // Monthly chart data (last 12 months)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthName = format(monthStart, "MMM", { locale: ptBR });
      
      const count = contracts.filter(c => {
        const date = parseISO(c.created_at);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      }).length;

      months.push({ month: monthName.charAt(0).toUpperCase() + monthName.slice(1), contratos: count });
    }

    return months;
  }, [contracts]);

  // Status distribution
  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    
    contracts.forEach(c => {
      const status = c.status.toLowerCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      color: STATUS_COLORS[status] || "hsl(215, 16%, 47%)",
    }));
  }, [contracts]);

  // Recent contracts
  const recentContracts = useMemo(() => {
    return contracts.slice(0, 5).map(c => ({
      action: c.nome || "Contrato sem nome",
      time: format(parseISO(c.created_at), "dd/MM 'às' HH:mm"),
      status: c.status,
      icon: FileText,
    }));
  }, [contracts]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-60" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const contractsUsagePercent = limits && limits.max_contracts_per_month < 999999
    ? Math.round((limits.current_contracts_this_month / limits.max_contracts_per_month) * 100)
    : 0;

  return (
    <div className="p-6 lg:p-8">
      {/* Limits Warning Banner */}
      {limits && !canCreateContract && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-warning/50 bg-warning/10">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Limite de contratos atingido</p>
                <p className="text-xs text-muted-foreground">
                  Você usou {limits.current_contracts_this_month}/{limits.max_contracts_per_month} contratos este mês. 
                  Faça upgrade do plano para continuar criando contratos.
                </p>
              </div>
              <Badge variant="outline" className="text-warning border-warning">
                {limits.plan_name}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Plan Usage Card */}
      {limits && limits.max_contracts_per_month < 999999 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <Card className="shadow-card glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Uso do plano: {limits.plan_name}</span>
                <span className="text-sm font-medium">{limits.current_contracts_this_month}/{limits.max_contracts_per_month} contratos</span>
              </div>
              <Progress value={contractsUsagePercent} className="h-2" />
              {limits.subscription_status === "trial" && limits.trial_end && (
                <p className="mt-2 text-xs text-warning">
                  Trial expira em: {format(parseISO(limits.trial_end), "dd/MM/yyyy")}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da sua operação</p>
        </div>
        <Button asChild disabled={!canCreateContract}>
          <Link to="/app/novo-contrato"><Plus className="mr-2 h-4 w-4" /> Novo Contrato</Link>
        </Button>
      </div>
      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div key={i} initial="hidden" animate="visible" variants={fadeUp} custom={i}>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 font-display text-2xl font-bold text-foreground">{stat.value}</p>
                    {stat.change && (
                      <div className="mt-1 flex items-center gap-1">
                        {stat.isPositive ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className={`text-xs ${stat.isPositive ? "text-success" : "text-destructive"}`}>
                          {stat.change}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4} className="lg:col-span-2">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-semibold">Contratos por mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(215, 20%, 90%)", fontSize: "13px" }}
                  />
                  <Bar dataKey="contratos" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-semibold">Status dos contratos</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {statusData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(215, 20%, 90%)", fontSize: "13px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {statusData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  Nenhum contrato criado ainda
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Contracts */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base font-semibold">Contratos recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentContracts.length > 0 ? (
              <div className="space-y-4">
                {recentContracts.map((contract, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <contract.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{contract.action}</p>
                      <p className="text-xs text-muted-foreground">{contract.time}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum contrato criado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;
