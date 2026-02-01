
export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CompletedPurchase {
  id: string;
  listName: string;
  date: string;
  items: ShoppingItem[];
  total: number;
  balanceAtTime: number;
  status: 'concluída' | 'pendente';
}

export interface UserProfile {
  name: string;
  email: string;
}

export interface AppState {
  items: ShoppingItem[];
  balance: number;
  history: CompletedPurchase[];
  profile: UserProfile;
  theme: 'light' | 'dark';
}
