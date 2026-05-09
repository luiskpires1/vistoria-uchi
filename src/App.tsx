/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  ChevronDown,
  Copy,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { generateInspectionPDF } from './services/pdfService';
import { LoadingScreen } from './components/LoadingScreen';
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
  getDocs,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Inspection, 
  Room, 
  Item, 
  Property,
  PropertyVisit,
  InspectionType, 
  ItemCondition, 
  InspectionStatus 
} from './types';
import { 
  Button, 
  Card, 
  Badge, 
  Modal, 
  Toast, 
  Input, 
  Select,
  ErrorBoundary 
} from './components/UI';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import NewInspection from './components/NewInspection';
import InspectionEdit from './components/InspectionEdit';
import HomePage from './components/HomePage';
import Visits from './components/Visits';
import PropertyRegistration from './components/PropertyRegistration';
import PropertyDetails from './components/PropertyDetails';
import VisitRegistration from './components/VisitRegistration';
import VisitFeedback from './components/VisitFeedback';
import { VisitFeedbackData } from './types';

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

// --- Constants ---

const LOGO_URL = "/logo.png";
const DEFAULT_USER = { displayName: 'Uchi Imóveis', email: 'contato@uchiimoveis.com.br' };

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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Iniciando...');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editingVisit, setEditingVisit] = useState<PropertyVisit | null>(null);
  const [view, setView] = useState<'home' | 'dashboard' | 'visits' | 'new-property' | 'property-details' | 'new-visit' | 'visit-feedback' | 'new' | 'edit'>('home');
  const [currentInspection, setCurrentInspection] = useState<Inspection | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [isEditingInspectionData, setIsEditingInspectionData] = useState(false);
  const [localInspection, setLocalInspection] = useState<Inspection | null>(null);
  const [localRooms, setLocalRooms] = useState<Room[]>([]);
  const [localItems, setLocalItems] = useState<{ [roomId: string]: Item[] }>({});
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const selectedRoom = useMemo(() => localRooms.find(r => r.id === selectedRoomId) || null, [localRooms, selectedRoomId]);
  const [deletedRoomIds, setDeletedRoomIds] = useState<string[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<{ [roomId: string]: string[] }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    confirmText?: string;
    confirmVariant?: 'primary' | 'danger' | 'secondary' | 'ghost';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirmar',
    confirmVariant: 'primary'
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

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3000);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('uchi_logged_in');
    setIsLoggedIn(false);
  }, []);
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
  const [newInspectionStatus, setNewInspectionStatus] = useState<InspectionStatus>('draft');

  const currentRoom = view === 'edit'
    ? localRooms.find(r => r.id === selectedRoom?.id) || selectedRoom
    : rooms.find(r => r.id === selectedRoom?.id) || selectedRoom;

  const currentItems = view === 'edit'
    ? (selectedRoom ? localItems[selectedRoom.id] || [] : [])
    : items;

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
      img.onerror = () => resolve(base64Str); // Fallback to original if compression fails
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
    // Initial data fetching is handled by onSnapshot, which is real-time.
    // No need for a fake simulation that might appear after the app has already loaded.
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

  // Fetch Properties
  useEffect(() => {
    const q = query(
      collection(db, 'properties'), 
      orderBy('address', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
      setProperties(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'properties'));
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

  const createInspection = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const address = formData.get('address') as string;
    const complement = formData.get('complement') as string;
    const neighborhood = formData.get('neighborhood') as string;
    const city = formData.get('city') as string;
    const cep = formData.get('cep') as string;
    const type = formData.get('type') as InspectionType;
    const status = formData.get('status') as InspectionStatus;

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
        status,
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
  }, [user, showToast]);

  const saveInspection = useCallback(async () => {
    if (!localInspection) return;
    setIsSaving(true);
    try {
      const id = localInspection.id;
      
      // 1. Update main inspection doc
      const inspectionUpdate = { ...localInspection };
      delete (inspectionUpdate as any).id;
      await updateDoc(doc(db, 'inspections', id), inspectionUpdate);

      // 2. Handle deleted rooms
      for (const roomId of deletedRoomIds) {
        await deleteDoc(doc(db, `inspections/${id}/rooms`, roomId));
      }

      // 3. Handle rooms (add/update)
      for (const room of localRooms) {
        let roomId = room.id;
        const roomData = { ...room };
        delete (roomData as any).id;
        
        let finalRoomId = roomId;
        if (roomId.startsWith('temp-')) {
          const roomRef = await addDoc(collection(db, `inspections/${id}/rooms`), roomData);
          finalRoomId = roomRef.id;
        } else {
          await updateDoc(doc(db, `inspections/${id}/rooms`, roomId), roomData);
        }

        // 4. Handle deleted items for this room
        const deletedItems = deletedItemIds[roomId] || [];
        for (const itemId of deletedItems) {
          await deleteDoc(doc(db, `inspections/${id}/rooms/${finalRoomId}/items`, itemId));
        }

        // 5. Handle items (add/update)
        const items = localItems[roomId] || [];
        for (const item of items) {
          const itemData = { ...item };
          const itemId = itemData.id;
          delete (itemData as any).id;
          itemData.roomId = finalRoomId;

          if (itemId.startsWith('temp-')) {
            await addDoc(collection(db, `inspections/${id}/rooms/${finalRoomId}/items`), itemData);
          } else {
            await updateDoc(doc(db, `inspections/${id}/rooms/${finalRoomId}/items`, itemId), itemData);
          }
        }
      }

      setHasUnsavedChanges(false);
      showToast('Vistoria salva com sucesso!', 'success');
      setView('dashboard');
      setCurrentInspection(null);
      setSelectedRoomId(null);
    } catch (error) {
      console.error('Error saving inspection:', error);
      showToast('Erro ao salvar vistoria', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [localInspection, localRooms, localItems, deletedRoomIds, deletedItemIds, showToast]);

  const deleteProperty = useCallback((id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Imóvel',
      message: 'Tem certeza que deseja excluir este imóvel? Todas as visitas vinculadas serão perdidas.',
      confirmText: 'Excluir',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          await deleteDoc(doc(db, 'properties', id));
          showToast('Imóvel excluído com sucesso!', 'success');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `properties/${id}`);
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }, [showToast]);

  const deleteInspection = useCallback((id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Vistoria',
      message: 'Tem certeza que deseja excluir esta vistoria permanentemente?',
      confirmText: 'Excluir',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'inspections', id));
          if (currentInspection?.id === id) {
            setView('dashboard');
            setCurrentInspection(null);
            setSelectedRoomId(null);
          }
          showToast('Vistoria excluída com sucesso!', 'success');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `inspections/${id}`);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [currentInspection, showToast]);

  const duplicateInspection = useCallback(async (ins: Inspection) => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Iniciando duplicação...');
    try {
      // 1. Fetch all rooms for the source inspection
      setLoadingMessage('Buscando ambientes...');
      const roomsSnapshot = await getDocs(collection(db, `inspections/${ins.id}/rooms`));
      const roomsData = roomsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Room))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      
      const totalRooms = roomsData.length;
      // 2. Fetch all items for all rooms
      const itemsMap: { [roomId: string]: Item[] } = {};
      for (let i = 0; i < totalRooms; i++) {
        const room = roomsData[i];
        setLoadingMessage(`Carregando: ${room.name}...`);
        setLoadingProgress((i / totalRooms) * 40);
        
        const itemsSnapshot = await getDocs(collection(db, `inspections/${ins.id}/rooms/${room.id}/items`));
        itemsMap[room.id] = itemsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Item))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }

      setLoadingProgress(50);
      setLoadingMessage('Criando nova vistoria...');
      // 3. Create the new inspection
      const newInspectionData = {
        ...ins,
        address: `${ins.address} (Cópia)`,
        date: new Date().toISOString(),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Remove id before adding
      delete (newInspectionData as any).id;
      
      const inspectionRef = await addDoc(collection(db, 'inspections'), newInspectionData);
      const newInspectionId = inspectionRef.id;

      // 4. Create rooms and items in the new inspection
      for (let i = 0; i < totalRooms; i++) {
        const room = roomsData[i];
        setLoadingMessage(`Duplicando: ${room.name}...`);
        setLoadingProgress(50 + (i / totalRooms) * 50);
        
        const newRoomData = { ...room };
        delete (newRoomData as any).id;
        const roomRef = await addDoc(collection(db, `inspections/${newInspectionId}/rooms`), newRoomData);
        const newRoomId = roomRef.id;

        const items = itemsMap[room.id] || [];
        for (const item of items) {
          const newItemData = { ...item };
          delete (newItemData as any).id;
          await addDoc(collection(db, `inspections/${newInspectionId}/rooms/${newRoomId}/items`), newItemData);
        }
      }

      setLoadingProgress(100);
      setLoadingMessage('Vistoria duplicada com sucesso!');
      showToast('Vistoria duplicada com sucesso!', 'success');
      setLoading(false);
    } catch (error) {
      console.error('Error duplicating inspection:', error);
      showToast('Erro ao duplicar vistoria', 'error');
      setLoading(false);
    }
  }, [showToast]);

  const handleUpdateProperty = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!localInspection) return;

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

    if (localInspection.type === 'venda') {
      updateData.buyer = { name: buyerName, cpf: buyerCpf };
      updateData.seller = { name: sellerName, cpf: sellerCpf };
    } else {
      updateData.owner = { name: ownerName, cpf: ownerCpf };
      updateData.tenant = { name: tenantName, cpf: tenantCpf };
    }

    setLocalInspection({
      ...localInspection,
      ...updateData
    });

    setIsEditingProperty(false);
    setHasUnsavedChanges(true);
    showToast('Dados atualizados localmente. Clique em Salvar para persistir.', 'info');
  }, [localInspection, showToast]);

  const handleUpdateInspectionData = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!localInspection) return;

    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as InspectionType;
    const status = formData.get('status') as InspectionStatus;
    const date = formData.get('date') as string;

    setLocalInspection({
      ...localInspection,
      type,
      status,
      date: new Date(date + 'T12:00:00').toISOString()
    });

    setIsEditingInspectionData(false);
    setHasUnsavedChanges(true);
    showToast('Dados da vistoria atualizados localmente. Clique em Salvar para persistir.', 'info');
  }, [localInspection, showToast]);

  const addRoom = useCallback(() => {
    if (!localInspection || !newRoomName.trim()) return;

    const newRoom: Room = {
      id: `temp-${Date.now()}`,
      inspectionId: localInspection.id,
      name: newRoomName.trim(),
      order: localRooms.length
    };

    setLocalRooms([...localRooms, newRoom]);
    
    const defaultItems = ['Parede', 'Rodapé', 'Piso', 'Pintura', 'Portas', 'Janelas', 'Teto', 'Mobiliário'].sort((a, b) => a.localeCompare(b));
    const newItems: Item[] = defaultItems.map((name, i) => ({
      id: `temp-${Date.now()}-${i}`,
      roomId: newRoom.id,
      name,
      condition: 'bom',
      description: '',
      hasFurniture: false,
      photos: [],
      order: i
    }));

    setLocalItems(prev => ({ ...prev, [newRoom.id]: newItems }));
    setNewRoomName('');
    setIsAddingRoom(false);
    setHasUnsavedChanges(true);
  }, [localInspection, newRoomName, localRooms]);

  const deleteRoom = useCallback((roomId: string) => {
    if (!localInspection) return;
    setLocalRooms(localRooms.filter(r => r.id !== roomId));
    if (!roomId.startsWith('temp-')) {
      setDeletedRoomIds(prev => [...prev, roomId]);
    }
    if (selectedRoomId === roomId) {
      setSelectedRoomId(null);
    }
    setHasUnsavedChanges(true);
  }, [localInspection, localRooms, selectedRoomId]);

  const moveRoom = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    setLocalRooms(prev => {
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const newRooms = [...prev];
      const [movedRoom] = newRooms.splice(index, 1);
      newRooms.splice(newIndex, 0, movedRoom);
      return newRooms.map((r, i) => ({ ...r, order: i }));
    });
    setHasUnsavedChanges(true);
  }, []);

  const updateRoom = useCallback((roomId: string) => {
    if (!editingRoomName.trim()) return;
    setLocalRooms(prev => prev.map(r => r.id === roomId ? { ...r, name: editingRoomName.trim() } : r));
    setEditingRoomId(null);
    setEditingRoomName('');
    setHasUnsavedChanges(true);
  }, [editingRoomName]);

  const updatePropertyDescription = useCallback((description: string) => {
    setLocalInspection(prev => prev ? { ...prev, propertyDescription: description } : null);
    setHasUnsavedChanges(true);
  }, []);

  const updateInspectorOpinion = useCallback((opinion: string) => {
    setLocalInspection(prev => prev ? { ...prev, inspectorOpinion: opinion } : null);
    setHasUnsavedChanges(true);
  }, []);

  const updateRevisions = useCallback((revisions: any[]) => {
    setLocalInspection(prev => prev ? { ...prev, revisions } : null);
    setHasUnsavedChanges(true);
  }, []);

  const handleRevisionPhotoUpload = useCallback(async (revisionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !localInspection) return;

    setLoading(true);
    setLoadingMessage('Processando fotos da revisão...');
    try {
      const revisions = localInspection.revisions || [];
      const revision = revisions.find(r => r.id === revisionId);
      const currentPhotos = revision?.photos || [];
      
      if (currentPhotos.length + files.length > 10) {
        showToast('Limite de 10 fotos por revisão atingido.', 'error');
        if (currentPhotos.length >= 10) return;
      }

      const newPhotos: string[] = [...currentPhotos];
      const filesToProcess = Array.from(files).slice(0, 10 - currentPhotos.length) as File[];

      for (const file of filesToProcess) {
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
          reader.onloadend = async () => {
            const base64String = reader.result as string;
            const compressedBase64 = await compressImage(base64String);
            resolve(compressedBase64);
          };
        });
        reader.readAsDataURL(file);
        const compressed = await promise;
        newPhotos.push(compressed);
      }

      const updatedRevisions = revisions.map(r => 
        r.id === revisionId ? { ...r, photos: newPhotos } : r
      );
      updateRevisions(updatedRevisions);
    } catch (error) {
      console.error('Error uploading revision photo:', error);
      showToast('Erro ao processar fotos', 'error');
    } finally {
      setLoading(false);
    }
  }, [localInspection, showToast, updateRevisions]);

  const addPriceHistory = useCallback(async (propertyId: string, value: number, date: string) => {
    try {
      setLoading(true);
      const property = properties.find(p => p.id === propertyId);
      if (!property) return;

      const newHistory = {
        id: `price-${Date.now()}`,
        value,
        date
      };

      const updatedHistory = [...(property.priceHistory || []), newHistory];
      await updateDoc(doc(db, 'properties', propertyId), {
        priceHistory: updatedHistory,
        updatedAt: serverTimestamp()
      });
      showToast('Preço registrado com sucesso!', 'success');
      // Update selectedProperty to reflect changes immediately
      setSelectedProperty(prev => prev ? { ...prev, priceHistory: updatedHistory } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `properties/${propertyId}`);
    } finally {
      setLoading(false);
    }
  }, [properties, showToast]);

  const deletePriceHistory = useCallback(async (propertyId: string, historyId: string) => {
    try {
      setLoading(true);
      const property = properties.find(p => p.id === propertyId);
      if (!property) return;

      const updatedHistory = (property.priceHistory || []).filter(h => h.id !== historyId);
      await updateDoc(doc(db, 'properties', propertyId), {
        priceHistory: updatedHistory,
        updatedAt: serverTimestamp()
      });
      showToast('Registro de preço excluído!', 'info');
      // Update selectedProperty to reflect changes immediately
      setSelectedProperty(prev => prev ? { ...prev, priceHistory: updatedHistory } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `properties/${propertyId}`);
    } finally {
      setLoading(false);
    }
  }, [properties, showToast]);

  const updateRoomDetails = useCallback((roomId: string, updates: Partial<Room>) => {
    setLocalRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updates } : r));
    setHasUnsavedChanges(true);
  }, []);

  const handleRoomPhotoUpload = useCallback(async (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setLoadingMessage('Processando fotos...');
    try {
      const room = localRooms.find(r => r.id === roomId);
      const currentPhotos = room?.photos || [];
      
      if (currentPhotos.length + files.length > 10) {
        showToast('Limite de 10 fotos por ambiente atingido.', 'error');
        if (currentPhotos.length >= 10) return;
      }

      const newPhotos: string[] = [...currentPhotos];
      const filesToProcess = Array.from(files).slice(0, 10 - currentPhotos.length) as File[];

      for (const file of filesToProcess) {
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
          reader.onloadend = async () => {
            const base64String = reader.result as string;
            const compressedBase64 = await compressImage(base64String);
            resolve(compressedBase64);
          };
        });
        reader.readAsDataURL(file);
        const compressed = await promise;
        newPhotos.push(compressed);
      }

      updateRoomDetails(roomId, { photos: newPhotos });
    } catch (error) {
      console.error('Error uploading room photo:', error);
      showToast('Erro ao processar fotos', 'error');
    } finally {
      setLoading(false);
    }
  }, [localRooms, showToast, updateRoomDetails]);

  const removeRoomPhoto = useCallback((roomId: string, photoIndex: number) => {
    setLocalRooms(prev => prev.map(r => {
      if (r.id === roomId && r.photos) {
        const newPhotos = [...r.photos];
        newPhotos.splice(photoIndex, 1);
        return { ...r, photos: newPhotos };
      }
      return r;
    }));
    setHasUnsavedChanges(true);
  }, []);

  const addItem = useCallback(() => {
    if (!localInspection || !selectedRoom || !newItemName.trim()) return;

    const newItem: Item = {
      id: `temp-${Date.now()}`,
      roomId: selectedRoom.id,
      name: newItemName.trim(),
      condition: 'bom',
      description: '',
      hasFurniture: false,
      photos: [],
      order: (localItems[selectedRoom.id] || []).length
    };

    setLocalItems(prev => ({
      ...prev,
      [selectedRoom.id]: [...(prev[selectedRoom.id] || []), newItem]
    }));
    setNewItemName('');
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
  }, [localInspection, selectedRoom, newItemName, localItems]);

  const updateItem = useCallback((itemId: string, updates: Partial<Item>) => {
    if (!selectedRoom) return;
    setLocalItems(prev => ({
      ...prev,
      [selectedRoom.id]: (prev[selectedRoom.id] || []).map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
    setHasUnsavedChanges(true);
  }, [selectedRoom]);

  const deleteItem = useCallback((itemId: string) => {
    if (!selectedRoom) return;
    setLocalItems(prev => ({
      ...prev,
      [selectedRoom.id]: (prev[selectedRoom.id] || []).filter(item => item.id !== itemId)
    }));
    if (!itemId.startsWith('temp-')) {
      setDeletedItemIds(prev => ({
        ...prev,
        [selectedRoom.id]: [...(prev[selectedRoom.id] || []), itemId]
      }));
    }
    setHasUnsavedChanges(true);
  }, [selectedRoom]);

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    if (!selectedRoom) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const roomItems = localItems[selectedRoom.id] || [];
    if (newIndex < 0 || newIndex >= roomItems.length) return;

    const newItems = [...roomItems];
    const [movedItem] = newItems.splice(index, 1);
    newItems.splice(newIndex, 0, movedItem);
    
    setLocalItems(prev => ({
      ...prev,
      [selectedRoom.id]: newItems.map((item, i) => ({ ...item, order: i }))
    }));
    setHasUnsavedChanges(true);
  }, [selectedRoom, localItems]);

  const handlePhotoUpload = useCallback(async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedRoom) return;

    setLoading(true);
    setLoadingMessage('Processando fotos...');
    try {
      const roomItems = localItems[selectedRoom.id] || [];
      const item = roomItems.find(i => i.id === itemId);
      const currentPhotos = item?.photos || [];
      
      if (currentPhotos.length + files.length > 10) {
        showToast('Limite de 10 fotos por item atingido.', 'error');
        if (currentPhotos.length >= 10) return;
      }

      const newPhotos: string[] = [...currentPhotos];
      const filesToProcess = Array.from(files).slice(0, 10 - currentPhotos.length) as File[];

      for (const file of filesToProcess) {
        const reader = new FileReader();
        const promise = new Promise<string>((resolve) => {
          reader.onloadend = async () => {
            const base64String = reader.result as string;
            const compressedBase64 = await compressImage(base64String);
            resolve(compressedBase64);
          };
        });
        reader.readAsDataURL(file);
        const compressed = await promise;
        newPhotos.push(compressed);
      }

      updateItem(itemId, { photos: newPhotos });
    } catch (error) {
      console.error('Error uploading item photo:', error);
      showToast('Erro ao processar fotos', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedRoom, localItems, showToast, updateItem]);

  const handleEditInspection = useCallback(async (ins: Inspection) => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Carregando vistoria...');
    try {
      // Fetch all rooms
      setLoadingMessage('Buscando ambientes...');
      const roomsSnapshot = await getDocs(collection(db, `inspections/${ins.id}/rooms`));
      const roomsData = roomsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Room))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      
      const totalRooms = roomsData.length;
      // Fetch all items for all rooms
      const itemsMap: { [roomId: string]: Item[] } = {};
      for (let i = 0; i < totalRooms; i++) {
        const room = roomsData[i];
        setLoadingMessage(`Carregando: ${room.name}...`);
        setLoadingProgress((i / totalRooms) * 100);
        
        const itemsSnapshot = await getDocs(collection(db, `inspections/${ins.id}/rooms/${room.id}/items`));
        itemsMap[room.id] = itemsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Item))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      
      setLocalInspection({ ...ins });
      setLocalRooms(roomsData);
      setLocalItems(itemsMap);
      setDeletedRoomIds([]);
      setDeletedItemIds({});
      setHasUnsavedChanges(false);
      
      setCurrentInspection(ins);
      setView('edit');
      setLoading(false);
    } catch (error) {
      console.error('Error loading inspection:', error);
      showToast('Erro ao carregar dados da vistoria', 'error');
      setLoading(false);
    }
  }, [showToast]);

  const handleBackToDashboard = useCallback(() => {
    if (hasUnsavedChanges) {
      setConfirmModal({
        isOpen: true,
        title: 'Sair sem Salvar',
        message: 'Existem alterações não salvas. Deseja realmente sair sem salvar?',
        confirmText: 'Sair sem Salvar',
        confirmVariant: 'danger',
        onConfirm: () => {
          setView('dashboard');
          setLocalInspection(null);
          setLocalRooms([]);
          setLocalItems({});
          setSelectedRoomId(null);
          setHasUnsavedChanges(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      setView('dashboard');
      setLocalInspection(null);
      setLocalRooms([]);
      setLocalItems({});
      setSelectedRoomId(null);
    }
  }, [hasUnsavedChanges]);

  const handleSaveWithConfirmation = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Salvar Vistoria',
      message: 'Deseja salvar os dados inseridos nesta vistoria?',
      confirmText: 'Salvar',
      confirmVariant: 'primary',
      onConfirm: () => {
        saveInspection();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [saveInspection]);

  const generateReport = useCallback(async (ins: Inspection) => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Iniciando geração do relatório...');
    try {
      let roomsWithItems: any[] = [];

      // If we are currently editing THIS inspection, use the local state to include unsaved changes
      if (view === 'edit' && localInspection?.id === ins.id) {
        setLoadingMessage('Preparando dados locais...');
        const total = localRooms.length;
        roomsWithItems = localRooms.map((room, index) => {
          setLoadingProgress((index / total) * 50);
          return {
            ...room,
            items: localItems[room.id] || []
          };
        });
      } else {
        // Fetch all rooms from Firestore
        setLoadingMessage('Buscando ambientes...');
        const roomsSnapshot = await getDocs(collection(db, `inspections/${ins.id}/rooms`));
        const roomsData = roomsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Room))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        
        const totalRooms = roomsData.length;
        // Fetch all items for all rooms
        for (let i = 0; i < totalRooms; i++) {
          const room = roomsData[i];
          setLoadingMessage(`Carregando: ${room.name}...`);
          setLoadingProgress((i / totalRooms) * 60);
          
          const itemsSnapshot = await getDocs(collection(db, `inspections/${ins.id}/rooms/${room.id}/items`));
          const items = itemsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Item))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          
          roomsWithItems.push({
            ...room,
            items
          });
        }
      }

      setLoadingProgress(70);
      setLoadingMessage('Gerando PDF...');
      
      const reportData = {
        ...ins,
        rooms: roomsWithItems
      };

      await generateInspectionPDF(reportData as any);
      setLoadingProgress(100);
      setLoadingMessage('Relatório concluído!');
      showToast('Relatório gerado com sucesso!', 'success');
      setLoading(false);
    } catch (error) {
      console.error('Error generating report:', error);
      showToast('Erro ao gerar relatório', 'error');
      setLoading(false);
    }
  }, [view, localInspection, localRooms, localItems, showToast]);

  const removePhoto = useCallback((itemId: string, photoIndex: number) => {
    if (!selectedRoom) return;
    const roomId = selectedRoom.id;
    setLocalItems(prev => {
      const roomItems = prev[roomId] || [];
      const newItems = roomItems.map(item => {
        if (item.id === itemId) {
          const newPhotos = [...item.photos];
          newPhotos.splice(photoIndex, 1);
          return { ...item, photos: newPhotos };
        }
        return item;
      });
      return { ...prev, [roomId]: newItems };
    });
    setHasUnsavedChanges(true);
  }, [selectedRoom]);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-50 text-brand-blue font-sans pb-32">
        <AnimatePresence>
          {loading && (
            <LoadingScreen 
              progress={loadingProgress} 
              message={loadingMessage} 
              logoUrl={LOGO_URL} 
            />
          )}
        </AnimatePresence>

        {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView('home')}
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-brand-blue/10 group-hover:shadow-md transition-all bg-white flex items-center justify-center p-1">
            <img 
              src={LOGO_URL} 
              alt="Uchi Vistorias Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to home icon if image fails
                (e.target as any).style.display = 'none';
                (e.target as any).parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-brand-blue/10"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#003a5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>';
              }}
            />
          </div>
          <span className="font-bold text-xl tracking-tight group-hover:text-brand-blue transition-colors">Portal Uchi</span>
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
          {view === 'home' && (
            <HomePage 
              onSelectInspections={() => setView('dashboard')}
              onSelectVisits={() => setView('visits')}
            />
          )}

          {view === 'visits' && (
            <Visits 
              onBack={() => setView('home')}
              onAddProperty={() => {
                setEditingProperty(null);
                setView('new-property');
              }}
              onEditProperty={(prop) => {
                setEditingProperty(prop);
                setView('new-property');
              }}
              onDeleteProperty={(id) => deleteProperty(id)}
              onSelectProperty={(prop) => {
                setSelectedProperty(prop);
                setView('property-details');
              }}
              properties={properties}
            />
          )}

          {view === 'property-details' && selectedProperty && (
            <PropertyDetails 
              property={selectedProperty}
              onBack={() => setView('visits')}
              onEditProperty={(property) => {
                setEditingProperty(property);
                setView('new-property');
              }}
              onAddVisit={() => {
                setEditingVisit(null);
                setView('new-visit');
              }}
              onEditVisit={(visit) => {
                setEditingVisit(visit);
                setView('new-visit');
              }}
              onDeleteVisit={(visitId) => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Excluir Visita',
                  message: 'Tem certeza que deseja excluir esta visita?',
                  confirmText: 'Excluir',
                  confirmVariant: 'danger',
                  onConfirm: async () => {
                    try {
                      setLoading(true);
                      await deleteDoc(doc(db, 'properties', selectedProperty.id, 'visits', visitId));
                      showToast('Visita excluída com sucesso!', 'success');
                    } catch (error) {
                      handleFirestoreError(error, OperationType.DELETE, `properties/${selectedProperty.id}/visits/${visitId}`);
                    } finally {
                      setLoading(false);
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                  }
                });
              }}
              onVisitFeedback={(visit) => {
                setEditingVisit(visit);
                setView('visit-feedback');
              }}
              onAddPriceHistory={addPriceHistory}
              onDeletePriceHistory={deletePriceHistory}
            />
          )}

          {view === 'new-visit' && selectedProperty && (
            <VisitRegistration 
              property={selectedProperty}
              initialData={editingVisit}
              onBack={() => setView('property-details')}
              onSave={async (data) => {
                try {
                  setLoading(true);
                  if (editingVisit) {
                    await updateDoc(doc(db, 'properties', selectedProperty.id, 'visits', editingVisit.id), {
                      ...data,
                      updatedAt: serverTimestamp()
                    });
                    showToast('Visita atualizada com sucesso!', 'success');
                  } else {
                    await addDoc(collection(db, 'properties', selectedProperty.id, 'visits'), {
                      ...data,
                      createdAt: serverTimestamp()
                    });
                    showToast('Visita adicionada com sucesso!', 'success');
                  }
                  setView('property-details');
                } catch (error) {
                  handleFirestoreError(error, editingVisit ? OperationType.UPDATE : OperationType.CREATE, `properties/${selectedProperty.id}/visits`);
                } finally {
                  setLoading(false);
                }
              }}
            />
          )}

          {view === 'visit-feedback' && selectedProperty && editingVisit && (
            <VisitFeedback
              property={selectedProperty}
              visit={editingVisit}
              onBack={() => setView('property-details')}
              isSaving={isSaving}
              onSave={async (feedback) => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Salvar Feedback',
                  message: 'Deseja salvar o feedback desta visita?',
                  confirmText: 'Salvar',
                  confirmVariant: 'primary',
                  onConfirm: async () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    try {
                      setLoading(true);
                      await updateDoc(doc(db, 'properties', selectedProperty.id, 'visits', editingVisit.id), {
                        feedback,
                        updatedAt: serverTimestamp()
                      });
                      showToast('Feedback salvo com sucesso!', 'success');
                      setView('property-details');
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, `properties/${selectedProperty.id}/visits/${editingVisit.id}`);
                    } finally {
                      setLoading(false);
                    }
                  }
                });
              }}
            />
          )}

          {view === 'new-property' && (
            <PropertyRegistration 
              onBack={() => setView('visits')}
              initialData={editingProperty}
              onSave={async (data) => {
                try {
                  setLoading(true);
                  if (editingProperty) {
                    const { id, ...updateData } = data;
                    await updateDoc(doc(db, 'properties', id), {
                      ...updateData,
                      updatedAt: serverTimestamp()
                    });
                    showToast('Imóvel atualizado com sucesso!', 'success');
                  } else {
                    await addDoc(collection(db, 'properties'), {
                      ...data,
                      createdAt: serverTimestamp()
                    });
                    showToast('Imóvel cadastrado com sucesso!', 'success');
                  }
                  setView('visits');
                } catch (error) {
                  handleFirestoreError(error, editingProperty ? OperationType.UPDATE : OperationType.CREATE, 'properties');
                } finally {
                  setLoading(false);
                }
              }}
            />
          )}

          {view === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-start">
                <Button variant="secondary" onClick={() => setView('home')} icon={ArrowLeft}>Voltar ao Início</Button>
              </div>
              <Dashboard 
                inspections={inspections}
                onNewInspection={() => setView('new')}
                onEditInspection={handleEditInspection}
                onDeleteInspection={deleteInspection}
                onDuplicateInspection={duplicateInspection}
                onGenerateReport={generateReport}
              />
            </div>
          )}

          {view === 'new' && (
            <NewInspection 
              onBack={() => setView('dashboard')}
              onSubmit={createInspection}
              inspectionType={newInspectionType}
              onTypeChange={setNewInspectionType}
              inspectionStatus={newInspectionStatus}
              onStatusChange={setNewInspectionStatus}
              onCPFChange={handleCPFChange}
              onCEPChange={handleCEPChange}
              isCreating={isCreating}
            />
          )}

          {view === 'edit' && localInspection && (
            <InspectionEdit 
              localInspection={localInspection}
              localRooms={localRooms}
              localItems={localItems}
              selectedRoom={selectedRoom}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={isSaving}
              isAddingRoom={isAddingRoom}
              newRoomName={newRoomName}
              isAddingRoomLoading={isAddingRoomLoading}
              editingRoomId={editingRoomId}
              editingRoomName={editingRoomName}
              isAddingItem={isAddingItem}
              newItemName={newItemName}
              isAddingItemLoading={isAddingItemLoading}
              editingItemId={editingItemId}
              editingItemName={editingItemName}
              isMoving={isMoving}
              onBack={handleBackToDashboard}
              onGenerateReport={generateReport}
              onDeleteInspection={deleteInspection}
              onEditProperty={() => setIsEditingProperty(true)}
              onEditInspectionData={() => setIsEditingInspectionData(true)}
              onUpdateStatus={(status) => {
                setLocalInspection(prev => prev ? { ...prev, status } : null);
                setHasUnsavedChanges(true);
              }}
              onUpdatePropertyDescription={updatePropertyDescription}
              onUpdateInspectorOpinion={updateInspectorOpinion}
              onUpdateRevisions={updateRevisions}
              onRevisionPhotoUpload={handleRevisionPhotoUpload}
              onAddRoom={addRoom}
              onSetIsAddingRoom={setIsAddingRoom}
              onSetNewRoomName={setNewRoomName}
              onUpdateRoom={updateRoom}
              onSetEditingRoomId={setEditingRoomId}
              onSetEditingRoomName={setEditingRoomName}
              onDeleteRoom={deleteRoom}
              onMoveRoom={moveRoom}
              onSelectRoom={(room) => setSelectedRoomId(room?.id || null)}
              onUpdateRoomDetails={updateRoomDetails}
              onRemoveRoomPhoto={removeRoomPhoto}
              onRoomPhotoUpload={handleRoomPhotoUpload}
              onAddItem={addItem}
              onSetIsAddingItem={setIsAddingItem}
              onSetNewItemName={setNewItemName}
              onUpdateItem={updateItem}
              onDeleteItem={deleteItem}
              onMoveItem={moveItem}
              onSetEditingItemId={setEditingItemId}
              onSetEditingItemName={setEditingItemName}
              onPhotoUpload={handlePhotoUpload}
              onRemovePhoto={removePhoto}
              onSave={handleSaveWithConfirmation}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Mobile Nav */}
      {view === 'edit' && localInspection && !isEditingProperty && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-zinc-200 flex justify-center z-[100]">
          <Button 
            className="w-full max-w-md py-4 shadow-xl shadow-black/10" 
            icon={Save}
            disabled={isSaving}
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Salvar Vistoria',
                message: 'Deseja salvar os dados inseridos nesta vistoria?',
                confirmText: 'Salvar',
                confirmVariant: 'primary',
                onConfirm: () => {
                  saveInspection();
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
              });
            }}
          >
            {isSaving ? 'Salvando...' : 'Salvar Vistoria'}
          </Button>
        </div>
      )}
    </div>
        <Modal 
          isOpen={isEditingProperty} 
          onClose={() => setIsEditingProperty(false)}
          title="Editar Dados do Imóvel"
        >
          {localInspection && (
            <form onSubmit={handleUpdateProperty} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Endereço do Imóvel</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Endereço Completo</label>
                    <input name="address" required defaultValue={localInspection.property?.address || localInspection.address} placeholder="Rua, número, bairro..." className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Complemento</label>
                      <input name="complement" defaultValue={localInspection.property?.complement} placeholder="Apto, Bloco..." className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Bairro</label>
                      <input name="neighborhood" required defaultValue={localInspection.property?.neighborhood} placeholder="Bairro" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">Cidade</label>
                      <input name="city" required defaultValue={localInspection.property?.city} placeholder="Cidade" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-700">CEP</label>
                      <input name="cep" required onChange={handleCEPChange} defaultValue={localInspection.property?.cep} placeholder="00000-000" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Vistoriador</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">Nome</label>
                    <input name="inspectorName" required defaultValue={localInspection.inspector?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-700">CPF</label>
                    <input name="inspectorCpf" required onChange={handleCPFChange} defaultValue={localInspection.inspector?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Partes Envolvidas</h3>
                {localInspection.type === 'venda' ? (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                      <p className="font-bold text-sm">Vendedor</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                        <input name="sellerName" required defaultValue={localInspection.seller?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">CPF</label>
                        <input name="sellerCpf" required onChange={handleCPFChange} defaultValue={localInspection.seller?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    </div>
                    <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                      <p className="font-bold text-sm">Comprador</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                        <input name="buyerName" required defaultValue={localInspection.buyer?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">CPF</label>
                        <input name="buyerCpf" required onChange={handleCPFChange} defaultValue={localInspection.buyer?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                      <p className="font-bold text-sm">Proprietário</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                        <input name="ownerName" required defaultValue={localInspection.owner?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">CPF</label>
                        <input name="ownerCpf" required onChange={handleCPFChange} defaultValue={localInspection.owner?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                    </div>
                    <div className="space-y-4 p-4 bg-zinc-50 rounded-2xl">
                      <p className="font-bold text-sm">Inquilino</p>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">Nome Completo</label>
                        <input name="tenantName" required defaultValue={localInspection.tenant?.name} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-500">CPF</label>
                        <input name="tenantCpf" required onChange={handleCPFChange} defaultValue={localInspection.tenant?.cpf} className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue" />
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
          isOpen={isEditingInspectionData}
          onClose={() => setIsEditingInspectionData(false)}
          title="Editar Dados da Vistoria"
        >
          {localInspection && (
            <form onSubmit={handleUpdateInspectionData} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Tipo de Vistoria</label>
                  <Select 
                    name="type"
                    defaultValue={localInspection.type}
                    options={[
                      { value: 'entrada', label: 'Vistoria de Entrada' },
                      { value: 'saida', label: 'Vistoria de Saída' },
                      { value: 'rotina', label: 'Vistoria de Rotina' },
                      { value: 'venda', label: 'Vistoria de Venda' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Status</label>
                  <Select 
                    name="status"
                    defaultValue={localInspection.status}
                    options={[
                      { value: 'draft', label: 'Em andamento' },
                      { value: 'completed', label: 'Finalizada' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">Data da Vistoria</label>
                  <input 
                    name="date" 
                    type="date"
                    required 
                    defaultValue={localInspection.date ? localInspection.date.split('T')[0] : new Date().toISOString().split('T')[0]} 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue font-sans" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button variant="ghost" type="button" onClick={() => setIsEditingInspectionData(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>
          )}
        </Modal>

        <Modal 
          isOpen={confirmModal.isOpen} 
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          title={confirmModal.title}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>Cancelar</Button>
              <Button variant={confirmModal.confirmVariant || 'primary'} onClick={confirmModal.onConfirm}>
                {confirmModal.confirmText || 'Confirmar'}
              </Button>
            </>
          }
        >
          <p className="text-zinc-600">{confirmModal.message}</p>
        </Modal>
    </ErrorBoundary>
  );
}
