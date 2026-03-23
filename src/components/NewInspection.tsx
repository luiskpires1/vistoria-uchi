import React from 'react';
import { 
  ArrowLeft, 
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Card, Input, Select } from './UI';
import { InspectionType, InspectionStatus } from '../types';

interface NewInspectionProps {
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  inspectionType: InspectionType;
  onTypeChange: (type: InspectionType) => void;
  inspectionStatus: InspectionStatus;
  onStatusChange: (status: InspectionStatus) => void;
  onCPFChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCEPChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCreating: boolean;
}

const NewInspection: React.FC<NewInspectionProps> = ({
  onBack,
  onSubmit,
  inspectionType,
  onTypeChange,
  inspectionStatus,
  onStatusChange,
  onCPFChange,
  onCEPChange,
  isCreating
}) => {
  return (
    <motion.div 
      key="new"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto pb-20"
    >
      <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="mb-6">Voltar</Button>
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-6">Nova Vistoria</h2>
        <form onSubmit={onSubmit} className="space-y-8">
          {/* Property Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Dados do Imóvel</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input label="Endereço" name="address" required placeholder="Rua, Número" />
              </div>
              <Input label="Complemento" name="complement" placeholder="Apto, Bloco, etc" />
              <Input label="Bairro" name="neighborhood" required placeholder="Bairro" />
              <Input label="Cidade" name="city" required placeholder="Cidade" />
              <Input label="CEP" name="cep" required onChange={onCEPChange} placeholder="00000-000" />
            </div>
          </div>

          {/* Inspection Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Dados da Vistoria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                label="Tipo de Vistoria" 
                name="type" 
                value={inspectionType}
                onChange={(e) => onTypeChange(e.target.value as InspectionType)}
                options={[
                  { value: 'entrada', label: 'Vistoria de Entrada' },
                  { value: 'saida', label: 'Vistoria de Saída' },
                  { value: 'rotina', label: 'Vistoria de Rotina' },
                  { value: 'venda', label: 'Vistoria de Compra/Venda' }
                ]}
              />
              <Select 
                label="Status da Vistoria" 
                name="status" 
                value={inspectionStatus}
                onChange={(e) => onStatusChange(e.target.value as InspectionStatus)}
                options={[
                  { value: 'draft', label: 'Em andamento' },
                  { value: 'completed', label: 'Finalizada' }
                ]}
              />
            </div>
          </div>

          {/* Inspector Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Dados do Vistoriador</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nome Completo" name="inspectorName" required placeholder="Nome do vistoriador" />
              <Input label="CPF" name="inspectorCpf" required onChange={onCPFChange} placeholder="000.000.000-00" />
            </div>
          </div>

          {/* Involved Parties */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Partes Envolvidas</h3>
            {inspectionType === 'venda' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                  <p className="font-bold text-sm">Vendedor</p>
                  <Input label="Nome Completo" name="sellerName" required placeholder="Nome do vendedor" />
                  <Input label="CPF" name="sellerCpf" required onChange={onCPFChange} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                  <p className="font-bold text-sm">Comprador</p>
                  <Input label="Nome Completo" name="buyerName" required placeholder="Nome do comprador" />
                  <Input label="CPF" name="buyerCpf" required onChange={onCPFChange} placeholder="000.000.000-00" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                  <p className="font-bold text-sm">Proprietário</p>
                  <Input label="Nome Completo" name="ownerName" required placeholder="Nome do proprietário" />
                  <Input label="CPF" name="ownerCpf" required onChange={onCPFChange} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                  <p className="font-bold text-sm">Inquilino</p>
                  <Input label="Nome Completo" name="tenantName" required placeholder="Nome do inquilino" />
                  <Input label="CPF" name="tenantCpf" required onChange={onCPFChange} placeholder="000.000.000-00" />
                </div>
              </div>
            )}
          </div>

          <Button className="w-full py-4" icon={isCreating ? undefined : CheckCircle2} disabled={isCreating}>
            {isCreating ? 'Criando Vistoria...' : 'Iniciar Vistoria'}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
};

export default React.memo(NewInspection);
