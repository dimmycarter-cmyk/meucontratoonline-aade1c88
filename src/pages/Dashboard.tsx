import { motion } from "framer-motion";
import {
  FileText, Users, Clock, CheckCircle2, AlertCircle, TrendingUp,
  Plus, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const monthlyData = [
  { month: "Jan", contratos: 12 },
  { month: "Fev", contratos: 19 },
  { month: "Mar", contratos: 15 },
  { month: "Abr", contratos: 25 },
  { month: "Mai", contratos: 22 },
  { month: "Jun", contratos: 30 },
  { month: "Jul", contratos: 28 },
  { month: "Ago", contratos: 35 },
  { month: "Set", contratos: 32 },
  { month: "Out", contratos: 40 },
  { month: "Nov", contratos: 38 },
  { month: "Dez", contratos: 45 },
];

const statusData = [
  { name: "Rascunho", value: 8, color: "hsl(215, 16%, 47%)" },
  { name: "Em preenchimento", value: 12, color: "hsl(217, 91%, 60%)" },
  { name: "Pronto", value: 25, color: "hsl(152, 69%, 40%)" },
  { name: "Exportado", value: 18, color: "hsl(38, 92%, 50%)" },
  { name: "Cancelado", value: 3, color: "hsl(0, 84%, 60%)" },
];

const recentActivities = [
  { action: "Contrato de compra e venda gerado", time: "Há 5 min", icon: FileText },
  { action: "Novo contato cadastrado: Maria Silva", time: "Há 15 min", icon: Users },
  { action: "Documentos do comprador processados por IA", time: "Há 30 min", icon: CheckCircle2 },
  { action: "Contrato enviado para revisão", time: "Há 1 hora", icon: AlertCircle },
  { action: "PDF exportado: Contrato #1247", time: "Há 2 horas", icon: FileText },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

const Dashboard = () => {
  const stats = [
    { label: "Contratos este mês", value: "45", change: "+12%", icon: FileText, color: "text-primary" },
    { label: "Novos contatos", value: "128", change: "+8%", icon: Users, color: "text-info" },
    { label: "Contratos pendentes", value: "12", change: "-3%", icon: Clock, color: "text-warning" },
    { label: "Finalizados", value: "33", change: "+18%", icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da sua operação</p>
        </div>
        <Button asChild>
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
                    <div className="mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-success" />
                      <span className="text-xs text-success">{stat.change}</span>
                    </div>
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
                  <YAxis tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
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
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activities */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base font-semibold">Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;
