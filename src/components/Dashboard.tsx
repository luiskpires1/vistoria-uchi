import React from 'react';
import { 
  Plus, 
  ClipboardList, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  FileText, 
  Trash2, 
  Copy
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Card, Badge } from './UI';
import { Inspection } from '../types';

interface DashboardProps {
  inspections: Inspection[];
  onNewInspection: () => void;
  onEditInspection: (inspection: Inspection) => void;
  onDeleteInspection: (id: string) => void;
  onDuplicateInspection: (inspection: Inspection) => void;
  onGenerateReport: (inspection: Inspection) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  inspections, 
  onNewInspection, 
  onEditInspection, 
  onDeleteInspection, 
  onDuplicateInspection, 
  onGenerateReport 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Laudos de Vistorias</h2>
        <Button 
          onClick={onNewInspection} 
          icon={Plus}
        >
          Nova Vistoria
        </Button>
      </div>

      {inspections.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-zinc-300">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium">Nenhuma vistoria encontrada</h3>
          <p className="text-zinc-500">Comece criando sua primeira vistoria imobiliária.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {inspections.map((ins) => (
            <Card key={ins.id} className="hover:border-zinc-300 transition-colors cursor-pointer group relative" >
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" onClick={() => onEditInspection(ins)}>
                <div className="flex gap-4 items-start flex-1">
                  <div className="w-12 h-12 bg-zinc-100 rounded-xl flex-shrink-0 flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors">
                    <MapPin size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg truncate">
                      {ins.property?.address || ins.address}
                      {ins.property?.complement && ` - ${ins.property.complement}`}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant={ins.type === 'entrada' ? 'info' : ins.type === 'saida' ? 'danger' : 'warning'}>
                        {ins.type}
                      </Badge>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(ins.date).toLocaleDateString()}
                      </span>
                      <Badge variant={ins.status === 'completed' ? 'success' : 'warning'}>
                        {ins.status === 'completed' ? 'Finalizada' : 'Em andamento'}
                      </Badge>
                      {ins.property?.neighborhood && (
                        <span className="text-xs text-zinc-400">• {ins.property.neighborhood}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onGenerateReport(ins);
                      }} 
                      className="text-brand-blue hover:bg-zinc-100 flex items-center gap-2 px-3 py-2"
                      title="Gerar PDF"
                    >
                      <FileText size={18} />
                      <span className="text-sm font-medium">Gerar PDF</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateInspection(ins);
                      }} 
                      className="text-zinc-500 hover:text-brand-blue p-2"
                      title="Duplicar Vistoria"
                    >
                      <Copy size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteInspection(ins.id);
                      }} 
                      className="text-red-400 hover:text-red-500 p-2"
                      title="Excluir Vistoria"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                  <ChevronRight className="text-zinc-300 group-hover:text-brand-blue transition-colors" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(Dashboard);
