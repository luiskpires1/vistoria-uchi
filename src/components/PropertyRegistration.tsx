import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Save, ArrowLeft, Home } from 'lucide-react';
import { Button, Card, Input } from './UI';
import { Property } from '../types';

interface PropertyRegistrationProps {
  onBack: () => void;
  onSave: (property: any) => void;
  initialData?: Property | null;
}

const PropertyRegistration: React.FC<PropertyRegistrationProps> = ({ onBack, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    address: initialData?.address || '',
    number: initialData?.number || '',
    complement: initialData?.complement || '',
    neighborhood: initialData?.neighborhood || '',
    city: initialData?.city || '',
    cep: initialData?.cep || '',
    ownerName: initialData?.ownerName || '',
    ownerPhone: initialData?.ownerPhone || '',
  });

  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'cep') {
      maskedValue = maskCEP(value);
    } else if (name === 'ownerPhone') {
      maskedValue = maskPhone(value);
    }

    setFormData(prev => ({ ...prev, [name]: maskedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(initialData ? { ...formData, id: initialData.id } : formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="p-2" />
        <h2 className="text-2xl font-bold">{initialData ? 'Editar Imóvel' : 'Cadastrar Novo Imóvel'}</h2>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              <Home size={18} className="text-brand-blue" />
              Informações do Imóvel
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Endereço"
                  name="address"
                  placeholder="Rua, Avenida..."
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Input
                  label="Número"
                  name="number"
                  placeholder="123"
                  value={formData.number}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Complemento"
                name="complement"
                placeholder="Apto, Sala, Bloco..."
                value={formData.complement}
                onChange={handleChange}
              />
              <Input
                label="Bairro"
                name="neighborhood"
                placeholder="Ex: Centro"
                value={formData.neighborhood}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Cidade"
                name="city"
                placeholder="Ex: Porto Alegre"
                value={formData.city}
                onChange={handleChange}
                required
              />
              <Input
                label="CEP"
                name="cep"
                placeholder="00000-000"
                value={formData.cep}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="flex items-center gap-2 font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              <Save size={18} className="text-brand-blue" />
              Dados do Proprietário
            </h3>
            
            <Input
              label="Nome do Proprietário"
              name="ownerName"
              placeholder="Nome completo"
              value={formData.ownerName}
              onChange={handleChange}
              required
            />
            
            <Input
              label="Telefone do Proprietário"
              name="ownerPhone"
              placeholder="(00) 00000-0000"
              value={formData.ownerPhone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex gap-3 pt-6">
            <Button variant="secondary" className="flex-1" onClick={onBack}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" icon={Save}>
              Salvar Imóvel
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

export default React.memo(PropertyRegistration);
