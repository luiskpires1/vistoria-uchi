export type InspectionType = 'entrada' | 'saida' | 'rotina' | 'venda';
export type ItemCondition = 'novo' | 'bom' | 'regular' | 'ruim';
export type InspectionStatus = 'draft' | 'completed';

export interface Person {
  name: string;
  cpf: string;
}

export interface PriceHistory {
  id: string;
  value: number;
  date: string;
}

export interface Property {
  id: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  cep: string;
  ownerName: string;
  ownerPhone: string;
  priceHistory?: PriceHistory[];
}

export interface VisitFeedbackData {
  propertySize: { rating: number; observation: string };
  roomLayout: { rating: number; observation: string };
  furniture: { rating: number; observation: string };
  appliances: { rating: number; observation: string };
  lighting: { rating: number; observation: string };
  parking: { rating: number; observation: string };
  price: { rating: number; observation: string };
  propertyQualities?: string;
  propertyDefects?: string;
  generalObservations?: string;
}

export interface PropertyVisit {
  id: string;
  propertyId: string;
  visitorName: string;
  visitorPhone: string;
  leadSource?: string;
  brokerName: string;
  interest: 'compra' | 'locação';
  visitDate: string;
  visitTime: string;
  createdAt: any;
  feedback?: VisitFeedbackData;
}

export interface Revision {
  id: string;
  title: string;
  date: string;
  reason: string;
  comments: string;
  photos: string[];
}

export interface Inspection {
  id: string;
  address: string; // Keep for quick access/legacy
  property: Property;
  type: InspectionType;
  date: string;
  status: InspectionStatus;
  inspectorId: string;
  
  // Person data
  inspector: Person;
  owner?: Person; // For entrada, rotina, saida
  tenant?: Person; // For entrada, rotina, saida
  buyer?: Person; // For venda
  seller?: Person; // For venda
  propertyDescription?: string;
  inspectorOpinion?: string;
  revisions?: Revision[];
}

export interface Room {
  id: string;
  inspectionId: string;
  name: string;
  description?: string;
  photos?: string[];
  order: number;
}

export interface Item {
  id: string;
  roomId: string;
  name: string;
  condition: ItemCondition;
  description: string;
  hasFurniture: boolean;
  furnitureDescription?: string;
  photos: string[]; // Base64 strings for now
  order: number;
}
