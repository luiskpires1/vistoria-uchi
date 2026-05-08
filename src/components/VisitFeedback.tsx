import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Star } from 'lucide-react';
import { Button, Card } from './UI';
import { Property, PropertyVisit, VisitFeedbackData } from '../types';

interface VisitFeedbackProps {
  property: Property;
  visit: PropertyVisit;
  onBack: () => void;
  onSave: (feedback: VisitFeedbackData) => void;
  isSaving?: boolean;
}

const questions = [
  { id: 'propertySize', label: 'Tamanho do imóvel' },
  { id: 'roomLayout', label: 'Disposição das peças' },
  { id: 'furniture', label: 'Mobiliário' },
  { id: 'appliances', label: 'Eletrodomésticos' },
  { id: 'lighting', label: 'Iluminação' },
  { id: 'parking', label: 'Vaga de garagem' },
  { id: 'price', label: 'Preço' },
] as const;

const VisitFeedback: React.FC<VisitFeedbackProps> = ({ property, visit, onBack, onSave, isSaving }) => {
  const [feedback, setFeedback] = useState<VisitFeedbackData>(() => {
    const defaultFeedback: VisitFeedbackData = {
      propertySize: { rating: 0, observation: '' },
      roomLayout: { rating: 0, observation: '' },
      furniture: { rating: 0, observation: '' },
      appliances: { rating: 0, observation: '' },
      lighting: { rating: 0, observation: '' },
      parking: { rating: 0, observation: '' },
      price: { rating: 0, observation: '' },
      propertyQualities: '',
      propertyDefects: '',
      generalObservations: '',
    };

    if (!visit.feedback) return defaultFeedback;

    return {
      ...defaultFeedback,
      ...visit.feedback
    };
  });

  const handleRatingChange = (questionId: keyof VisitFeedbackData, rating: number) => {
    setFeedback((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], rating },
    }));
  };

  const handleObservationChange = (questionId: keyof VisitFeedbackData, observation: string) => {
    setFeedback((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], observation },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(feedback);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-zinc-600" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold text-zinc-900">Formulário da Visita</h1>
          <p className="text-zinc-500 text-sm">
            {property.address}, {property.number} • {visit.visitorName}
          </p>
        </div>
        <div className="w-10"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {questions.map((q) => (
          <Card key={q.id} className="p-6">
            <div className="space-y-4">
              <label className="text-lg font-semibold text-zinc-900 block">
                {q.label}
              </label>
              
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleRatingChange(q.id as keyof VisitFeedbackData, num)}
                    className={`
                      w-10 h-10 rounded-lg font-medium transition-all
                      ${(feedback[q.id as keyof VisitFeedbackData] as any).rating === num
                        ? 'bg-brand-blue text-white shadow-lg ring-2 ring-brand-blue/20'
                        : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
                      }
                    `}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <textarea
                  placeholder="Adicione uma observação (opcional)"
                  value={(feedback[q.id as keyof VisitFeedbackData] as any).observation}
                  onChange={(e) => handleObservationChange(q.id as keyof VisitFeedbackData, e.target.value)}
                  className="w-full h-24 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
                />
              </div>
            </div>
          </Card>
        ))}

        <Card className="p-6">
          <div className="space-y-4">
            <label className="text-lg font-semibold text-zinc-900 block">
              Qualidades do Imóvel
            </label>
            <textarea
              placeholder="Descreva as qualidades do imóvel..."
              value={feedback.propertyQualities}
              onChange={(e) => setFeedback(prev => ({ ...prev, propertyQualities: e.target.value }))}
              className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <label className="text-lg font-semibold text-zinc-900 block">
              Defeitos do Imóvel
            </label>
            <textarea
              placeholder="Descreva os defeitos do imóvel..."
              value={feedback.propertyDefects}
              onChange={(e) => setFeedback(prev => ({ ...prev, propertyDefects: e.target.value }))}
              className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <label className="text-lg font-semibold text-zinc-900 block">
              Observações Gerais
            </label>
            <textarea
              placeholder="Adicione observações gerais sobre a visita..."
              value={feedback.generalObservations}
              onChange={(e) => setFeedback(prev => ({ ...prev, generalObservations: e.target.value }))}
              className="w-full h-40 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none"
            />
          </div>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-zinc-200 flex justify-center z-50">
          <Button 
            type="submit"
            className="w-full max-w-md py-4 shadow-xl shadow-black/10"
            icon={Save}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Feedback'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VisitFeedback;
