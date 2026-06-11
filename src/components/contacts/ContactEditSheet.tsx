import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Contact, TaxRegime, useContacts } from '@/hooks/useContacts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { ContactObligationsSelector } from '@/components/fiscal/ContactObligationsSelector';
import { toast } from 'sonner';

type Section = 'contato' | 'endereco' | 'fiscal' | 'empresariais' | 'datas-esfera' | 'departamento-pessoal' | 'observacoes' | 'cobranca';

interface ContactEditSheetProps {
  contact: Contact;
  section: Section;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sectionTitles: Record<Section, string> = {
  contato: 'Editar Informações de Contato',
  endereco: 'Editar Endereço',
  fiscal: 'Editar Dados Fiscais',
  empresariais: 'Editar Dados Empresariais',
  'datas-esfera': 'Editar Datas por Esfera',
  'departamento-pessoal': 'Editar Departamento Pessoal',
  observacoes: 'Editar Observações',
  cobranca: 'Editar Configurações de Cobrança',
};

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export function ContactEditSheet({ contact, section, open, onOpenChange }: ContactEditSheetProps) {
  const { updateContact } = useContacts();
  const { company } = useCompany();

  // Contato fields
  const [email, setEmail] = useState(contact.email || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [document, setDocument] = useState(contact.document || '');
  const [representativeLegal, setRepresentativeLegal] = useState(contact.representative_legal || '');

  // Endereço fields
  const [cep, setCep] = useState(contact.cep || '');
  const [address, setAddress] = useState(contact.address || '');
  const [addressNumber, setAddressNumber] = useState(contact.address_number || '');
  const [neighborhood, setNeighborhood] = useState(contact.neighborhood || '');
  const [city, setCity] = useState(contact.city || '');
  const [state, setState] = useState(contact.state || '');
  const [loadingCep, setLoadingCep] = useState(false);

  // Fiscal fields
  const [taxRegime, setTaxRegime] = useState<TaxRegime | ''>(contact.tax_regime || '');
  const [isActive, setIsActive] = useState(contact.is_active);
  const [responsibleId, setResponsibleId] = useState<string>(contact.responsible_id || 'none');
  const [selectedObligations, setSelectedObligations] = useState<Set<string>>(new Set());
  const [obligationsInitialized, setObligationsInitialized] = useState(false);

  // Observações fields
  const [notes, setNotes] = useState(contact.notes || '');

  // Cobrança fields
  const [boletoValue, setBoletoValue] = useState<string>(
    contact.boleto_value != null ? String(contact.boleto_value) : ''
  );
  const [boletoDueDay, setBoletoDueDay] = useState<string>(
    contact.boleto_due_day != null ? String(contact.boleto_due_day) : 'none'
  );
  const [canalEntrega, setCanalEntrega] = useState<string>(contact.canal_entrega || 'none');
  const [numeroSicoob, setNumeroSicoob] = useState<string>(
    contact.numero_cliente_sicoob != null ? String(contact.numero_cliente_sicoob) : ''
  );

  const { data: profiles } = useQuery({
    queryKey: ['profiles-active-for-contact-edit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('status_active', true)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: section === 'fiscal',
  });

  const { data: obligationsCatalog = [] } = useQuery({
    queryKey: ['fiscal-obligations-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fiscal_obligations_catalog')
        .select('id, name, is_custom')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; is_custom?: boolean }[];
    },
    enabled: section === 'fiscal',
  });

  const { data: contactObligations = [] } = useQuery({
    queryKey: ['client-obligations', contact.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('client_obligations')
        .select('obligation_id')
        .eq('contact_id', contact.id);
      if (error) throw error;
      return (data ?? []) as { obligation_id: string }[];
    },
    enabled: section === 'fiscal',
  });


  // Reset when contact or section changes
  useEffect(() => {
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setDocument(contact.document || '');
    setRepresentativeLegal(contact.representative_legal || '');
    setCep(contact.cep || '');
    setAddress(contact.address || '');
    setAddressNumber(contact.address_number || '');
    setNeighborhood(contact.neighborhood || '');
    setCity(contact.city || '');
    setState(contact.state || '');
    setTaxRegime(contact.tax_regime || '');
    setIsActive(contact.is_active);
    setResponsibleId(contact.responsible_id || 'none');
    setNotes(contact.notes || '');
    setBoletoValue(contact.boleto_value != null ? String(contact.boleto_value) : '');
    setBoletoDueDay(contact.boleto_due_day != null ? String(contact.boleto_due_day) : 'none');
    setCanalEntrega(contact.canal_entrega || 'none');
    setNumeroSicoob(contact.numero_cliente_sicoob != null ? String(contact.numero_cliente_sicoob) : '');
    setObligationsInitialized(false);
  }, [contact, section]);

  // Initialize selected obligations once the query resolves
  useEffect(() => {
    if (section === 'fiscal' && !obligationsInitialized) {
      setSelectedObligations(new Set(contactObligations.map((o) => o.obligation_id)));
      setObligationsInitialized(true);
    }
  }, [section, contactObligations, obligationsInitialized]);

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(data.logradouro || address);
        setNeighborhood(data.bairro || neighborhood);
        setCity(data.localidade || city);
        setState(data.uf || state);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingCep(false);
    }
  };

  const syncObligations = async () => {
    if (!company?.id) return;
    const original = new Set(contactObligations.map((o) => o.obligation_id));
    const toDelete: string[] = [];
    const toInsert: string[] = [];
    original.forEach((id) => { if (!selectedObligations.has(id)) toDelete.push(id); });
    selectedObligations.forEach((id) => { if (!original.has(id)) toInsert.push(id); });

    if (toDelete.length > 0) {
      const { error } = await (supabase as any)
        .from('client_obligations')
        .delete()
        .eq('contact_id', contact.id)
        .in('obligation_id', toDelete);
      if (error) throw error;
    }
    if (toInsert.length > 0) {
      const { error } = await (supabase as any)
        .from('client_obligations')
        .insert(toInsert.map((obligation_id) => ({
          contact_id: contact.id,
          obligation_id,
          company_id: company.id,
        })));
      if (error) throw error;
    }
  };

  const handleSave = async () => {
    let updates: Partial<Contact> = {};

    if (section === 'contato') {
      updates = { email: email || null, phone: phone || null, document: document || null, representative_legal: representativeLegal || null };
    } else if (section === 'endereco') {
      updates = { cep: cep || null, address: address || null, address_number: addressNumber || null, neighborhood: neighborhood || null, city: city || null, state: state || null };
    } else if (section === 'fiscal') {
      updates = { tax_regime: (taxRegime as TaxRegime) || null, is_active: isActive, responsible_id: responsibleId === 'none' ? null : responsibleId };
    } else if (section === 'observacoes') {
      updates = { notes: notes || null };
    } else if (section === 'cobranca') {
      const parsedValue = boletoValue.trim() === '' ? null : Number(boletoValue.replace(',', '.'));
      const parsedSicoob = numeroSicoob.trim() === '' ? null : parseInt(numeroSicoob, 10);
      updates = {
        boleto_value: parsedValue !== null && !isNaN(parsedValue) ? parsedValue : null,
        boleto_due_day: boletoDueDay === 'none' ? null : parseInt(boletoDueDay, 10),
        canal_entrega: canalEntrega === 'none' ? null : (canalEntrega as 'whatsapp' | 'email' | 'impresso' | 'whatsapp_email'),
        numero_cliente_sicoob: parsedSicoob !== null && !isNaN(parsedSicoob) ? parsedSicoob : null,
      };
    }

    updateContact.mutate(
      { id: contact.id, originalContact: contact, ...updates },
      {
        onSuccess: async () => {
          if (section === 'fiscal') {
            try {
              await syncObligations();
              toast.success('Dados fiscais atualizados.');
            } catch (e: any) {
              toast.error(e?.message ?? 'Erro ao atualizar obrigações');
            }
          }
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{sectionTitles[section]}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {section === 'contato' && (
            <>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>CPF/CNPJ</Label>
                <Input value={document} onChange={e => setDocument(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Representante Legal</Label>
                <Input value={representativeLegal} onChange={e => setRepresentativeLegal(e.target.value)} placeholder="Nome do representante" />
              </div>
            </>
          )}

          {section === 'endereco' && (
            <>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input
                  value={cep}
                  onChange={e => setCep(e.target.value)}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  disabled={loadingCep}
                />
                {loadingCep && <p className="text-xs text-muted-foreground">Buscando CEP...</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Logradouro</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, Av..." />
              </div>
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="Nº" />
              </div>
              <div className="space-y-1.5">
                <Label>Bairro</Label>
                <Input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Bairro" />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade" />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {section === 'fiscal' && (
            <>
              <div className="space-y-1.5">
                <Label>Regime Tributário</Label>
                <Select value={taxRegime} onValueChange={v => setTaxRegime(v as TaxRegime)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mei">MEI</SelectItem>
                    <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                    <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    <SelectItem value="nao_aplica">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                <div>
                  <Label>Status</Label>
                  <p className="text-sm text-muted-foreground">{isActive ? 'Cliente ativo' : 'Cliente inativo'}</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="space-y-1.5">
                <Label>Colaborador Responsável</Label>
                <Select value={responsibleId} onValueChange={setResponsibleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {profiles?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || 'Sem nome'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Obrigações Fiscais</Label>
                <ContactObligationsSelector
                  options={obligationsCatalog}
                  selectedIds={selectedObligations}
                  onChange={setSelectedObligations}
                />
              </div>
            </>
          )}

          {section === 'observacoes' && (
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anotações sobre o cliente..."
                className="min-h-[160px]"
              />
            </div>
          )}

          {section === 'cobranca' && (
            <>
              <div className="space-y-1.5">
                <Label>Valor mensal de honorários</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={boletoValue}
                    onChange={(e) => setBoletoValue(e.target.value)}
                    placeholder="0,00"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Dia de vencimento</Label>
                <Select value={boletoDueDay} onValueChange={setBoletoDueDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não configurado</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Canal de entrega</Label>
                <Select value={canalEntrega} onValueChange={setCanalEntrega}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não configurado</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="impresso">Impresso</SelectItem>
                    <SelectItem value="whatsapp_email">WhatsApp + E-mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Nº cliente Sicoob</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={numeroSicoob}
                  onChange={(e) => setNumeroSicoob(e.target.value)}
                  placeholder="Número do beneficiário no Sisbr"
                  className="text-muted-foreground"
                />
              </div>
            </>
          )}
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateContact.isPending}>
            {updateContact.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
