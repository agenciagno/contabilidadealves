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
  const [type, setType] = useState<'cliente' | 'fornecedor' | 'ambos'>('cliente');
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

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setType(contact.type);
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
      setType('cliente');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      type,
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

  const isFormValid = name.trim() && document.trim() && email.trim() && taxRegime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{contact ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Row 1: Nome | Tipo */}
            <div>
              <Label htmlFor="name">Nome <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do contato"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Tipo <span className="text-destructive">*</span></Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: CPF/CNPJ | Regime Tributário */}
            <div>
              <Label htmlFor="document">CPF/CNPJ <span className="text-destructive">*</span></Label>
              <Input
                id="document"
                value={document}
                onChange={(e) => setDocument(maskCPFCNPJ(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={18}
              />
            </div>
            <div>
              <Label htmlFor="taxRegime">Regime Tributário <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="email">E-mail <span className="text-destructive">*</span></Label>
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
              />
            </div>
            <div>
              <Label htmlFor="state">Estado</Label>
              <Select value={state} onValueChange={setState}>
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
