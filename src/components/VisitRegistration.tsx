import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Save, ArrowLeft, Calendar, User, Phone, Briefcase, Info, Clock } from 'lucide-react';
import { Button, Card, Input } from './UI';
import { Property } from '../types';

interface VisitRegistrationProps {
  property: Property;
  initialData?: any;
  onBack: () => void;
  onSave: (visit: any) => void;
}

const VisitRegistration: React.FC<VisitRegistrationProps> = ({ property, initialData, onBack, onSave }) => {
  const [formData, setFormData] = useState({
    visitorName: initialData?.visitorName || '',
    visitorPhone: initialData?.visitorPhone || '',
    leadSource: initialData?.leadSource || '',
    brokerName: initialData?.brokerName || '',
    interest: initialData?.interest || 'compra',
    visitDate: initialData?.visitDate || new Date().toISOString().split('T')[0],
    visitTime: initialData?.visitTime || '',
  });

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'visitorPhone') {
      maskedValue = maskPhone(value);
    }

    setFormData(prev => ({ ...prev, [name]: maskedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      propertyId: property.id
    });
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
        <div>
          <h2 className="text-2xl font-bold">Adicionar Visita</h2>
          <p className="text-sm text-zinc-500">{property.address}, {property.number}</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              <User size={18} className="text-brand-blue" />
              Dados do Visitante
            </h3>
            
            <Input
              label="Nome do Visitante"
              name="visitorName"
              placeholder="Nome completo"
              value={formData.visitorName}
              onChange={handleChange}
              required
            />
            
            <Input
              label="Telefone do Visitante"
              name="visitorPhone"
              placeholder="(00) 00000-0000"
              value={formData.visitorPhone}
              onChange={handleChange}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700">Fonte do Lead</label>
              <select
                name="leadSource"
                value={formData.leadSource}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all outline-none"
                required
              >
                <option value="">Selecione uma opção</option>
                <option value="Grupo ZAP">Grupo ZAP</option>
                <option value="Tráfego Pago">Tráfego Pago</option>
                <option value="Relacionamento Corretor">Relacionamento Corretor</option>
                <option value="Quinto Andar">Quinto Andar</option>
                <option value="Foxter">Foxter</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="flex items-center gap-2 font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              <Briefcase size={18} className="text-brand-blue" />
              Informações da Visita
            </h3>
            
            <Input
              label="Nome do Corretor"
              name="brokerName"
              placeholder="Nome do corretor responsável"
              value={formData.brokerName}
              onChange={handleChange}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700">Interesse da Visita</label>
              <select
                name="interest"
                value={formData.interest}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all outline-none"
                required
              >
                <option value="compra">Compra</option>
                <option value="locação">Locação</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700 flex items-center gap-2">
                  <Calendar size={14} /> Data da Visita
                </label>
                <input
                  type="date"
                  name="visitDate"
                  value={formData.visitDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700 flex items-center gap-2">
                  <Clock size={14} /> Horário da Visita
                </label>
                <input
                  type="time"
                  name="visitTime"
                  value={formData.visitTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button variant="secondary" className="flex-1" onClick={onBack}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" icon={Save}>
              Salvar Visita
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

export default React.memo(VisitRegistration);
