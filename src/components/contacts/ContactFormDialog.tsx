import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Contact, ContactInsert, TaxRegime } from '@/hooks/useContacts';
import { maskCPFCNPJ, maskPhone } from '@/lib/utils';
import { Search, Loader2 } from 'lucide-react';
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

const TAX_REGIMES: { value: TaxRegime; label: string }[] = [
  { value: 'mei', label: 'MEI' },
  { value: 'simples_nacional', label: 'Simples Nacional' },
  { value: 'lucro_presumido', label: 'Lucro Presumido' },
  { value: 'lucro_real', label: 'Lucro Real' },
  { value: 'nao_aplica', label: 'Não se aplica (PF)' },
];

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isLoading,
}: ContactFormDialogProps) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [taxRegime, setTaxRegime] = useState<TaxRegime | ''>('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [representativeLegal, setRepresentativeLegal] = useState('');
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [addressFieldsLocked, setAddressFieldsLocked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setDocument(contact.document || '');
      setTaxRegime(contact.tax_regime || '');
      setEmail(contact.email || '');
      setPhone(contact.phone || '');
      setAddress(contact.address || '');
      setCity(contact.city || '');
      setState(contact.state || '');
      setNotes(contact.notes || '');
      setIsActive(contact.is_active);
      setRepresentativeLegal(contact.representative_legal || '');
    } else {
      setName('');
      setDocument('');
      setTaxRegime('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCity('');
      setState('');
      setNotes('');
      setIsActive(true);
      setRepresentativeLegal('');
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
      
      const addressParts = [data.logradouro, data.numero, data.bairro].filter(Boolean);
      if (addressParts.length > 0) {
        setAddress(`${data.logradouro || ''}${data.numero ? ', ' + data.numero : ''}${data.bairro ? ' - ' + data.bairro : ''}`);
      }
      
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      type: contact?.type || 'cliente', // Mantém tipo existente ou usa 'cliente' como padrão
      document: document.trim() || null,
      tax_regime: taxRegime || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state || null,
      notes: notes.trim() || null,
      is_active: isActive,
      representative_legal: representativeLegal.trim() || null,
    });
  };

  const isFormValid = name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{contact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Row 1: Nome (full width) */}
            <div className="col-span-2">
              <Label htmlFor="name">Nome <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do contato"
                required
              />
            </div>

            {/* Row 2: CPF/CNPJ | Regime Tributário */}
            <div>
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
            <div>
              <Label htmlFor="taxRegime">Regime Tributário</Label>
              <Select value={taxRegime} onValueChange={(v) => setTaxRegime(v as TaxRegime)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o regime..." />
                </SelectTrigger>
                <SelectContent>
                  {TAX_REGIMES.map((regime) => (
                    <SelectItem key={regime.value} value={regime.value}>
                      {regime.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: E-mail | Telefone */}
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

            {/* Row 4: Representante Legal | Cidade */}
            <div>
              <Label htmlFor="representativeLegal">Representante Legal</Label>
              <Input
                id="representativeLegal"
                value={representativeLegal}
                onChange={(e) => setRepresentativeLegal(e.target.value)}
                placeholder="Nome do representante"
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

            {/* Row 5: Endereço | Estado */}
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro"
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

            {/* Row 6: Observações (full width) */}
            <div className="col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações adicionais"
                rows={2}
              />
            </div>

            {/* Row 7: Status */}
            <div className="col-span-2 flex items-center justify-between">
              <Label htmlFor="active">Contato ativo</Label>
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
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
