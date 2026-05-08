import React from 'react';
import { ClipboardList, MapPinned } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from './UI';

interface HomeProps {
  onSelectInspections: () => void;
  onSelectVisits: () => void;
}

const HomePage: React.FC<HomeProps> = ({ onSelectInspections, onSelectVisits }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-8 py-8"
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Bem-vindo ao Portal Uchi</h1>
        <p className="text-zinc-500">Selecione o tipo de relatório que deseja acessar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSelectInspections}
          className="cursor-pointer"
        >
          <Card className="p-8 h-full flex flex-col items-center text-center justify-center space-y-6 hover:shadow-xl hover:border-brand-blue border-2 transition-all">
            <div className="w-20 h-20 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
              <ClipboardList size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Laudos de Vistorias</h2>
              <p className="text-zinc-500 text-sm">Acesse e gerencie suas vistorias de entrada, saída e rotina.</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSelectVisits}
          className="cursor-pointer"
        >
          <Card className="p-8 h-full flex flex-col items-center text-center justify-center space-y-6 hover:shadow-xl hover:border-brand-blue border-2 transition-all">
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <MapPinned size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Relatórios de Visitas</h2>
              <p className="text-zinc-500 text-sm">Visualize o histórico e detalhes de visitas a imóveis.</p>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default React.memo(HomePage);
