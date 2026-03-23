import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Pencil,
  CheckCircle2, 
  ChevronRight, 
  LogOut, 
  ClipboardList, 
  MapPin, 
  Calendar, 
  Info, 
  ArrowLeft, 
  Save, 
  Image as ImageIcon,
  X,
  FileText,
  Download,
  ChevronUp,
  ChevronDown,
  Camera
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Card, Badge } from './UI';
import { Inspection, Room, Item, ItemCondition, InspectionStatus } from '../types';

interface InspectionEditProps {
  localInspection: Inspection;
  localRooms: Room[];
  localItems: { [roomId: string]: Item[] };
  selectedRoom: Room | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isAddingRoom: boolean;
  newRoomName: string;
  isAddingRoomLoading: boolean;
  editingRoomId: string | null;
  editingRoomName: string;
  isAddingItem: boolean;
  newItemName: string;
  isAddingItemLoading: boolean;
  editingItemId: string | null;
  editingItemName: string;
  isMoving: boolean;
  
  onBack: () => void;
  onGenerateReport: (ins: Inspection) => void;
  onDeleteInspection: (id: string) => void;
  onEditProperty: () => void;
  onUpdateStatus: (status: InspectionStatus) => void;
  onUpdatePropertyDescription: (desc: string) => void;
  onUpdateInspectorOpinion: (opinion: string) => void;
  
