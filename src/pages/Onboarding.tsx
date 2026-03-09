import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, MapPin, ArrowRight, ArrowLeft, Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { maskPhone, maskCNPJ, maskCEP } from "@/lib/masks";
import { useCepLookup } from "@/hooks/useCepLookup";

const step1Schema = z.object({
  nome: z.string().min(2, "Nome da empresa é obrigatório"),
  cnpj: z.string().min(18, "CNPJ inválido"),
  whatsapp: z.string().min(14, "WhatsApp inválido"),
  email: z.string().email("Email inválido"),
});

const step2Schema = z.object({
  cep: z.string().min(9, "CEP inválido"),
  rua: z.string().min(1, "Rua é obrigatória"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().min(2, "Estado é obrigatório"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

const Onboarding = () => {
  const navigate = useNavigate();
  const { refreshProfile, profile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      nome: "",
      cnpj: "",
      whatsapp: "",
      email: profile?.email || "",
    },
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" },
  });

  const onCepResult = useCallback(
    (data: { rua: string; bairro: string; cidade: string; estado: string }) => {
      form2.setValue("rua", data.rua);
      form2.setValue("bairro", data.bairro);
      form2.setValue("cidade", data.cidade);
      form2.setValue("estado", data.estado);
    },
    [form2]
  );

  const { lookup: lookupCep } = useCepLookup(onCepResult);

  const handleStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const handleStep2Submit = async (data: Step2Data) => {
    if (!step1Data) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("complete_onboarding", {
        p_nome: step1Data.nome,
        p_cnpj: step1Data.cnpj,
        p_whatsapp: step1Data.whatsapp,
        p_email: step1Data.email,
        p_cidade: data.cidade,
        p_estado: data.estado,
        p_cep: data.cep,
        p_rua: data.rua,
        p_numero: data.numero,
        p_complemento: data.complemento || "",
        p_bairro: data.bairro,
      });

      if (error) throw error;

      toast({ title: "Empresa cadastrada com sucesso!" });
      await refreshProfile();
      navigate("/app", { replace: true });
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        title: "Erro ao cadastrar empresa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">Meu Contrato</span>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className={`h-2 w-12 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 w-12 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        <Card className="shadow-card">
          <AnimatePresence mode="wait" custom={step}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="font-display text-xl">Cadastre sua Empresa</CardTitle>
                  <CardDescription>
                    Olá{profile?.nome ? `, ${profile.nome.split(" ")[0]}` : ""}! Vamos configurar sua imobiliária.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form1}>
                    <form onSubmit={form1.handleSubmit(handleStep1Submit)} className="space-y-4">
                      <FormField
                        control={form1.control}
                        name="nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Empresa *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Imobiliária Santos" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form1.control}
                        name="cnpj"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNPJ *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="00.000.000/0001-00"
                                value={field.value}
                                onChange={(e) => field.onChange(maskCNPJ(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form1.control}
                          name="whatsapp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="(31) 99999-5858"
                                  value={field.value}
                                  onChange={(e) => field.onChange(maskPhone(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form1.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input placeholder="contato@empresa.com" type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="submit" className="w-full mt-6">
                        Continuar <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={2}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <MapPin className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="font-display text-xl">Endereço da Empresa</CardTitle>
                  <CardDescription>Preencha o CEP para buscar automaticamente.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form2}>
                    <form onSubmit={form2.handleSubmit(handleStep2Submit)} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form2.control}
                          name="cep"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CEP *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="00000-000"
                                  value={field.value}
                                  onChange={(e) => {
                                    const masked = maskCEP(e.target.value);
                                    field.onChange(masked);
                                    lookupCep(masked);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div />
                        <FormField
                          control={form2.control}
                          name="rua"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Rua / Avenida *</FormLabel>
                              <FormControl>
                                <Input placeholder="Rua das Flores" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form2.control}
                          name="numero"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número *</FormLabel>
                              <FormControl>
                                <Input placeholder="123" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form2.control}
                          name="complemento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Complemento</FormLabel>
                              <FormControl>
                                <Input placeholder="Sala 01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form2.control}
                          name="bairro"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro *</FormLabel>
                              <FormControl>
                                <Input placeholder="Centro" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form2.control}
                          name="cidade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade *</FormLabel>
                              <FormControl>
                                <Input placeholder="Belo Horizonte" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form2.control}
                          name="estado"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>UF *</FormLabel>
                              <FormControl>
                                <Input placeholder="MG" maxLength={2} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="flex-1">
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                            </>
                          ) : (
                            "Finalizar"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Você poderá editar essas informações depois em Configurações.
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
