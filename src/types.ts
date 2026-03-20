export type InspectionType = 'entrada' | 'saida' | 'rotina' | 'venda';
export type ItemCondition = 'novo' | 'bom' | 'regular' | 'ruim';
export type InspectionStatus = 'draft' | 'completed';

export interface Person {
  name: string;
  cpf: string;
}

export interface Property {
  address: string;
  complement?: string;
  neighborhood: string;
  city: string;
  cep: string;
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
