export type BrewMethod = '義式' | '手沖' | '拿鐵';
export type Temperature = '冰' | '熱';
export type SelectionMode = 'random' | 'manual';

export interface CoffeeBean {
  id: string;
  name: string;
  origin: string;
  process: string;
  roastLevel?: string;
  flavorNotes?: string[];
  description?: string;
  isDemo?: boolean;
}

export interface Order {
  orderId: string;
  createdAt: string;
  beanName: string;
  origin: string;
  process: string;
  brewMethod: BrewMethod;
  temperature: Temperature;
  quantity: number;
  note: string;
  selectionMode: SelectionMode;
  status: '待製作' | '已確認' | '已完成';
}

export interface BeanWish {
  wishId: string;
  createdAt: string;
  origin: string;
  process: string;
  otherProcess?: string;
  status: 'pending';
}

export interface SheetConnectionState {
  isConnected: boolean;
  connectionMode?: 'oauth' | 'public_sheet' | 'unconnected';
  userEmail: string | null;
  spreadsheetId: string | null;
  spreadsheetTitle: string | null;
  spreadsheetUrl: string | null;
  isLoading: boolean;
  error: string | null;
}
