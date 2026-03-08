import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText, Brain, Upload, Users, Building2, Shield, Zap, Clock,
  CheckCircle2, Star, ChevronRight, ArrowRight, Sparkles, ScanSearch,
  FileCheck, BarChart3, Lock, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Meu Contrato Online</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#beneficios" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Benefícios</a>
            <a href="#funcionalidades" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Funcionalidades</a>
            <a href="#ia" className="text-sm text-muted-foreground transition-colors hover:text-foreground">IA</a>
            <a href="#planos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Planos</a>
            <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/cadastro">Começar grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient pt-32 pb-20">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(217 91% 60% / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(217 91% 50% / 0.2) 0%, transparent 50%)" }} />
        <div className="container relative mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary-foreground/80">
              <Sparkles className="h-4 w-4" /> Inteligência Artificial para Contratos Imobiliários
            </span>
          </motion.div>
          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="mx-auto mb-6 max-w-4xl font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Gere contratos imobiliários em minutos com{" "}
            <span className="text-gradient">ajuda de IA</span>
          </motion.h1>
          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mx-auto mb-10 max-w-2xl text-lg text-white/60">
            Envie documentos, deixe a IA ler e preencher automaticamente. Simplifique sua operação com segurança, rapidez e padronização.
          </motion.p>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="h-12 px-8 text-base font-semibold">
              <Link to="/cadastro">Criar conta gratuita <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 border-white/20 bg-white/5 px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white">
              <a href="#funcionalidades">Ver funcionalidades</a>
            </Button>
          </motion.div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4} className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Setup em 2 minutos</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Cancele quando quiser</span>
          </motion.div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-primary">Benefícios</span>
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground sm:text-4xl">Tudo que você precisa para contratos imobiliários</h2>
            <p className="text-muted-foreground">Automatize processos, reduza erros e feche negócios mais rápido.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap, title: "Rapidez", desc: "Gere contratos completos em minutos, não em horas." },
              { icon: Brain, title: "IA Inteligente", desc: "Leitura automática de documentos e preenchimento por IA." },
              { icon: Shield, title: "Segurança", desc: "Dados protegidos com criptografia e isolamento por empresa." },
              { icon: Clock, title: "Economia de Tempo", desc: "Elimine retrabalho com autopreenchimento e modelos prontos." },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="bg-secondary/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-primary">Funcionalidades</span>
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground sm:text-4xl">Plataforma completa para sua imobiliária</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: FileText, title: "Modelos de Contrato", desc: "Modelos prontos para compra, venda, locação e mais. Personalize com placeholders dinâmicos." },
              { icon: ScanSearch, title: "Leitura de Documentos", desc: "Envie CNH, RG, escrituras e a IA extrai os dados automaticamente." },
              { icon: FileCheck, title: "Autopreenchimento", desc: "Dados extraídos preenchem o contrato automaticamente. Revise e confirme." },
              { icon: Users, title: "Gestão de Contatos", desc: "Cadastro completo de compradores, vendedores, procuradores e testemunhas." },
              { icon: Building2, title: "Gestão de Empresas", desc: "Cadastre imobiliárias, construtoras e parceiros com todos os dados." },
              { icon: BarChart3, title: "Dashboard Inteligente", desc: "Visão geral de contratos, clientes, status e métricas da sua operação." },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-base font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* IA Section */}
      <section id="ia" className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-primary">Inteligência Artificial</span>
              <h2 className="mb-6 font-display text-3xl font-bold text-foreground sm:text-4xl">
                Agente de IA jurídico imobiliário ao seu lado
              </h2>
              <p className="mb-8 text-muted-foreground">
                Nosso agente de IA é especializado em contratos imobiliários brasileiros. Ele lê documentos, sugere cláusulas, revisa contratos e aponta inconsistências — tudo em linguagem simples.
              </p>
              <div className="space-y-4">
                {[
                  "Identifica automaticamente o tipo de documento enviado",
                  "Extrai dados com OCR e interpreta com IA",
                  "Sugere cláusulas conforme o tipo de negócio",
                  "Revisa contratos antes da finalização",
                  "Explica cláusulas em linguagem simples",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-sm text-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
              className="rounded-2xl border border-border bg-card p-8 shadow-elevated">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">Agente IA</p>
                  <p className="text-xs text-muted-foreground">Meu Contrato Online</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg bg-secondary p-3 text-sm text-foreground">
                  Analisei os documentos enviados. Encontrei os dados do comprador na CNH e os dados do imóvel na matrícula. Posso preencher o contrato automaticamente?
                </div>
                <div className="ml-8 rounded-lg bg-primary/10 p-3 text-sm text-foreground">
                  Sim, preencha automaticamente!
                </div>
                <div className="rounded-lg bg-secondary p-3 text-sm text-foreground">
                  ✅ Contrato preenchido! Detectei que falta o comprovante de endereço do vendedor. Deseja adicionar agora?
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Leitura de Documentos */}
      <section className="bg-secondary/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-primary">OCR + IA</span>
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground sm:text-4xl">Leitura automática de documentos</h2>
            <p className="text-muted-foreground">Envie documentos e a IA extrai os dados para você. Sem digitação manual.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { step: "01", title: "Envie os documentos", desc: "Upload de CNH, RG, escritura, matrícula, CNPJ e mais." },
              { step: "02", title: "IA lê e extrai", desc: "OCR converte em texto e a IA interpreta os dados relevantes." },
              { step: "03", title: "Revise e confirme", desc: "Dados organizados para revisão. Confirme e preencha o contrato." },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="relative rounded-xl border border-border bg-card p-6 shadow-card">
                <span className="mb-3 block font-display text-3xl font-extrabold text-primary/20">{item.step}</span>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-primary">Depoimentos</span>
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground sm:text-4xl">O que dizem nossos clientes</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Carlos Mendes", role: "Corretor de Imóveis", text: "Reduzi o tempo de geração de contratos de 2 horas para 15 minutos. A leitura de documentos é impressionante.", stars: 5 },
              { name: "Ana Paula Silva", role: "Gerente de Imobiliária", text: "Finalmente uma ferramenta que entende as necessidades do mercado imobiliário. A equipe inteira usa diariamente.", stars: 5 },
              { name: "Roberto Oliveira", role: "Documentista", text: "O autopreenchimento por IA economiza horas do meu dia. A precisão na leitura de documentos é excelente.", stars: 5 },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="mb-3 flex gap-1">
                  {Array.from({ length: item.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="mb-4 text-sm text-muted-foreground">"{item.text}"</p>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="bg-secondary/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-primary">Planos</span>
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground sm:text-4xl">Escolha o plano ideal para você</h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
            {[
              { name: "Starter", price: "97", desc: "Para corretores autônomos", features: ["1 usuário", "20 contratos/mês", "100 contatos", "10 leituras IA/mês", "Exportação PDF", "Suporte por e-mail"], popular: false },
              { name: "Pro", price: "197", desc: "Para pequenas imobiliárias", features: ["5 usuários", "100 contratos/mês", "Contatos ilimitados", "50 leituras IA/mês", "Exportação PDF", "Cláusulas personalizadas", "Suporte prioritário"], popular: true },
              { name: "Imobiliária", price: "397", desc: "Para operações robustas", features: ["Usuários ilimitados", "Contratos ilimitados", "Contatos ilimitados", "Leituras IA ilimitadas", "Exportação PDF", "Cláusulas personalizadas", "Agente IA completo", "API de integração", "Suporte dedicado"], popular: false },
            ].map((plan, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className={`relative rounded-xl border p-8 shadow-card ${plan.popular ? "border-primary bg-card ring-2 ring-primary" : "border-border bg-card"}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Mais popular
                  </span>
                )}
                <h3 className="mb-1 font-display text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="mb-4 text-sm text-muted-foreground">{plan.desc}</p>
                <div className="mb-6">
                  <span className="font-display text-4xl font-extrabold text-foreground">R$ {plan.price}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <Button className="mb-6 w-full" variant={plan.popular ? "default" : "outline"} asChild>
                  <Link to="/cadastro">Começar agora</Link>
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-primary">FAQ</span>
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground sm:text-4xl">Perguntas frequentes</h2>
          </div>
          <div className="mx-auto max-w-3xl space-y-4">
            {[
              { q: "Como funciona a leitura de documentos por IA?", a: "Você faz upload dos documentos (CNH, RG, escritura, etc.) e nosso sistema usa OCR e inteligência artificial para extrair automaticamente os dados relevantes como nome, CPF, endereço e dados do imóvel." },
              { q: "Quais tipos de contrato posso gerar?", a: "Atualmente oferecemos modelos de Promessa de Compra e Venda (financiado e à vista). Novos modelos como locação residencial, comercial e prestação de serviços serão adicionados em breve." },
              { q: "Meus dados estão seguros?", a: "Sim. Utilizamos criptografia, isolamento de dados por empresa e infraestrutura segura. Cada empresa tem seu ambiente totalmente separado." },
              { q: "Posso personalizar os modelos de contrato?", a: "Sim. Todos os contratos podem ser editados no editor visual antes da exportação. Você também pode ativar/desativar cláusulas específicas conforme o caso." },
              { q: "Preciso de conhecimento técnico para usar?", a: "Não. A plataforma foi pensada para corretores, imobiliárias e equipes administrativas. A interface é intuitiva e a IA guia você em todo o processo." },
              { q: "Posso testar antes de contratar?", a: "Sim! Oferecemos um plano gratuito para você conhecer a plataforma e suas funcionalidades." },
            ].map((item, i) => (
              <motion.details key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="group rounded-xl border border-border bg-card shadow-card">
                <summary className="flex cursor-pointer items-center justify-between p-5 font-display text-sm font-semibold text-foreground">
                  {item.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-border px-5 pb-5 pt-3 text-sm text-muted-foreground">{item.a}</div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-hero-gradient py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-white sm:text-4xl">Pronto para simplificar seus contratos?</h2>
          <p className="mb-8 text-white/60">Junte-se a centenas de profissionais que já automatizaram sua rotina.</p>
          <Button size="lg" asChild className="h-12 px-8 text-base font-semibold">
            <Link to="/cadastro">Criar conta gratuita <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-display text-sm font-bold text-foreground">Meu Contrato Online</span>
              </div>
              <p className="text-sm text-muted-foreground">Simplifique a geração de contratos imobiliários com IA, segurança, rapidez e padronização.</p>
            </div>
            <div>
              <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#funcionalidades" className="hover:text-foreground">Funcionalidades</a></li>
                <li><a href="#planos" className="hover:text-foreground">Planos</a></li>
                <li><a href="#ia" className="hover:text-foreground">IA</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Suporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
                <li><a href="#" className="hover:text-foreground">Central de ajuda</a></li>
                <li><a href="#" className="hover:text-foreground">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Termos de uso</a></li>
                <li><a href="#" className="hover:text-foreground">Privacidade</a></li>
                <li><a href="#" className="hover:text-foreground">LGPD</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Meu Contrato Online. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
