/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Camera, 
  Trash2, 
  Pencil,
  CheckCircle2, 
  ChevronRight, 
  Home, 
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
  ChevronDown
} from 'lucide-react';
import { generateInspectionPDF } from './services/pdfService';
import { 
  motion, 
  AnimatePresence,
  Reorder
} from 'motion/react';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Inspection, 
  Room, 
  Item, 
  InspectionType, 
  ItemCondition, 
  InspectionStatus 
} from './types';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'uchi-imoveis-standard',
      email: 'contato@uchiimoveis.com.br',
      emailVerified: true,
      isAnonymous: false,
      providerInfo: []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Ocorreu um erro inesperado.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error.includes('insufficient permissions')) {
          message = "Você não tem permissão para realizar esta ação. Verifique se você é o proprietário desta vistoria.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 text-center">
          <Card className="p-8 max-w-md">
            <X className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-xl font-bold mb-2">Ops! Algo deu errado</h2>
            <p className="text-zinc-500 mb-6">{message}</p>
            <Button onClick={() => window.location.reload()} className="w-full">Recarregar Aplicativo</Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }: any) => {
  const variants: any = {
    primary: 'bg-brand-blue text-white hover:bg-brand-blue/90',
    secondary: 'bg-white text-brand-blue border border-zinc-200 hover:bg-zinc-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'neutral' }: any) => {
  const variants: any = {
    neutral: 'bg-zinc-100 text-zinc-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
    danger: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${variants[variant]}`}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children, footer }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
};

const Toast = ({ isOpen, message, type = 'info' }: any) => {
  if (!isOpen) return null;
  const colors: any = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-brand-blue'
  };
  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl text-white font-medium shadow-xl flex items-center gap-3 ${colors[type]}`}
    >
      {type === 'success' && <CheckCircle2 size={20} />}
      {type === 'error' && <X size={20} />}
      {type === 'info' && <Info size={20} />}
      {message}
    </motion.div>
  );
};

// --- Constants ---

const LOGO_URL = '/logo.png';

const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Uchi03++') {
      localStorage.setItem('uchi_logged_in', 'true');
      onLogin();
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-zinc-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 rounded-full overflow-hidden mb-4 shadow-lg border border-zinc-100 bg-white">
            <img 
              src={LOGO_URL} 
              alt="Uchi Vistorias Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to home icon if image fails
                (e.target as any).style.display = 'none';
                (e.target as any).parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-brand-blue/10"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#003a5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Uchi Imóveis</h1>
          <p className="text-zinc-500 text-sm">Acesse o sistema de vistorias</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">Usuário</label>
            <input 
              type="text" 
              value="Uchi Imóveis" 
              disabled 
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 outline-none cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-xs font-medium"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            className="w-full bg-brand-blue text-white py-3 rounded-xl font-bold hover:bg-brand-blue/90 transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2"
          >
            Entrar
            <ChevronRight size={18} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---

