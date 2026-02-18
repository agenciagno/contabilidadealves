import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Contact, ContactInsert } from '@/hooks/useContacts';
import { maskCPFCNPJ, maskPhone } from '@/lib/utils';
import { Search, Loader2, FileCheck } from 'lucide-react';
import { fetchCnpjData } from '@/lib/cnpj-api';
import { useToast } from '@/hooks/use-toast';

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  onSubmit: (data: ContactInsert) => void;
  isLoading?: boolean;
}

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

function maskCep(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .slice(0, 9);
}

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isLoading,
}: ContactFormDialogProps) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [notes, setNotes] = useState('');
  const [boletoActive, setBoletoActive] = useState(false);
  const [boletoValue, setBoletoValue] = useState('');
  const [boletoDueDay, setBoletoDueDay] = useState('');
  const [boletoStartDate, setBoletoStartDate] = useState('');
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [addressFieldsLocked, setAddressFieldsLocked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setDocument(contact.document || '');
      setEmail(contact.email || '');
      setPhone(contact.phone || '');
      setCep(contact.cep || '');
      setAddress(contact.address || '');
      setAddressNumber(contact.address_number || '');
      setNeighborhood(contact.neighborhood || '');
      setCity(contact.city || '');
      setState(contact.state || '');
      setNotes(contact.notes || '');
      setBoletoActive(contact.boleto_active || false);
      setBoletoValue(contact.boleto_value?.toString() || '');
      setBoletoDueDay(contact.boleto_due_day?.toString() || '');
      setBoletoStartDate(contact.boleto_start_date || '');
    } else {
      setName('');
      setDocument('');
      setEmail('');
      setPhone('');
      setCep('');
      setAddress('');
      setAddressNumber('');
      setNeighborhood('');
      setCity('');
      setState('');
      setNotes('');
      setBoletoActive(false);
      setBoletoValue('');
      setBoletoDueDay('');
      setBoletoStartDate('');
    }
  }, [contact, open]);

  const handleFetchCnpj = async () => {
    const cleanDoc = document.replace(/\D/g, '');

    if (cleanDoc.length !== 14) {
      toast({
        title: 'CNPJ inválido',
        description: 'Digite um CNPJ completo (14 dígitos) para buscar',
        variant: 'destructive',
      });
      return;
    }

    setIsFetchingCnpj(true);
    setAddressFieldsLocked(true);

    try {
      const data = await fetchCnpjData(cleanDoc);

      setName(data.nome_fantasia || data.razao_social);
      setCep(data.cep ? maskCep(data.cep) : '');
      setAddress(data.logradouro || '');
      setAddressNumber(data.numero || '');
      setNeighborhood(data.bairro || '');
      setCity(data.municipio || '');
      setState(data.uf || '');

      if (data.ddd_telefone_1) {
        const phoneClean = data.ddd_telefone_1.replace(/\D/g, '');
        setPhone(maskPhone(phoneClean));
      }

      toast({
        title: 'Dados carregados!',
        description: 'Confira as informações e complete os campos restantes.',
      });
    } catch (error) {
      toast({
        title: 'Erro na consulta',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingCnpj(false);
      setAddressFieldsLocked(false);
    }
  };

  const handleFetchCep = async () => {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);

      if (!response.ok) {
        throw new Error('CEP não encontrado');
      }

      const data = await response.json();

      setAddress(data.street || '');
      setNeighborhood(data.neighborhood || '');
      setCity(data.city || '');
      setState(data.state || '');
      // Não limpa addressNumber — preserva o que o usuário já digitou

      setTimeout(() => {
        window.document.getElementById('address-number')?.focus();
      }, 50);
    } catch {
      toast({
        title: 'CEP não encontrado',
        description: 'Não conseguimos localizar este CEP. Por favor, preencha o endereço manualmente.',
        variant: 'destructive',
      });
      // Não limpa campos já preenchidos
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      type: contact?.type || 'cliente',
      document: document.trim() || null,
      tax_regime: null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      cep: cep.trim() || null,
      address: address.trim() || null,
      address_number: addressNumber.trim() || null,
      neighborhood: neighborhood.trim() || null,
      city: city.trim() || null,
      state: state || null,
      notes: notes.trim() || null,
      is_active: true,
      representative_legal: null,
      boleto_active: boletoActive,
      boleto_value: boletoActive && boletoValue ? parseFloat(boletoValue.replace(/\./g, '').replace(',', '.')) : null,
      boleto_due_day: boletoActive && boletoDueDay ? parseInt(boletoDueDay) : null,
      boleto_start_date: boletoActive && boletoStartDate ? boletoStartDate : null,
    });
  };

  const isFormValid = name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? 'Editar Cliente/Fornecedor' : 'Novo Cliente/Fornecedor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Linha 1: CPF/CNPJ */}
            <div className="col-span-3">
              <Label htmlFor="document">CPF/CNPJ</Label>
              <div className="flex gap-2">
                <Input
                  id="document"
                  value={document}
                  onChange={(e) => setDocument(maskCPFCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleFetchCnpj}
                  disabled={isFetchingCnpj || document.replace(/\D/g, '').length < 14}
                  title="Buscar dados do CNPJ"
                >
                  {isFetchingCnpj ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Linha 2: Nome */}
            <div className="col-span-3">
              <Label htmlFor="name">Nome do Cliente/Fornecedor <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do cliente ou fornecedor"
                required
              />
            </div>

            {/* Linha 3: E-mail + Telefone */}
            <div className="col-span-3 grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>

            {/* Linha 4a: CEP + Logradouro */}
            <div className="col-span-3 grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => setCep(maskCep(e.target.value))}
                    onBlur={handleFetchCep}
                    placeholder="00000-000"
                    maxLength={9}
                    className={isLoadingCep ? 'pr-9' : ''}
                  />
                  {isLoadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Logradouro</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Av., Alameda..."
                  disabled={addressFieldsLocked}
                />
              </div>
            </div>

            {/* Linha 4b: Número + Bairro + Cidade + Estado */}
            <div className="col-span-3 grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="address-number">Número</Label>
                <Input
                  id="address-number"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  placeholder="Nº"
                  disabled={addressFieldsLocked}
                />
              </div>
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  disabled={addressFieldsLocked}
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                  disabled={addressFieldsLocked}
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Select value={state} onValueChange={setState} disabled={addressFieldsLocked}>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 5: Observações */}
            <div className="col-span-3">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações adicionais"
                rows={1}
                className="min-h-[40px] resize-none"
              />
            </div>
          </div>

          {/* Seção: Configuração de Boletos */}
          <div className="space-y-3">
            <Separator />
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileCheck className="w-4 h-4 text-primary" />
              Configuração de Boletos
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="boleto-active" className="cursor-pointer">
                Gerar Boleto Mensal?
              </Label>
              <Switch
                id="boleto-active"
                checked={boletoActive}
                onCheckedChange={setBoletoActive}
              />
            </div>

            {boletoActive && (
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div>
                  <Label htmlFor="boleto-value">Valor (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input
                      id="boleto-value"
                      type="text"
                      inputMode="numeric"
                      value={boletoValue}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw === '') { setBoletoValue(''); return; }
                        const num = parseInt(raw, 10) / 100;
                        setBoletoValue(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                      }}
                      placeholder="0,00"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="boleto-due-day">Dia de Vencimento</Label>
                  <Input
                    id="boleto-due-day"
                    type="number"
                    min="1"
                    max="31"
                    value={boletoDueDay}
                    onChange={(e) => setBoletoDueDay(e.target.value)}
                    placeholder="Ex: 10"
                  />
                </div>
                <div>
                  <Label htmlFor="boleto-start-date">Data de Início</Label>
                  <Input
                    id="boleto-start-date"
                    type="date"
                    value={boletoStartDate}
                    onChange={(e) => setBoletoStartDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !isFormValid}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