  onAddRoom: () => void;
  onSetIsAddingRoom: (val: boolean) => void;
  onSetNewRoomName: (val: string) => void;
  onUpdateRoom: (id: string) => void;
  onSetEditingRoomId: (id: string | null) => void;
  onSetEditingRoomName: (name: string) => void;
  onDeleteRoom: (id: string) => void;
  onMoveRoom: (index: number, dir: 'up' | 'down') => void;
  onSelectRoom: (room: Room) => void;
  onUpdateRoomDetails: (id: string, updates: Partial<Room>) => void;
  onRemoveRoomPhoto: (roomId: string, idx: number) => void;
  onRoomPhotoUpload: (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  
  onAddItem: () => void;
  onSetIsAddingItem: (val: boolean) => void;
  onSetNewItemName: (val: string) => void;
  onUpdateItem: (id: string, updates: Partial<Item>) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem: (index: number, dir: 'up' | 'down') => void;
  onSetEditingItemId: (id: string | null) => void;
  onSetEditingItemName: (name: string) => void;
  onPhotoUpload: (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (itemId: string, idx: number) => void;
  onSave: () => void;
}

const InspectionEdit: React.FC<InspectionEditProps> = ({
  localInspection,
  localRooms,
  localItems,
  selectedRoom,
  hasUnsavedChanges,
  isSaving,
  isAddingRoom,
  newRoomName,
  isAddingRoomLoading,
  editingRoomId,
  editingRoomName,
  isAddingItem,
  newItemName,
  isAddingItemLoading,
  editingItemId,
  editingItemName,
  isMoving,
  
  onBack,
  onGenerateReport,
  onDeleteInspection,
  onEditProperty,
  onUpdateStatus,
  onUpdatePropertyDescription,
  onUpdateInspectorOpinion,
  
  onAddRoom,
  onSetIsAddingRoom,
  onSetNewRoomName,
  onUpdateRoom,
  onSetEditingRoomId,
  onSetEditingRoomName,
  onDeleteRoom,
  onMoveRoom,
  onSelectRoom,
  onUpdateRoomDetails,
  onRemoveRoomPhoto,
  onRoomPhotoUpload,
  
  onAddItem,
  onSetIsAddingItem,
  onSetNewItemName,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onSetEditingItemId,
  onSetEditingItemName,
  onPhotoUpload,
  onRemovePhoto,
  onSave
}) => {
  const currentItems = selectedRoom ? (localItems[selectedRoom.id] || []) : [];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between md:justify-start gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="px-2 md:px-4">Painel</Button>
            <Button 
              variant="secondary" 
              onClick={() => onGenerateReport(localInspection)} 
              icon={FileText}
              className="text-xs py-1 px-3"
            >
              Gerar PDF
            </Button>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => onDeleteInspection(localInspection.id)} 
            className="text-red-400 hover:text-red-500 p-2"
            title="Excluir Vistoria"
          >
            <Trash2 size={18} />
          </Button>
        </div>
        
        <div className="text-left md:text-right bg-zinc-50 md:bg-transparent p-4 md:p-0 rounded-2xl border border-zinc-100 md:border-0">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 leading-tight">
            {localInspection.property?.address || localInspection.address}
            {localInspection.property?.complement && ` - ${localInspection.property.complement}`}
          </h2>
          <div className="flex flex-col md:items-end gap-2 mt-1">
            <p className="text-[10px] md:text-xs text-zinc-500 uppercase tracking-widest font-bold">
              {localInspection.type}
              {localInspection.property?.neighborhood && ` • ${localInspection.property.neighborhood}`}
              {localInspection.property?.city && ` • ${localInspection.property.city}`}
            </p>
            <button 
              onClick={onEditProperty} 
              className="flex items-center gap-1.5 text-brand-blue hover:text-brand-blue/80 transition-colors text-xs font-bold uppercase tracking-wider"
            >
              <div className="p-1.5 bg-brand-blue/10 rounded-lg">
                <Pencil size={12} />
              </div>
              <span>Editar Dados do Imóvel</span>
            </button>

            <div className="flex items-center gap-2 mt-2">
              <div className="p-1.5 bg-zinc-100 rounded-lg">
                <ClipboardList size={12} className="text-zinc-500" />
              </div>
              <select 
                value={localInspection.status}
                onChange={(e) => onUpdateStatus(e.target.value as any)}
                className="bg-transparent text-xs font-bold uppercase tracking-wider text-zinc-600 outline-none cursor-pointer hover:text-brand-blue transition-colors"
              >
                <option value="draft">Em andamento</option>
                <option value="completed">Finalizada</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-zinc-500 uppercase text-xs font-bold tracking-widest">
          <FileText size={14} />
          <span>Descrição Geral do Imóvel</span>
        </div>
        <textarea
          placeholder="Descreva as características gerais do imóvel (ex: pintura, conservação, observações importantes)..."
          value={localInspection.propertyDescription || ''}
          onChange={(e) => onUpdatePropertyDescription(e.target.value)}
          className="w-full p-4 rounded-2xl border border-zinc-200 focus:ring-1 focus:ring-brand-blue outline-none text-sm min-h-[120px] bg-zinc-50/50"
        />

        <div className="flex items-center gap-2 text-zinc-500 uppercase text-xs font-bold tracking-widest pt-4">
          <FileText size={14} />
          <span>Parecer do Vistoriador</span>
        </div>
        <textarea
          placeholder="Descreva o parecer final da vistoria (ex: o imóvel encontra-se em perfeitas condições para entrega)..."
          value={localInspection.inspectorOpinion || ''}
          onChange={(e) => onUpdateInspectorOpinion(e.target.value)}
          className="w-full p-4 rounded-2xl border border-zinc-200 focus:ring-1 focus:ring-brand-blue outline-none text-sm min-h-[120px] bg-zinc-50/50"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Rooms List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Cômodos</h3>
            <Button variant="ghost" onClick={() => onSetIsAddingRoom(true)} className="p-1"><Plus size={16} /></Button>
          </div>
          <div className="space-y-2">
            {isAddingRoom && (
              <div className="p-2 bg-white rounded-xl border border-brand-blue shadow-sm space-y-2">
                <input 
                  autoFocus
                  placeholder="Nome do cômodo..."
                  value={newRoomName}
                  onChange={(e) => onSetNewRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onAddRoom()}
                  className="w-full px-2 py-1 text-sm outline-none"
                />
                <div className="flex gap-1">
                  <Button className="flex-1 py-1 text-xs" onClick={onAddRoom} disabled={isAddingRoomLoading}>
                    {isAddingRoomLoading ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button variant="secondary" className="flex-1 py-1 text-xs" onClick={() => onSetIsAddingRoom(false)} disabled={isAddingRoomLoading}>Cancelar</Button>
                </div>
              </div>
            )}
            {localRooms.map((room, index) => (
              <div key={room.id} className="group relative">
                {editingRoomId === room.id ? (
                  <div className="p-2 bg-white rounded-xl border-brand-blue border shadow-sm space-y-2">
                    <input 
                      autoFocus
                      placeholder="Nome do cômodo..."
                      value={editingRoomName}
                      onChange={(e) => onSetEditingRoomName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && onUpdateRoom(room.id)}
                      className="w-full px-2 py-1 text-sm outline-none"
                    />
                    <div className="flex gap-1">
                      <button 
                        onClick={() => onUpdateRoom(room.id)}
                        className="flex-1 py-1 text-xs bg-brand-blue text-white rounded-lg font-bold"
                      >
                        Salvar
                      </button>
                      <button 
                        onClick={() => {
                          onSetEditingRoomId(null);
                          onSetEditingRoomName('');
                        }}
                        className="flex-1 py-1 text-xs bg-zinc-100 text-zinc-600 rounded-lg font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onSelectRoom(room)}
                      className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all pr-24 ${selectedRoom?.id === room.id ? 'bg-brand-blue text-white shadow-lg' : 'bg-white border border-zinc-100 hover:border-zinc-300'}`}
                    >
                      {room.name}
                    </button>
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100`}>
                      <div className="flex flex-col">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onMoveRoom(index, 'up'); }}
                          disabled={index === 0 || isMoving}
                          className={`p-1 rounded disabled:opacity-10 ${selectedRoom?.id === room.id ? 'text-white/50 hover:text-white' : 'text-zinc-300 hover:text-brand-blue'}`}
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onMoveRoom(index, 'down'); }}
                          disabled={index === localRooms.length - 1 || isMoving}
                          className={`p-1 rounded disabled:opacity-10 ${selectedRoom?.id === room.id ? 'text-white/50 hover:text-white' : 'text-zinc-300 hover:text-brand-blue'}`}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetEditingRoomId(room.id);
                          onSetEditingRoomName(room.name || '');
                        }}
                        className={`p-1.5 rounded-lg transition-all ${selectedRoom?.id === room.id ? 'text-white/50 hover:text-white' : 'text-zinc-300 hover:text-brand-blue'}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRoom(room.id);
                        }}
                        className={`p-1.5 rounded-lg transition-all ${selectedRoom?.id === room.id ? 'text-white/50 hover:text-white' : 'text-zinc-300 hover:text-red-500'}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Items List */}
        <div className="md:col-span-2 space-y-6">
          {!selectedRoom ? (
            <div className="h-64 flex flex-col items-center justify-center bg-zinc-100 rounded-3xl text-zinc-400 border border-dashed border-zinc-300">
              <Info size={32} className="mb-2" />
              <p>Selecione um cômodo para começar</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{selectedRoom.name}</h3>
                <Button onClick={() => onSetIsAddingItem(true)} icon={Plus} variant="secondary">Adicionar Item</Button>
              </div>

              <Card className="p-6 space-y-4 bg-zinc-50/50 border-dashed border-2 border-zinc-200">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Descrição do Ambiente</label>
                  <textarea
                    placeholder="Descreva o estado geral deste cômodo..."
                    value={selectedRoom.description || ''}
                    onChange={(e) => onUpdateRoomDetails(selectedRoom.id, { description: e.target.value })}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-1 focus:ring-brand-blue outline-none text-sm min-h-[100px] bg-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Fotos do Ambiente</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedRoom.photos?.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-zinc-200">
                        <img src={photo} alt={`Room ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => onRemoveRoomPhoto(selectedRoom.id, idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500/60 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-blue hover:bg-brand-blue/5 transition-all text-zinc-400 hover:text-brand-blue">
                      <Camera size={24} />
                      <span className="text-[10px] font-bold uppercase">Adicionar Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="hidden" 
                        onChange={(e) => onRoomPhotoUpload(selectedRoom.id, e)} 
                      />
                    </label>
                  </div>
                </div>
              </Card>

              {isAddingItem && (
                <Card className="p-4 border-brand-blue border-2">
                  <div className="space-y-4">
                    <h4 className="font-bold">O que será vistoriado?</h4>
                    <input 
                      autoFocus
                      placeholder="Ex: Pintura, Piso, Janela..."
                      value={newItemName}
                      onChange={(e) => onSetNewItemName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && onAddItem()}
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={onAddItem} disabled={isAddingItemLoading}>
                        {isAddingItemLoading ? 'Adicionando...' : 'Adicionar'}
                      </Button>
                      <Button variant="secondary" className="flex-1" onClick={() => onSetIsAddingItem(false)} disabled={isAddingItemLoading}>Cancelar</Button>
                    </div>
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                {currentItems.map((item, index) => (
                  <Card key={item.id} className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        {editingItemId === item.id ? (
                          <div className="flex gap-2 items-center mb-2">
                            <input 
                              autoFocus
                              value={editingItemName}
                              onChange={(e) => onSetEditingItemName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onUpdateItem(item.id, { name: editingItemName });
                                  onSetEditingItemId(null);
                                }
                                if (e.key === 'Escape') {
                                  onSetEditingItemId(null);
                                }
                              }}
                              className="flex-1 px-3 py-1 text-lg font-bold border border-brand-blue rounded-lg outline-none"
                            />
                            <button 
                              onClick={() => {
                                onUpdateItem(item.id, { name: editingItemName });
                                onSetEditingItemId(null);
                              }}
                              className="p-2 bg-brand-blue text-white rounded-lg"
                            >
                              <Save size={16} />
                            </button>
                            <button 
                              onClick={() => onSetEditingItemId(null)}
                              className="p-2 bg-zinc-100 text-zinc-500 rounded-lg"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/title">
                            <h4 className="font-bold text-lg">{item.name}</h4>
                            <button 
                              onClick={() => {
                                onSetEditingItemId(item.id);
                                onSetEditingItemName(item.name);
                              }}
                              className="p-1 text-zinc-400 hover:text-brand-blue transition-all"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {(['novo', 'bom', 'regular', 'ruim'] as ItemCondition[]).map((cond) => (
                            <button
                              key={cond}
                              onClick={() => onUpdateItem(item.id, { condition: cond })}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${item.condition === cond ? 'bg-brand-blue text-white' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
                            >
                              {cond}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="flex flex-col gap-1 mr-2">
                          <button 
                            onClick={() => onMoveItem(index, 'up')}
                            disabled={index === 0 || isMoving}
                            className="p-1 rounded hover:bg-zinc-100 disabled:opacity-20 text-zinc-400 hover:text-brand-blue transition-all"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button 
                            onClick={() => onMoveItem(index, 'down')}
                            disabled={index === currentItems.length - 1 || isMoving}
                            className="p-1 rounded hover:bg-zinc-100 disabled:opacity-20 text-zinc-400 hover:text-brand-blue transition-all"
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>
                        <Button variant="ghost" onClick={() => onDeleteItem(item.id)} className="text-red-400 hover:text-red-500 p-2">
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <textarea
                        placeholder="Observações sobre o estado de conservação..."
                        value={item.description || ''}
                        onChange={(e) => onUpdateItem(item.id, { description: e.target.value })}
                        className="w-full p-3 rounded-xl border border-zinc-100 focus:ring-1 focus:ring-brand-blue outline-none text-sm min-h-[80px]"
                      />

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={item.hasFurniture || false} 
                            onChange={(e) => onUpdateItem(item.id, { hasFurniture: e.target.checked })}
                            className="w-4 h-4 rounded border-zinc-300 text-brand-blue focus:ring-brand-blue"
                          />
                          <span className="text-sm font-medium">Existe avaria?</span>
                        </label>
                      </div>

                      {item.hasFurniture && (
                        <input
                          placeholder="Descreva a avaria encontrada..."
                          value={item.furnitureDescription || ''}
                          onChange={(e) => onUpdateItem(item.id, { furnitureDescription: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-zinc-100 focus:ring-1 focus:ring-brand-blue outline-none text-sm"
                        />
                      )}

                      {/* Photos */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Fotos</p>
                          <label className="cursor-pointer">
                            <input 
                              type="file" 
                              accept="image/*" 
                              multiple
                              capture="environment"
                              className="hidden" 
                              onChange={(e) => onPhotoUpload(item.id, e)} 
                            />
                            <div className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:underline">
                              <Camera size={14} />
                              Tirar Foto
                            </div>
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {item.photos.map((photo, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 group">
                              <img src={photo} alt="Vistoria" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => onRemovePhoto(item.id, idx)}
                                className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <label className="aspect-square rounded-lg border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 cursor-pointer transition-all">
                            <input 
                              type="file" 
                              accept="image/*" 
                              multiple
                              className="hidden" 
                              onChange={(e) => onPhotoUpload(item.id, e)} 
                            />
                            <Plus size={20} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {currentItems.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-3xl border border-zinc-100">
                    <p className="text-zinc-500">Nenhum item registrado neste cômodo.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-zinc-200 flex justify-center z-[100]">
        <Button 
          className="w-full max-w-md py-4 shadow-xl shadow-black/10" 
          icon={Save}
          disabled={isSaving}
          onClick={onSave}
        >
          {isSaving ? 'Salvando...' : 'Salvar Vistoria'}
        </Button>
      </div>
    </motion.div>
  );
};

export default React.memo(InspectionEdit);