const STANDARD_USER = {
  uid: 'uchi-imoveis-standard',
  displayName: 'Uchi Imóveis',
  email: 'contato@uchiimoveis.com.br',
  isAnonymous: false
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('uchi_logged_in') === 'true');
  const [user] = useState<any>(STANDARD_USER);
  const [loading, setLoading] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [view, setView] = useState<'dashboard' | 'new' | 'edit'>('dashboard');
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = formatCPF(e.target.value);
  };
  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = formatCEP(e.target.value);
  };
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('uchi_logged_in');
    setIsLoggedIn(false);
  };
  const [isMoving, setIsMoving] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingRoomLoading, setIsAddingRoomLoading] = useState(false);
  const [isAddingItemLoading, setIsAddingItemLoading] = useState(false);
  const [newInspectionType, setNewInspectionType] = useState<InspectionType>('entrada');

  const currentRoom = rooms.find(r => r.id === selectedRoom?.id) || selectedRoom;

  const compressImage = (base64Str: string, maxWidth = 600, maxHeight = 600, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  // Test Connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth removed as per user request
  useEffect(() => {
    setLoading(false);
  }, []);

  // Fetch Inspections
  useEffect(() => {
    const q = query(
      collection(db, 'inspections'), 
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspection));
      setInspections(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inspections'));
    return () => unsubscribe();
  }, []);

  // Fetch Rooms when editing
  useEffect(() => {
    if (!currentInspection) return;
    const q = query(
      collection(db, `inspections/${currentInspection.id}/rooms`),
      orderBy('order', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      setRooms(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `inspections/${currentInspection.id}/rooms`));
    return () => unsubscribe();
  }, [currentInspection]);

  // Fetch Items when room selected
  useEffect(() => {
    if (!currentInspection || !selectedRoom) return;
    const q = query(
      collection(db, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items`),
      orderBy('order', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
      setItems(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items`));
    return () => unsubscribe();
  }, [currentInspection, selectedRoom]);

  // Keep currentInspection updated when inspections list changes
  useEffect(() => {
    if (currentInspection) {
      const updated = inspections.find(i => i.id === currentInspection.id);
      if (updated && (updated.propertyDescription !== currentInspection.propertyDescription || updated.inspectorOpinion !== currentInspection.inspectorOpinion)) {
        setCurrentInspection(updated);
      }
    }
  }, [inspections]);

  const createInspection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const address = formData.get('address') as string;
    const complement = formData.get('complement') as string;
    const neighborhood = formData.get('neighborhood') as string;
    const city = formData.get('city') as string;
    const cep = formData.get('cep') as string;
    const type = formData.get('type') as InspectionType;

    const inspectorName = formData.get('inspectorName') as string;
    const inspectorCpf = formData.get('inspectorCpf') as string;

    const ownerName = formData.get('ownerName') as string;
    const ownerCpf = formData.get('ownerCpf') as string;
    const tenantName = formData.get('tenantName') as string;
    const tenantCpf = formData.get('tenantCpf') as string;

    const buyerName = formData.get('buyerName') as string;
    const buyerCpf = formData.get('buyerCpf') as string;
    const sellerName = formData.get('sellerName') as string;
    const sellerCpf = formData.get('sellerCpf') as string;

    if (!user) {
      showToast("Você precisa estar autenticado para criar uma vistoria.", "error");
      return;
    }

    setIsCreating(true);
    try {
      const inspectionData: any = {
        address, // Legacy
        property: {
          address,
          complement,
          neighborhood,
          city,
          cep
        },
        type,
        date: new Date().toISOString(),
        status: 'draft',
        inspectorId: user.uid,
        inspector: { name: inspectorName, cpf: inspectorCpf }
      };

      if (type === 'venda') {
        inspectionData.buyer = { name: buyerName, cpf: buyerCpf };
        inspectionData.seller = { name: sellerName, cpf: sellerCpf };
      } else {
        inspectionData.owner = { name: ownerName, cpf: ownerCpf };
        inspectionData.tenant = { name: tenantName, cpf: tenantCpf };
      }

      const docRef = await addDoc(collection(db, 'inspections'), inspectionData);

      // Pre-populate default rooms and items
      // "Chaves" is always first and has no items
      await addDoc(collection(db, `inspections/${docRef.id}/rooms`), {
        inspectionId: docRef.id,
        name: 'Chaves',
        order: 0
      });

      const otherRooms = ['Quarto', 'Cozinha', 'Sala', 'Banheiro'].sort((a, b) => a.localeCompare(b));
      const defaultItems = ['Parede', 'Rodapé', 'Piso', 'Pintura', 'Portas', 'Janelas', 'Teto', 'Mobiliário'].sort((a, b) => a.localeCompare(b));
      
      for (let i = 0; i < otherRooms.length; i++) {
        const roomRef = await addDoc(collection(db, `inspections/${docRef.id}/rooms`), {
          inspectionId: docRef.id,
          name: otherRooms[i],
          order: i + 1 // Start from 1 because Chaves is 0
        });

        for (let j = 0; j < defaultItems.length; j++) {
          await addDoc(collection(db, `inspections/${docRef.id}/rooms/${roomRef.id}/items`), {
            roomId: roomRef.id,
            name: defaultItems[j],
            condition: 'bom',
            description: '',
            photos: [],
            order: j
          });
        }
      }

      setView('dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inspections');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteInspection = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Vistoria',
      message: 'Tem certeza que deseja excluir esta vistoria permanentemente?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'inspections', id));
          if (currentInspection?.id === id) {
            setView('dashboard');
            setCurrentInspection(null);
            setSelectedRoom(null);
          }
          showToast('Vistoria excluída com sucesso!', 'success');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `inspections/${id}`);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleUpdateProperty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentInspection) return;

    const formData = new FormData(e.currentTarget);
    const address = formData.get('address') as string;
    const complement = formData.get('complement') as string;
    const neighborhood = formData.get('neighborhood') as string;
    const city = formData.get('city') as string;
    const cep = formData.get('cep') as string;

    const inspectorName = formData.get('inspectorName') as string;
    const inspectorCpf = formData.get('inspectorCpf') as string;

    const ownerName = formData.get('ownerName') as string;
    const ownerCpf = formData.get('ownerCpf') as string;
    const tenantName = formData.get('tenantName') as string;
    const tenantCpf = formData.get('tenantCpf') as string;

    const buyerName = formData.get('buyerName') as string;
    const buyerCpf = formData.get('buyerCpf') as string;
    const sellerName = formData.get('sellerName') as string;
    const sellerCpf = formData.get('sellerCpf') as string;

    try {
      const updateData: any = {
        address, // Legacy
        property: {
          address,
          complement,
          neighborhood,
          city,
          cep
        },
        inspector: { name: inspectorName, cpf: inspectorCpf }
      };

      if (currentInspection.type === 'venda') {
        updateData.buyer = { name: buyerName, cpf: buyerCpf };
        updateData.seller = { name: sellerName, cpf: sellerCpf };
      } else {
        updateData.owner = { name: ownerName, cpf: ownerCpf };
        updateData.tenant = { name: tenantName, cpf: tenantCpf };
      }

      await updateDoc(doc(db, 'inspections', currentInspection.id), updateData);
      
      // Update local state
      setCurrentInspection({
        ...currentInspection,
        ...updateData
      });

      setIsEditingProperty(false);
      showToast('Dados atualizados com sucesso!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inspections/${currentInspection.id}`);
    }
  };

  const addRoom = async () => {
    if (!currentInspection || !newRoomName.trim()) return;

    setIsAddingRoomLoading(true);
    try {
      const roomRef = await addDoc(collection(db, `inspections/${currentInspection.id}/rooms`), {
        inspectionId: currentInspection.id,
        name: newRoomName.trim(),
        order: rooms.length
      });

      const defaultItems = ['Parede', 'Rodapé', 'Piso', 'Pintura', 'Portas', 'Janelas', 'Teto', 'Mobiliário'].sort((a, b) => a.localeCompare(b));
      
      for (let i = 0; i < defaultItems.length; i++) {
        await addDoc(collection(db, `inspections/${currentInspection.id}/rooms/${roomRef.id}/items`), {
          roomId: roomRef.id,
          name: defaultItems[i],
          condition: 'bom',
          description: '',
          hasFurniture: false,
          photos: [],
          order: i
        });
      }

      setNewRoomName('');
      setIsAddingRoom(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `inspections/${currentInspection.id}/rooms`);
    } finally {
      setIsAddingRoomLoading(false);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!currentInspection) return;
    try {
      await deleteDoc(doc(db, `inspections/${currentInspection.id}/rooms`, roomId));
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inspections/${currentInspection.id}/rooms/${roomId}`);
    }
  };

  const moveRoom = async (index: number, direction: 'up' | 'down') => {
    if (isMoving || !currentInspection || !rooms.length) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rooms.length) return;

    setIsMoving(true);
    const newRooms = [...rooms];
    const [movedRoom] = newRooms.splice(index, 1);
    newRooms.splice(newIndex, 0, movedRoom);

    try {
      // Update all rooms with their new order to ensure consistency and fix any duplicate/missing orders
      const promises = newRooms.map((room, idx) => 
        updateDoc(doc(db, `inspections/${currentInspection.id}/rooms`, room.id), {
          order: idx
        })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error moving room:', error);
      showToast('Erro ao organizar cômodos', 'error');
    } finally {
      setIsMoving(false);
    }
  };

  const generateReport = async (inspection: Inspection) => {
    try {
      // Fetch all rooms for this inspection
      const roomsQuery = query(collection(db, `inspections/${inspection.id}/rooms`), orderBy('order'));
      const roomsSnapshot = await getDocs(roomsQuery);
      
      const roomsData = await Promise.all(roomsSnapshot.docs.map(async (roomDoc) => {
        const room = roomDoc.data();
        // Fetch all items for this room
        const itemsQuery = query(collection(db, `inspections/${inspection.id}/rooms/${roomDoc.id}/items`), orderBy('order'));
        const itemsSnapshot = await getDocs(itemsQuery);
        
        return {
          name: room.name,
          description: room.description,
          photos: room.photos || [],
          items: itemsSnapshot.docs.map(itemDoc => {
            const item = itemDoc.data();
            return {
              name: item.name,
              condition: item.condition,
              description: item.description,
              hasFurniture: item.hasFurniture,
              furnitureDescription: item.furnitureDescription,
              photos: item.photos || []
            };
          })
        };
      }));

      await generateInspectionPDF({
        property: inspection.property || { address: inspection.address, neighborhood: '', city: '', cep: '' },
        type: inspection.type,
        date: inspection.date,
        propertyDescription: inspection.propertyDescription,
        inspectorOpinion: inspection.inspectorOpinion,
        status: inspection.status,
        inspector: inspection.inspector || { name: '', cpf: '' },
        owner: inspection.owner,
        tenant: inspection.tenant,
        buyer: inspection.buyer,
        seller: inspection.seller,
        rooms: roomsData
      });
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('Erro ao gerar o laudo em PDF. Tente novamente.', 'error');
    }
  };

  const updateRoom = async (roomId: string) => {
    if (!currentInspection || !editingRoomName.trim()) return;
    try {
      await updateDoc(doc(db, `inspections/${currentInspection.id}/rooms`, roomId), {
        name: editingRoomName.trim()
      });
      setEditingRoomId(null);
      setEditingRoomName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inspections/${currentInspection.id}/rooms/${roomId}`);
    }
  };

  const updatePropertyDescription = async (description: string) => {
    if (!currentInspection) return;
    try {
      await updateDoc(doc(db, 'inspections', currentInspection.id), {
        propertyDescription: description
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inspections/${currentInspection.id}`);
    }
  };

  const updateInspectorOpinion = async (opinion: string) => {
    if (!currentInspection) return;
    try {
      await updateDoc(doc(db, 'inspections', currentInspection.id), {
        inspectorOpinion: opinion
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inspections/${currentInspection.id}`);
    }
  };

  const updateRoomDetails = async (roomId: string, updates: Partial<Room>) => {
    if (!currentInspection) return;
    try {
      await updateDoc(doc(db, `inspections/${currentInspection.id}/rooms`, roomId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inspections/${currentInspection.id}/rooms/${roomId}`);
    }
  };

  const handleRoomPhotoUpload = async (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const room = rooms.find(r => r.id === roomId);
    if (room && (room.photos?.length || 0) >= 10) {
      showToast('Limite de 10 fotos por ambiente atingido.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const compressedBase64 = await compressImage(base64String);
      if (room) {
        await updateRoomDetails(roomId, { photos: [...(room.photos || []), compressedBase64] });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeRoomPhoto = async (roomId: string, photoIndex: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.photos) return;
    const newPhotos = [...room.photos];
    newPhotos.splice(photoIndex, 1);
    await updateRoomDetails(roomId, { photos: newPhotos });
  };

  const addItem = async () => {
    if (!currentInspection || !selectedRoom || !newItemName.trim()) return;

    setIsAddingItemLoading(true);
    try {
      await addDoc(collection(db, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items`), {
        roomId: selectedRoom.id,
        name: newItemName.trim(),
        condition: 'bom',
        description: '',
        hasFurniture: false,
        photos: [],
        order: items.length
      });
      setNewItemName('');
      setIsAddingItem(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items`);
    } finally {
      setIsAddingItemLoading(false);
    }
  };

  const updateItem = async (itemId: string, updates: Partial<Item>) => {
    if (!currentInspection || !selectedRoom) return;
    try {
      await updateDoc(doc(db, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items`, itemId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items/${itemId}`);
    }
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    if (isMoving || !currentInspection || !selectedRoom || !items.length) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    setIsMoving(true);
    const newItems = [...items];
    const [movedItem] = newItems.splice(index, 1);
    newItems.splice(newIndex, 0, movedItem);

    try {
      // Update all items with their new order to ensure consistency
      const promises = newItems.map((item, idx) => 
        updateDoc(doc(db, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items`, item.id), {
          order: idx
        })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error moving item:', error);
      showToast('Erro ao organizar itens', 'error');
    } finally {
      setIsMoving(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!currentInspection || !selectedRoom) return;
    try {
      await deleteDoc(doc(db, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items`, itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items/${itemId}`);
    }
  };

  const handlePhotoUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const item = items.find(i => i.id === itemId);
    if (item && (item.photos?.length || 0) >= 10) {
      showToast('Limite de 10 fotos por item atingido.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const compressedBase64 = await compressImage(base64String);
      if (item) {
        await updateItem(itemId, { photos: [...item.photos, compressedBase64] });
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = async (itemId: string, photoIndex: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newPhotos = [...item.photos];
    newPhotos.splice(photoIndex, 1);
    await updateItem(itemId, { photos: newPhotos });
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-200 rounded-full" />
          <div className="h-4 w-32 bg-zinc-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-50 text-brand-blue font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 bg-white">
            <img 
              src={LOGO_URL} 
              alt="Uchi Vistorias Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to home icon if image fails
                (e.target as any).style.display = 'none';
                (e.target as any).parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-brand-blue/10"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#003a5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>';
              }}
            />
          </div>
          <span className="font-bold text-xl tracking-tight">Uchi Vistorias</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-medium text-brand-blue">{user.displayName}</p>
            <p className="text-[10px] text-zinc-500">{user.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Minhas Vistorias</h2>
                <Button 
                  onClick={() => setView('new')} 
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
                      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" onClick={() => {
                        setCurrentInspection(ins);
                        setView('edit');
                      }}>
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
                              {ins.status === 'completed' && <Badge variant="success">Finalizada</Badge>}
                              {ins.property?.neighborhood && (
                                <span className="text-xs text-zinc-400">• {ins.property.neighborhood}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <div className="flex items-center gap-2">
                            {ins.status === 'completed' && (
                              <Button 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generateReport(ins);
                                }} 
                                className="text-brand-blue hover:bg-zinc-100 flex items-center gap-2 px-3 py-2"
                                title="Gerar PDF"
                              >
                                <FileText size={18} />
                                <span className="text-sm font-medium">Gerar PDF</span>
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteInspection(ins.id);
                              }} 
                              className="text-red-400 hover:text-red-500 p-2"
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
          )}

          {view === 'new' && (
            <motion.div 
              key="new"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto pb-20"
            >
              <Button variant="ghost" onClick={() => setView('dashboard')} icon={ArrowLeft} className="mb-6">Voltar</Button>
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-6">Nova Vistoria</h2>
                <form onSubmit={createInspection} className="space-y-8">
                  {/* Property Info */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Dados do Imóvel</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Endereço</label>
                        <input name="address" required placeholder="Rua, Número" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Complemento</label>
                        <input name="complement" placeholder="Apto, Bloco, etc" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Bairro</label>
                        <input name="neighborhood" required placeholder="Bairro" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Cidade</label>
                        <input name="city" required placeholder="Cidade" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">CEP</label>
                        <input name="cep" required onChange={handleCEPChange} placeholder="00000-000" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    </div>
                  </div>

                  {/* Inspection Info */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Dados da Vistoria</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Tipo de Vistoria</label>
                      <select 
                        name="type" 
                        value={newInspectionType}
                        onChange={(e) => setNewInspectionType(e.target.value as InspectionType)}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
                      >
                        <option value="entrada">Vistoria de Entrada</option>
                        <option value="saida">Vistoria de Saída</option>
                        <option value="rotina">Vistoria de Rotina</option>
                        <option value="venda">Vistoria de Compra/Venda</option>
                      </select>
                    </div>
                  </div>

                  {/* Inspector Info */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Dados do Vistoriador</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">Nome Completo</label>
                        <input name="inspectorName" required placeholder="Nome do vistoriador" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">CPF</label>
                        <input name="inspectorCpf" required onChange={handleCPFChange} placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    </div>
                  </div>

                  {/* Involved Parties */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Partes Envolvidas</h3>
                    {newInspectionType === 'venda' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                          <p className="font-bold text-sm">Vendedor</p>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                            <input name="sellerName" required placeholder="Nome do vendedor" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500">CPF</label>
                            <input name="sellerCpf" required onChange={handleCPFChange} placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                          </div>
                        </div>
                        <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                          <p className="font-bold text-sm">Comprador</p>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                            <input name="buyerName" required placeholder="Nome do comprador" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500">CPF</label>
                            <input name="buyerCpf" required onChange={handleCPFChange} placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                          <p className="font-bold text-sm">Proprietário</p>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                            <input name="ownerName" required placeholder="Nome do proprietário" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500">CPF</label>
                            <input name="ownerCpf" required onChange={handleCPFChange} placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                          </div>
                        </div>
                        <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                          <p className="font-bold text-sm">Inquilino</p>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                            <input name="tenantName" required placeholder="Nome do inquilino" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500">CPF</label>
                            <input name="tenantCpf" required onChange={handleCPFChange} placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                          </div>
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
          )}

          {view === 'edit' && currentInspection && (
            <motion.div 
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center justify-between md:justify-start gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => {
                      setView('dashboard');
                      setCurrentInspection(null);
                      setSelectedRoom(null);
                    }} icon={ArrowLeft} className="px-2 md:px-4">Painel</Button>
                    {currentInspection.status === 'completed' && (
                      <Button 
                        variant="secondary" 
                        onClick={() => generateReport(currentInspection)} 
                        icon={FileText}
                        className="text-xs py-1 px-3"
                      >
                        Gerar PDF
                      </Button>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => deleteInspection(currentInspection.id)} 
                    className="text-red-400 hover:text-red-500 p-2"
                    title="Excluir Vistoria"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
                
                <div className="text-left md:text-right bg-zinc-50 md:bg-transparent p-4 md:p-0 rounded-2xl border border-zinc-100 md:border-0">
                  <h2 className="text-lg md:text-xl font-bold text-zinc-900 leading-tight">
                    {currentInspection.property?.address || currentInspection.address}
                    {currentInspection.property?.complement && ` - ${currentInspection.property.complement}`}
                  </h2>
                  <div className="flex flex-col md:items-end gap-2 mt-1">
                    <p className="text-[10px] md:text-xs text-zinc-500 uppercase tracking-widest font-bold">
                      {currentInspection.type}
                      {currentInspection.property?.neighborhood && ` • ${currentInspection.property.neighborhood}`}
                      {currentInspection.property?.city && ` • ${currentInspection.property.city}`}
                    </p>
                    <button 
                      onClick={() => setIsEditingProperty(true)} 
                      className="flex items-center gap-1.5 text-brand-blue hover:text-brand-blue/80 transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                      <div className="p-1.5 bg-brand-blue/10 rounded-lg">
                        <Pencil size={12} />
                      </div>
                      <span>Editar Dados do Imóvel</span>
                    </button>
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
                  value={currentInspection.propertyDescription || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setCurrentInspection(prev => prev ? { ...prev, propertyDescription: newValue } : null);
                  }}
                  onBlur={(e) => updatePropertyDescription(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-zinc-200 focus:ring-1 focus:ring-brand-blue outline-none text-sm min-h-[120px] bg-zinc-50/50"
                />

                <div className="flex items-center gap-2 text-zinc-500 uppercase text-xs font-bold tracking-widest pt-4">
                  <FileText size={14} />
                  <span>Parecer do Vistoriador</span>
                </div>
                <textarea
                  placeholder="Descreva o parecer final da vistoria (ex: o imóvel encontra-se em perfeitas condições para entrega)..."
                  value={currentInspection.inspectorOpinion || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setCurrentInspection(prev => prev ? { ...prev, inspectorOpinion: newValue } : null);
                  }}
                  onBlur={(e) => updateInspectorOpinion(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-zinc-200 focus:ring-1 focus:ring-brand-blue outline-none text-sm min-h-[120px] bg-zinc-50/50"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Rooms List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Cômodos</h3>
                    <Button variant="ghost" onClick={() => setIsAddingRoom(true)} className="p-1"><Plus size={16} /></Button>
                  </div>
                  <div className="space-y-2">
                    {isAddingRoom && (
                      <div className="p-2 bg-white rounded-xl border border-brand-blue shadow-sm space-y-2">
                        <input 
                          autoFocus
                          placeholder="Nome do cômodo..."
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addRoom()}
                          className="w-full px-2 py-1 text-sm outline-none"
                        />
                        <div className="flex gap-1">
                          <Button className="flex-1 py-1 text-xs" onClick={addRoom} disabled={isAddingRoomLoading}>
                            {isAddingRoomLoading ? 'Salvando...' : 'Salvar'}
                          </Button>
                          <Button variant="secondary" className="flex-1 py-1 text-xs" onClick={() => setIsAddingRoom(false)} disabled={isAddingRoomLoading}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                    {rooms.map((room, index) => (
                      <div key={room.id} className="group relative">
                        {editingRoomId === room.id ? (
                          <div className="p-2 bg-white rounded-xl border-brand-blue border shadow-sm space-y-2">
                            <input 
                              autoFocus
                              placeholder="Nome do cômodo..."
                              value={editingRoomName}
                              onChange={(e) => setEditingRoomName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && updateRoom(room.id)}
                              className="w-full px-2 py-1 text-sm outline-none"
                            />
                            <div className="flex gap-1">
                              <button 
                                onClick={() => updateRoom(room.id)}
                                className="flex-1 py-1 text-xs bg-brand-blue text-white rounded-lg font-bold"
                              >
                                Salvar
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingRoomId(null);
                                  setEditingRoomName('');
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
                              onClick={() => setSelectedRoom(room)}
                              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all pr-24 ${selectedRoom?.id === room.id ? 'bg-brand-blue text-white shadow-lg' : 'bg-white border border-zinc-100 hover:border-zinc-300'}`}
                            >
                              {room.name}
                            </button>
                            <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100`}>
                              <div className="flex flex-col">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); moveRoom(index, 'up'); }}
                                  disabled={index === 0 || isMoving}
                                  className={`p-1 rounded disabled:opacity-10 ${selectedRoom?.id === room.id ? 'text-white/50 hover:text-white' : 'text-zinc-300 hover:text-brand-blue'}`}
                                >
                                  <ChevronUp size={16} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); moveRoom(index, 'down'); }}
                                  disabled={index === rooms.length - 1 || isMoving}
                                  className={`p-1 rounded disabled:opacity-10 ${selectedRoom?.id === room.id ? 'text-white/50 hover:text-white' : 'text-zinc-300 hover:text-brand-blue'}`}
                                >
                                  <ChevronDown size={16} />
                                </button>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingRoomId(room.id);
                                  setEditingRoomName(room.name || '');
                                }}
                                className={`p-1.5 rounded-lg transition-all ${selectedRoom?.id === room.id ? 'text-white/50 hover:text-white' : 'text-zinc-300 hover:text-brand-blue'}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRoom(room.id);
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
                  {!currentRoom ? (
                    <div className="h-64 flex flex-col items-center justify-center bg-zinc-100 rounded-3xl text-zinc-400 border border-dashed border-zinc-300">
                      <Info size={32} className="mb-2" />
                      <p>Selecione um cômodo para começar</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold">{currentRoom.name}</h3>
                        <Button onClick={() => setIsAddingItem(true)} icon={Plus} variant="secondary">Adicionar Item</Button>
                      </div>

                      <Card className="p-6 space-y-4 bg-zinc-50/50 border-dashed border-2 border-zinc-200">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Descrição do Ambiente</label>
                          <textarea
                            placeholder="Descreva o estado geral deste cômodo..."
                            value={currentRoom.description || ''}
                            onChange={(e) => updateRoomDetails(currentRoom.id, { description: e.target.value })}
                            className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-1 focus:ring-brand-blue outline-none text-sm min-h-[100px] bg-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Fotos do Ambiente</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {currentRoom.photos?.map((photo, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-zinc-200">
                                <img src={photo} alt={`Room ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button 
                                  onClick={() => removeRoomPhoto(currentRoom.id, idx)}
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
                                className="hidden" 
                                onChange={(e) => handleRoomPhotoUpload(currentRoom.id, e)} 
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
                              onChange={(e) => setNewItemName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addItem()}
                              className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue"
                            />
                            <div className="flex gap-2">
                              <Button className="flex-1" onClick={addItem} disabled={isAddingItemLoading}>
                                {isAddingItemLoading ? 'Adicionando...' : 'Adicionar'}
                              </Button>
                              <Button variant="secondary" className="flex-1" onClick={() => setIsAddingItem(false)} disabled={isAddingItemLoading}>Cancelar</Button>
                            </div>
                          </div>
                        </Card>
                      )}

                      <div className="space-y-4">
                        {items.map((item, index) => (
                          <Card key={item.id} className="p-6 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                {editingItemId === item.id ? (
                                  <div className="flex gap-2 items-center mb-2">
                                    <input 
                                      autoFocus
                                      value={editingItemName}
                                      onChange={(e) => setEditingItemName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          updateItem(item.id, { name: editingItemName });
                                          setEditingItemId(null);
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingItemId(null);
                                        }
                                      }}
                                      className="flex-1 px-3 py-1 text-lg font-bold border border-brand-blue rounded-lg outline-none"
                                    />
                                    <button 
                                      onClick={() => {
                                        updateItem(item.id, { name: editingItemName });
                                        setEditingItemId(null);
                                      }}
                                      className="p-2 bg-brand-blue text-white rounded-lg"
                                    >
                                      <Save size={16} />
                                    </button>
                                    <button 
                                      onClick={() => setEditingItemId(null)}
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
                                        setEditingItemId(item.id);
                                        setEditingItemName(item.name);
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
                                      onClick={() => updateItem(item.id, { condition: cond })}
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
                                    onClick={() => moveItem(index, 'up')}
                                    disabled={index === 0 || isMoving}
                                    className="p-1 rounded hover:bg-zinc-100 disabled:opacity-20 text-zinc-400 hover:text-brand-blue transition-all"
                                  >
                                    <ChevronUp size={16} />
                                  </button>
                                  <button 
                                    onClick={() => moveItem(index, 'down')}
                                    disabled={index === items.length - 1 || isMoving}
                                    className="p-1 rounded hover:bg-zinc-100 disabled:opacity-20 text-zinc-400 hover:text-brand-blue transition-all"
                                  >
                                    <ChevronDown size={16} />
                                  </button>
                                </div>
                                <Button variant="ghost" onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-500 p-2">
                                  <Trash2 size={18} />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <textarea
                                placeholder="Observações sobre o estado de conservação..."
                                value={item.description || ''}
                                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                className="w-full p-3 rounded-xl border border-zinc-100 focus:ring-1 focus:ring-brand-blue outline-none text-sm min-h-[80px]"
                              />

                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={item.hasFurniture || false} 
                                    onChange={(e) => updateItem(item.id, { hasFurniture: e.target.checked })}
                                    className="w-4 h-4 rounded border-zinc-300 text-brand-blue focus:ring-brand-blue"
                                  />
                                  <span className="text-sm font-medium">Existe avaria?</span>
                                </label>
                              </div>

                              {item.hasFurniture && (
                                <input
                                  placeholder="Descreva a avaria encontrada..."
                                  value={item.furnitureDescription || ''}
                                  onChange={(e) => updateItem(item.id, { furnitureDescription: e.target.value })}
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
                                      capture="environment"
                                      className="hidden" 
                                      onChange={(e) => handlePhotoUpload(item.id, e)} 
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
                                        onClick={() => removePhoto(item.id, idx)}
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
                                      className="hidden" 
                                      onChange={(e) => handlePhotoUpload(item.id, e)} 
                                    />
                                    <Plus size={20} />
                                  </label>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}

                        {items.length === 0 && (
                          <div className="text-center py-12 bg-white rounded-3xl border border-zinc-100">
                            <p className="text-zinc-500">Nenhum item registrado neste cômodo.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Mobile Nav */}
      {view === 'edit' && currentInspection && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-zinc-200 flex justify-center z-[100]">
          <Button 
            className="w-full max-w-md py-4 shadow-xl shadow-black/10" 
            icon={Save}
            onClick={async () => {
              try {
                await updateDoc(doc(db, 'inspections', currentInspection.id), { status: 'completed' });
                setView('dashboard');
                setCurrentInspection(null);
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `inspections/${currentInspection.id}`);
              }
            }}
          >
            Finalizar Vistoria
          </Button>
        </div>
      )}
    </div>
        <Modal 
          isOpen={isEditingProperty} 
          onClose={() => setIsEditingProperty(false)}
          title="Editar Dados do Imóvel"
        >
          {currentInspection && (
            <form onSubmit={handleUpdateProperty} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Endereço do Imóvel</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Endereço Completo</label>
                    <input name="address" required defaultValue={currentInspection.property?.address || currentInspection.address} placeholder="Rua, número, bairro..." className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Complemento</label>
                      <input name="complement" defaultValue={currentInspection.property?.complement} placeholder="Apto, Bloco..." className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Bairro</label>
                      <input name="neighborhood" required defaultValue={currentInspection.property?.neighborhood} placeholder="Bairro" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Cidade</label>
                      <input name="city" required defaultValue={currentInspection.property?.city} placeholder="Cidade" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">CEP</label>
                      <input name="cep" required onChange={handleCEPChange} defaultValue={currentInspection.property?.cep} placeholder="00000-000" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Vistoriador</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Nome</label>
                    <input name="inspectorName" required defaultValue={currentInspection.inspector?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">CPF</label>
                    <input name="inspectorCpf" required onChange={handleCPFChange} defaultValue={currentInspection.inspector?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Partes Envolvidas</h3>
                {currentInspection.type === 'venda' ? (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                      <p className="font-bold text-sm">Vendedor</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                        <input name="sellerName" required defaultValue={currentInspection.seller?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">CPF</label>
                        <input name="sellerCpf" required onChange={handleCPFChange} defaultValue={currentInspection.seller?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    </div>
                    <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                      <p className="font-bold text-sm">Comprador</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                        <input name="buyerName" required defaultValue={currentInspection.buyer?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">CPF</label>
                        <input name="buyerCpf" required onChange={handleCPFChange} defaultValue={currentInspection.buyer?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                      <p className="font-bold text-sm">Proprietário</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                        <input name="ownerName" required defaultValue={currentInspection.owner?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">CPF</label>
                        <input name="ownerCpf" required onChange={handleCPFChange} defaultValue={currentInspection.owner?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    </div>
                    <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                      <p className="font-bold text-sm">Inquilino</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                        <input name="tenantName" required defaultValue={currentInspection.tenant?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">CPF</label>
                        <input name="tenantCpf" required onChange={handleCPFChange} defaultValue={currentInspection.tenant?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button variant="ghost" type="button" onClick={() => setIsEditingProperty(false)}>Cancelar</Button>
                <Button type="submit" icon={Save}>Salvar Alterações</Button>
              </div>
            </form>
          )}
        </Modal>

        <AnimatePresence>
          {toast.isOpen && (
            <Toast 
              isOpen={toast.isOpen} 
              message={toast.message} 
              type={toast.type} 
            />
          )}
        </AnimatePresence>

        <Modal 
          isOpen={confirmModal.isOpen} 
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          title={confirmModal.title}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>Cancelar</Button>
              <Button variant="danger" onClick={confirmModal.onConfirm}>Excluir</Button>
            </>
          }
        >
          <p className="text-zinc-600">{confirmModal.message}</p>
        </Modal>
    </ErrorBoundary>
  );
}
