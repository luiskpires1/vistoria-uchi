import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, Phone, User, Calendar, Plus, Clock, Briefcase, Info, Pencil, Trash2, ArrowRight, FileText } from 'lucide-react';
import { Button, Card, Badge } from './UI';
import { Property, PropertyVisit } from '../types';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { generateVisitPDF, generateVisitsSummaryPDF } from '../services/pdfService';

interface PropertyDetailsProps {
  property: Property;
  onBack: () => void;
  onEditProperty: (property: Property) => void;
  onAddVisit: () => void;
  onEditVisit: (visit: PropertyVisit) => void;
  onDeleteVisit: (visitId: string) => void;
  onVisitFeedback: (visit: PropertyVisit) => void;
}

const PropertyDetails: React.FC<PropertyDetailsProps> = ({ 
  property, 
  onBack, 
  onEditProperty,
  onAddVisit, 
  onEditVisit, 
  onDeleteVisit,
  onVisitFeedback
}) => {
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleGeneratePDF = async (visit: PropertyVisit) => {
    try {
      await generateVisitPDF(property, visit);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Verifique se o feedback está preenchido.');
    }
  };

  const handleGenerateConsolidatedPDF = () => {
    const filteredVisits = visits.filter(v => {
      const hasFeedback = !!v.feedback;
      if (!hasFeedback) return false;
      if (startDate && v.visitDate < startDate) return false;
      if (endDate && v.visitDate > endDate) return false;
      return true;
    });

    if (filteredVisits.length === 0) {
      alert('Nenhuma visita com feedback encontrada no período selecionado.');
      return;
    }

    generateVisitsSummaryPDF(property, filteredVisits);
  };

  useEffect(() => {
    const q = query(
      collection(db, 'properties', property.id, 'visits'),
      orderBy('visitDate', 'desc'),
      orderBy('visitTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PropertyVisit));
      setVisits(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching visits:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [property.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="p-2" />
        <h2 className="text-2xl font-bold">Detalhes do Imóvel</h2>
      </div>

      <Card className="p-8 relative overflow-hidden border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col gap-8">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue shrink-0 border border-brand-blue/20">
              <MapPin size={32} />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight">
                {property.address}, {property.number}{property.complement ? ` - ${property.complement}` : ''}
              </h3>
              <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
                <span className="font-bold text-zinc-900">{property.neighborhood}</span>
                <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                <span>{property.city}</span>
                <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                <span>{property.cep}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8 border-t border-zinc-100">
            <div className="space-y-3">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block">Proprietário</span>
              <div className="flex items-center gap-4 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-zinc-400 shadow-sm border border-zinc-100">
                  <User size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900">{property.ownerName}</p>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
                    <Phone size={12} className="text-brand-blue" />
                    {property.ownerPhone}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-1 lg:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-end sm:justify-end gap-3">
              <button 
                onClick={() => onEditProperty(property)}
                className="flex items-center justify-center gap-2 px-6 h-14 bg-zinc-50 border border-zinc-200 hover:bg-brand-blue hover:text-white text-zinc-600 rounded-2xl transition-all text-sm font-bold shadow-sm"
              >
                <Pencil size={18} />
                Editar Imóvel
              </button>

              <Button 
                icon={Plus} 
                onClick={onAddVisit} 
                className="w-full md:w-auto h-14 px-8 rounded-2xl shadow-xl shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                Adicionar Visita
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-zinc-50 border border-zinc-100 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h4 className="font-black text-zinc-900 text-sm">Relatório Geral</h4>
            <p className="text-xs text-zinc-500 font-medium">Consolidado de visitas com feedback</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 justify-center lg:justify-end">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Início</span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Fim</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
          </div>

          <button 
            onClick={handleGenerateConsolidatedPDF}
            disabled={visits.filter(v => v.feedback).length === 0}
            className="w-full sm:w-auto h-12 px-6 bg-white border border-zinc-200 text-zinc-700 hover:bg-brand-blue hover:text-white hover:border-brand-blue rounded-xl transition-all text-xs font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <FileText size={16} />
            Relatório de Visitas
          </button>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Calendar size={20} className="text-brand-blue" />
          Histórico de Visitas ({visits.length})
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Clock className="text-zinc-300" />
            </div>
            <p className="text-zinc-500 text-sm">Nenhuma visita registrada para este imóvel.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => (
              <Card key={visit.id} className="p-4 hover:shadow-md transition-all border border-zinc-100">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-1 items-start gap-4">
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex flex-col items-center justify-center text-zinc-400 shrink-0 border border-zinc-100">
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        {new Date(visit.visitDate + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-sm font-bold text-zinc-900 leading-none">
                        {new Date(visit.visitDate + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-zinc-900">{visit.visitorName}</h4>
                        <Badge variant={visit.interest === 'compra' ? 'primary' : 'secondary'} className="px-2 py-0.5 text-[10px] rounded-md">
                          {visit.interest.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 font-medium">
                        <div className="flex items-center gap-1">
                          <Phone size={12} className="text-zinc-400" />
                          {visit.visitorPhone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-zinc-400" />
                          {visit.visitTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-zinc-400" />
                          {visit.brokerName}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <div className="flex items-center gap-1 pr-2 border-r border-zinc-100">
                      <button 
                        onClick={() => onEditVisit(visit)}
                        className="p-2 text-zinc-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-lg transition-all"
                        title="Editar Visita"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => onDeleteVisit(visit.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir Visita"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <button 
                      onClick={() => handleGeneratePDF(visit)}
                      className="px-3 py-2 text-brand-blue hover:bg-brand-blue hover:text-white rounded-lg transition-all font-semibold text-xs flex items-center gap-2 border border-brand-blue/10"
                    >
                      <FileText size={16} />
                      Gerar PDF
                    </button>

                    <button 
                      onClick={() => onVisitFeedback(visit)}
                      className="flex items-center justify-center w-10 h-10 bg-brand-blue text-white rounded-xl shadow-lg shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all"
                      title="Feedback da Visita"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(PropertyDetails);
