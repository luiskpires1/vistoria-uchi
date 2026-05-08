import React from 'react';
import { 
  Plus, 
  MapPin, 
  MapPinned,
  Phone,
  User,
  ArrowRight,
  Pencil,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Card } from './UI';
import { Property } from '../types';

interface VisitsProps {
  onBack: () => void;
  onAddProperty: () => void;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  properties: Property[];
}

const Visits: React.FC<VisitsProps> = ({ 
  onBack, 
  onAddProperty, 
  onEditProperty, 
  onDeleteProperty, 
  onSelectProperty,
  properties 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Meus Imóveis</h2>
        <div className="flex gap-2">
           <Button 
            variant="secondary"
            onClick={onBack}
          >
            Voltar
          </Button>
          <Button 
            onClick={onAddProperty} 
            icon={Plus}
          >
            Adicionar Imóvel
          </Button>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-zinc-300">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPinned className="text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium">Nenhum imóvel encontrado</h3>
          <p className="text-zinc-500">Cadastre um imóvel para começar a gerenciar suas visitas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map((property) => (
            <Card 
              key={property.id} 
              className="p-5 hover:shadow-md transition-shadow group relative cursor-pointer"
              onClick={() => onSelectProperty(property)}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-2">
                    <MapPin className="text-brand-blue shrink-0 mt-1" size={18} />
                    <div>
                      <h4 className="font-bold text-zinc-900 leading-tight">
                        {property.address}, {property.number}
                        {property.complement && ` - ${property.complement}`}
                      </h4>
                      <p className="text-sm text-zinc-500">
                        {property.neighborhood} • {property.city}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                      <User size={14} className="text-zinc-400" />
                      <span>{property.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                      <Phone size={14} className="text-zinc-400" />
                      <span>{property.ownerPhone}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 relative z-20">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProperty(property);
                    }}
                    className="p-2 text-zinc-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProperty(property.id);
                    }}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="p-2 h-auto rounded-lg text-zinc-400 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors mt-auto flex items-center justify-center">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(Visits);
