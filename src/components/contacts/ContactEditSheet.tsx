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

type Section = 'contato' | 'endereco' | 'fiscal' | 'observacoes';

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
  observacoes: 'Editar Observações',
};

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export function ContactEditSheet({ contact, section, open, onOpenChange }: ContactEditSheetProps) {
  const { updateContact } = useContacts();

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

  // Observações fields
  const [notes, setNotes] = useState(contact.notes || '');

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
    setNotes(contact.notes || '');
  }, [contact, section]);

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

  const handleSave = () => {
    let updates: Partial<Contact> = {};

    if (section === 'contato') {
      updates = { email: email || null, phone: phone || null, document: document || null, representative_legal: representativeLegal || null };
    } else if (section === 'endereco') {
      updates = { cep: cep || null, address: address || null, address_number: addressNumber || null, neighborhood: neighborhood || null, city: city || null, state: state || null };
    } else if (section === 'fiscal') {
      updates = { tax_regime: (taxRegime as TaxRegime) || null, is_active: isActive };
    } else if (section === 'observacoes') {
      updates = { notes: notes || null };
    }

    updateContact.mutate(
      { id: contact.id, originalContact: contact, ...updates },
      { onSuccess: () => onOpenChange(false) }
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
