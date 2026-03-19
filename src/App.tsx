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
  AnimatePresence 
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
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${variants[variant]}`}>
      {children}
    </span>
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
  const [newRoomName, setNewRoomName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');
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

  const handleLogin = async () => {
    // Login removed as per user request
  };

  const handleLogout = () => {
    // Logout removed as per user request
  };

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
      alert("Você precisa estar autenticado para criar uma vistoria. Verifique se o login anônimo está ativo ou entre com sua conta Google.");
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
      const defaultRooms = ['Quarto', 'Cozinha', 'Sala', 'Banheiro'].sort((a, b) => a.localeCompare(b));
      const defaultItems = ['Parede', 'Rodapé', 'Piso', 'Pintura', 'Portas', 'Janelas', 'Teto', 'Mobiliário'].sort((a, b) => a.localeCompare(b));
      
      for (let i = 0; i < defaultRooms.length; i++) {
        const roomRef = await addDoc(collection(db, `inspections/${docRef.id}/rooms`), {
          inspectionId: docRef.id,
          name: defaultRooms[i],
          order: i
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

  const deleteInspection = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inspections', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `inspections/${id}`);
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
    if (!currentInspection) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rooms.length) return;

    const roomA = rooms[index];
    const roomB = rooms[newIndex];

    try {
      await updateDoc(doc(db, `inspections/${currentInspection.id}/rooms`, roomA.id), {
        order: newIndex
      });
      await updateDoc(doc(db, `inspections/${currentInspection.id}/rooms`, roomB.id), {
        order: index
      });
    } catch (error) {
      console.error('Error moving room:', error);
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
      alert('Erro ao gerar o laudo em PDF. Tente novamente.');
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
      alert('Limite de 10 fotos por ambiente atingido para evitar erros de armazenamento.');
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
    if (!currentInspection || !selectedRoom) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const itemA = items[index];
    const itemB = items[newIndex];

    try {
      await updateDoc(doc(db, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items`, itemA.id), {
        order: newIndex
      });
      await updateDoc(doc(db, `inspections/${currentInspection.id}/rooms/${selectedRoom.id}/items`, itemB.id), {
        order: index
      });
    } catch (error) {
      console.error('Error moving item:', error);
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
      alert('Limite de 10 fotos por item atingido para evitar erros de armazenamento.');
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
      <div className="min-h-screen bg-zinc-50 text-brand-blue font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200">
            <img 
              src="/logo.png" 
              alt="Uchi Vistorias Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="font-bold text-xl tracking-tight">Uchi Vistorias</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-medium text-brand-blue">{user.displayName}</p>
            <p className="text-[10px] text-zinc-500">{user.email}</p>
          </div>
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
                      <div className="p-5 flex items-center justify-between" onClick={() => {
                        setCurrentInspection(ins);
                        setView('edit');
                      }}>
                        <div className="flex gap-4 items-start">
                          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors">
                            <MapPin size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">
                              {ins.property?.address || ins.address}
                              {ins.property?.complement && ` - ${ins.property.complement}`}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
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
                        <input name="cep" required placeholder="00000-000" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
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
                        <input name="inspectorCpf" required placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
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
                            <input name="sellerCpf" required placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
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
                            <input name="buyerCpf" required placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
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
                            <input name="ownerCpf" required placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
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
                            <input name="tenantCpf" required placeholder="000.000.000-00" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => {
                    setView('dashboard');
                    setCurrentInspection(null);
                    setSelectedRoom(null);
                  }} icon={ArrowLeft}>Painel</Button>
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
                <div className="text-right">
                  <h2 className="text-xl font-bold">
                    {currentInspection.property?.address || currentInspection.address}
                    {currentInspection.property?.complement && ` - ${currentInspection.property.complement}`}
                  </h2>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                    {currentInspection.type}
                    {currentInspection.property?.neighborhood && ` • ${currentInspection.property.neighborhood}`}
                    {currentInspection.property?.city && ` • ${currentInspection.property.city}`}
                  </p>
                </div>
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
                            <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 transition-all opacity-0 group-hover:opacity-100`}>
                              <div className="flex flex-col">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); moveRoom(index, 'up'); }}
                                  disabled={index === 0}
                                  className={`p-0.5 rounded disabled:opacity-10 ${selectedRoom?.id === room.id ? 'text-white/50 hover:text-white' : 'text-zinc-300 hover:text-brand-blue'}`}
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); moveRoom(index, 'down'); }}
                                  disabled={index === rooms.length - 1}
                                  className={`p-0.5 rounded disabled:opacity-10 ${selectedRoom?.id === room.id ? 'text-white/50 hover:text-white' : 'text-zinc-300 hover:text-brand-blue'}`}
                                >
                                  <ChevronDown size={14} />
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
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={14} />
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
                              <div className="space-y-1">
                                <h4 className="font-bold text-lg">{item.name}</h4>
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
                                    disabled={index === 0}
                                    className="p-1 rounded hover:bg-zinc-100 disabled:opacity-20 text-zinc-400 hover:text-brand-blue transition-all"
                                  >
                                    <ChevronUp size={16} />
                                  </button>
                                  <button 
                                    onClick={() => moveItem(index, 'down')}
                                    disabled={index === items.length - 1}
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
                                        className="absolute top-1 right-1 bg-brand-blue/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-zinc-200 flex justify-center">
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
    </ErrorBoundary>
  );
}
