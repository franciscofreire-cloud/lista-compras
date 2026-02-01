import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingItem, AppState, CompletedPurchase } from './types';
import { formatCurrency, generateId } from './utils';
import {
  PlusIcon, TrashIcon, EditIcon, ShoppingBagIcon, HistoryIcon,
  CheckCircleIcon, ChevronRightIcon, MoreVerticalIcon, UserIcon,
  ArrowLeftIcon, MoonIcon, SunIcon, BellIcon, CogIcon, LogoutIcon,
  BookmarkIcon
} from './components/Icons';
import ItemModal from './components/ItemModal';
import Login from './components/Login';
import { supabase } from './supabase';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'profile'>('current');
  const [state, setState] = useState<AppState>({
    items: [],
    balance: 0,
    history: [],
    profile: { name: 'Usuário', email: 'usuario@email.com' },
    theme: 'light'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentListId, setCurrentListId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<CompletedPurchase | null>(null);

  // Naming Modal State
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [pendingSaveStatus, setPendingSaveStatus] = useState<'concluída' | 'pendente' | null>(null);
  const [newListName, setNewListName] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // Custom Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  const showAlert = (title: string, message: string) => {
    setDialogConfig({
      isOpen: true,
      type: 'alert',
      title,
      message,
      confirmLabel: 'Ok'
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar') => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      confirmLabel,
      cancelLabel
    });
  };

  // Check auth session
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        fetchUserData(session.user.id);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // 2. Fetch Lists
      const { data: listsData } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          items:shopping_items(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (profileData && listsData) {
        const currentList = listsData.find(l => l.status === 'current');
        const historyLists = listsData.filter(l => l.status !== 'current');

        setCurrentListId(currentList?.id || null);

        setState({
          items: currentList?.items.map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unit_price
          })) || [],
          balance: currentList?.balance_at_time || 0,
          history: historyLists.map((l: any) => ({
            id: l.id,
            listName: l.list_name,
            date: l.date,
            items: l.items.map((i: any) => ({
              id: i.id,
              name: i.name,
              quantity: i.quantity,
              unitPrice: i.unit_price
            })),
            total: l.total,
            balanceAtTime: l.balance_at_time,
            status: l.status
          })),
          profile: {
            name: profileData.name,
            email: profileData.email
          },
          theme: profileData.theme || 'light'
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Persist items to current list in Supabase
  const syncCurrentListItems = async (items: ShoppingItem[]) => {
    if (!currentListId) return;

    // Direct deletion and insertion for simplicity in this MVP
    await supabase.from('shopping_items').delete().eq('list_id', currentListId);

    if (items.length > 0) {
      await supabase.from('shopping_items').insert(
        items.map(item => ({
          list_id: currentListId,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice
        }))
      );
    }
  };

  const updateBalance = async (balance: number) => {
    if (!currentListId) return;
    await supabase.from('shopping_lists').update({ balance_at_time: balance }).eq('id', currentListId);
  };

  // Handle Dark Mode
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  // Handle click outside menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const totalExpense = useMemo(() => {
    return state.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [state.items]);

  const remainingBalance = state.balance - totalExpense;
  const isOverBudget = remainingBalance < 0;

  const handleLogout = async () => {
    showConfirm(
      'Sair da Conta',
      'Tem certeza que deseja sair da conta? Você precisará entrar novamente.',
      async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setIsMenuOpen(false);
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      },
      'Sair',
      'Manter logado'
    );
  };

  const handleAddItem = async (data: Omit<ShoppingItem, 'id'>) => {
    const newItem: ShoppingItem = { ...data, id: generateId() }; // Temporary ID for UI
    const newState = { ...state, items: [...state.items, newItem] };
    setState(newState);
    await syncCurrentListItems(newState.items);
  };

  const handleUpdateItem = async (data: Omit<ShoppingItem, 'id'>) => {
    if (!editingItem) return;
    const newItems = state.items.map(item => item.id === editingItem.id ? { ...data, id: item.id } : item);
    const newState = { ...state, items: newItems };
    setState(newState);
    setEditingItem(null);
    await syncCurrentListItems(newState.items);
  };

  const removeItem = async (id: string) => {
    const newItems = state.items.filter(item => item.id !== id);
    const newState = { ...state, items: newItems };
    setState(newState);
    await syncCurrentListItems(newState.items);
  };

  const finalizePurchase = () => {
    if (state.items.length === 0) return;

    const allItemsHaveValue = state.items.every(i => i.unitPrice > 0);
    const hasBalanceSet = state.balance > 0;

    if (!allItemsHaveValue || !hasBalanceSet) {
      showAlert('Ação Necessária', 'Para finalizar, todos os itens devem ter um valor definido e você deve informar o saldo disponível.');
      return;
    }

    setPendingSaveStatus('concluída');
    setNewListName('');
    setIsNamingModalOpen(true);
  };

  const saveAsDraft = () => {
    if (state.items.length === 0) return;
    setPendingSaveStatus('pendente');
    setNewListName('');
    setIsNamingModalOpen(true);
  };

  const confirmSaveToHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim() || !pendingSaveStatus || !currentListId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Mark current list as finished/pending
    await supabase.from('shopping_lists').update({
      list_name: newListName.trim(),
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      total: totalExpense,
      status: pendingSaveStatus
    }).eq('id', currentListId);

    // 2. Create NEW current list
    const { data: newList } = await supabase.from('shopping_lists').insert({
      user_id: user.id,
      status: 'current',
      list_name: 'Minha Lista'
    }).select().single();

    if (newList) {
      const newHistoryItem: CompletedPurchase = {
        id: currentListId,
        listName: newListName.trim(),
        date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        items: [...state.items],
        total: totalExpense,
        balanceAtTime: state.balance,
        status: pendingSaveStatus
      };

      setState(prev => ({
        ...prev,
        items: [],
        history: [newHistoryItem, ...prev.history],
        balance: 0
      }));

      setCurrentListId(newList.id);
      setIsNamingModalOpen(false);
      setActiveTab('history');
      showAlert(
        'Sucesso!',
        pendingSaveStatus === 'concluída' ? 'Compra concluída com sucesso!' : 'Lista guardada no histórico!'
      );
    }
  };

  const resumePendingList = async (purchase: CompletedPurchase) => {
    if (state.items.length > 0) {
      showConfirm(
        'Substituir Lista?',
        'Você já tem itens na sua lista atual. Deseja substituí-la pela lista pendente? Os itens atuais serão perdidos.',
        () => executeResume(purchase),
        'Substituir',
        'Voltar'
      );
      return;
    }
    executeResume(purchase);
  };

  const executeResume = async (purchase: CompletedPurchase) => {
    setDialogConfig(prev => ({ ...prev, isOpen: false }));
    setIsLoading(true);

    // 1. Delete current items
    await supabase.from('shopping_items').delete().eq('list_id', currentListId);

    // 2. Clear current list metadata
    await supabase.from('shopping_lists').update({
      balance_at_time: purchase.balanceAtTime
    }).eq('id', currentListId);

    // 3. Re-insert items from pending list into current list
    await syncCurrentListItems(purchase.items);

    // 4. Delete the old history list
    await supabase.from('shopping_lists').delete().eq('id', purchase.id);

    setState(prev => ({
      ...prev,
      items: [...purchase.items],
      balance: purchase.balanceAtTime,
      history: prev.history.filter(h => h.id !== purchase.id)
    }));

    setViewingHistoryItem(null);
    setActiveTab('current');
  };

  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm(
      'Excluir Histórico',
      'Tem certeza que deseja excluir este registro do histórico? Esta ação não pode ser desfeita.',
      async () => {
        await supabase.from('shopping_lists').delete().eq('id', id);
        setState(prev => ({ ...prev, history: prev.history.filter(h => h.id !== id) }));
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
      },
      'Excluir',
      'Cancelar'
    );
  };

  const toggleTheme = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ theme: newTheme }).eq('id', user.id);
    }
    setState(prev => ({ ...prev, theme: newTheme }));
  };

  const handleProfileChange = async (field: 'name' | 'email', value: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && field === 'name') {
      await supabase.from('profiles').update({ name: value }).eq('id', user.id);
    }
    // E-mail change would usually require re-auth or special Supabase method, 
    // for simplicity we just update local state if it's not the primary auth email
    setState(prev => ({
      ...prev,
      profile: { ...prev.profile, [field]: value }
    }));
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'history': return 'Histórico de Compras';
      case 'profile': return 'Meu Perfil';
      default: return 'Minha Lista';
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${state.theme === 'dark' ? 'bg-gray-900 te-white' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login theme={state.theme} />;
  }

  return (
    <div className={`flex flex-col min-h-screen max-w-2xl mx-auto shadow-xl relative overflow-hidden transition-colors duration-300 ${state.theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

      {/* Header */}
      <header className={`sticky top-0 z-40 border-b px-6 py-5 flex items-center justify-between shadow-sm transition-colors duration-300 ${state.theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-3">
          {activeTab === 'current' ? (
            <div className={`p-2 rounded-xl transition-colors duration-300 ${state.theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'}`}>
              <ShoppingBagIcon className="w-6 h-6" />
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('current')}
              className={`p-2 rounded-xl transition-colors duration-300 ${state.theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title="Voltar para a Lista"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
          )}
          <h1 className={`text-xl font-bold tracking-tight ${state.theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
            {getHeaderTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-2 relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-2 rounded-full transition-colors ${state.theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <MoreVerticalIcon />
          </button>

          {/* Top Menu Dropdown */}
          {isMenuOpen && (
            <div className={`absolute top-full right-0 mt-2 w-72 rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right z-[100] transition-colors duration-300 ${state.theme === 'dark' ? 'bg-gray-800 border-gray-700 shadow-black' : 'bg-white border-gray-100'}`}>
              <div className="py-3 px-2">
                <button
                  onClick={() => { setActiveTab('current'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold rounded-xl ${activeTab === 'current' ? 'text-green-500 bg-green-500/10' : (state.theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}
                >
                  <ShoppingBagIcon className="w-5 h-5" />
                  Lista de Compras
                </button>
                <button
                  onClick={() => { setActiveTab('history'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold rounded-xl ${activeTab === 'history' ? 'text-green-500 bg-green-500/10' : (state.theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}
                >
                  <HistoryIcon className="w-5 h-5" />
                  Histórico de Compras
                </button>
                <button
                  onClick={() => { setActiveTab('profile'); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-semibold rounded-xl ${activeTab === 'profile' ? 'text-green-500 bg-green-500/10' : (state.theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}
                >
                  <UserIcon className="w-5 h-5" />
                  Perfil
                </button>

                <div className={`h-px mx-4 my-2 ${state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}></div>

                {/* Theme Toggle in Menu */}
                <div className={`px-4 py-3 flex items-center justify-between rounded-xl transition-colors ${state.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${state.theme === 'dark' ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-500'}`}>
                      {state.theme === 'dark' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Configurações</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">TEMA: {state.theme === 'dark' ? 'ESCURO' : 'CLARO'}</span>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none border-2 ${state.theme === 'dark' ? 'bg-green-600 border-green-600' : 'bg-gray-200 border-green-500/30'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${state.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold rounded-xl transition-colors ${state.theme === 'dark' ? 'text-red-400 hover:bg-red-900/20' : 'text-red-500 hover:bg-red-50'}`}>
                  <div className={`p-2 rounded-lg ${state.theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-400'}`}>
                    <LogoutIcon className="w-5 h-5" />
                  </div>
                  Sair da Conta
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Areas */}
      <main className="flex-1 px-4 py-6 overflow-y-auto pb-80">
        {activeTab === 'current' && (
          /* CURRENT LIST VIEW */
          state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className={`p-6 rounded-full mb-4 ${state.theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <ShoppingBagIcon className="w-12 h-12 text-gray-300" />
              </div>
              <p className="text-center text-sm font-medium">Sua lista está vazia.<br />Comece adicionando alguns itens!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 shadow-sm border flex items-center justify-between group transition-all duration-300 ${state.theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-green-800' : 'bg-white border-gray-100 hover:border-green-200'}`}
                >
                  <div className="flex-1 mr-4">
                    <h3 className={`font-bold text-lg leading-tight mb-1 ${state.theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{item.name}</h3>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className={`px-2 py-0.5 rounded-md ${state.theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>{item.quantity}x</span>
                      <span className="text-gray-500">{formatCurrency(item.unitPrice)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total</p>
                      <p className={`font-bold ${state.theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{formatCurrency(item.quantity * item.unitPrice)}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className={`p-2 rounded-lg transition-colors ${state.theme === 'dark' ? 'text-gray-500 hover:text-green-400 hover:bg-gray-700' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                      >
                        <EditIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className={`p-2 rounded-lg transition-colors ${state.theme === 'dark' ? 'text-gray-500 hover:text-red-400 hover:bg-gray-700' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'history' && (
          /* HISTORY VIEW */
          state.history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className={`p-6 rounded-full mb-4 ${state.theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <HistoryIcon className="w-12 h-12 text-gray-300" />
              </div>
              <p className="text-center text-sm font-medium">Nenhuma compra salva ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.history.map((purchase) => (
                <div
                  key={purchase.id}
                  onClick={() => setViewingHistoryItem(purchase)}
                  className={`rounded-2xl p-5 shadow-sm border transition-all cursor-pointer active:scale-[0.98] ${state.theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-green-800' : 'bg-white border-gray-100 hover:border-green-300'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{purchase.date}</span>
                        <span className={`text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-tighter shadow-sm ${purchase.status === 'concluída'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                          }`}>
                          {purchase.status}
                        </span>
                      </div>
                      <h3 className={`font-bold text-lg leading-tight ${state.theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{purchase.listName}</h3>
                      <p className="text-xs text-gray-500 font-medium">{purchase.items.length} itens</p>
                    </div>
                    <button
                      onClick={(e) => deleteHistoryItem(purchase.id, e)}
                      className="text-gray-300 hover:text-red-400 p-1 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={`flex justify-between items-end border-t pt-3 ${state.theme === 'dark' ? 'border-gray-700' : 'border-gray-50'}`}>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gasto Total</p>
                      <p className={`font-bold text-xl ${state.theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{formatCurrency(purchase.total)}</p>
                    </div>
                    <div className={`p-2 rounded-xl text-gray-400 ${state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <ChevronRightIcon />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'profile' && (
          /* PROFILE VIEW */
          <div className="animate-in fade-in duration-300">
            {/* User Info Header */}
            <div className={`flex flex-col items-center py-10 rounded-[2.5rem] mb-6 border ${state.theme === 'dark' ? 'bg-gray-800/50 border-gray-800 shadow-black shadow-inner' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-6 shadow-inner ${state.theme === 'dark' ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-600'}`}>
                <UserIcon className="w-14 h-14" />
              </div>

              <div className="w-full px-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nome</label>
                  <input
                    type="text"
                    value={state.profile.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all ${state.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input
                    type="email"
                    value={state.profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all ${state.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-800/20 w-full px-8 text-center">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">Total Gasto Geral</p>
                <p className={`text-2xl font-black ${state.theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  {formatCurrency(state.history.reduce((acc, h) => acc + h.total, 0))}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Buttons Area (Only in current list) */}
      {activeTab === 'current' && (
        <div className="fixed bottom-60 right-8 flex items-center gap-3 z-50">
          {state.items.length > 0 && (
            <>
              <button
                onClick={saveAsDraft}
                title="Guardar como Pendente"
                className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-95 hover:scale-105 border ${state.theme === 'dark' ? 'bg-gray-800 border-gray-700 text-yellow-400 shadow-black' : 'bg-white border-yellow-500/20 text-yellow-500 shadow-yellow-200/50'}`}
              >
                <BookmarkIcon className="w-7 h-7" />
              </button>

              <button
                onClick={finalizePurchase}
                title="Finalizar como Concluída"
                className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-95 hover:scale-105 border ${state.theme === 'dark' ? 'bg-green-900/40 border-green-800 text-green-400 shadow-black' : 'bg-green-50 border-green-200 text-green-600 shadow-green-200/50'}`}
              >
                <CheckCircleIcon className="w-7 h-7" />
              </button>
            </>
          )}

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            title="Adicionar Item"
            className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-95 hover:scale-105 ${state.theme === 'dark' ? 'bg-green-600 text-white shadow-black' : 'bg-green-500 text-white shadow-green-200'}`}
          >
            <PlusIcon className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* Naming Modal */}
      {isNamingModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300 ${state.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <h3 className="text-xl font-bold mb-2">Nome da Lista</h3>
            <p className="text-sm text-gray-400 mb-6">Dê um nome para identificar esta compra no histórico.</p>

            <form onSubmit={confirmSaveToHistory} className="space-y-6">
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Compra do Mês, Churrasco..."
                className={`w-full px-4 py-3 border rounded-xl font-semibold focus:ring-2 focus:ring-green-500 outline-none transition-all ${state.theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNamingModalOpen(false)}
                  className={`flex-1 py-3 font-bold rounded-xl ${state.theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 font-bold text-white bg-green-500 rounded-xl shadow-lg shadow-green-200/50"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Area with Summary (Only in Current List) */}
      {activeTab === 'current' && (
        <section className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-40">
          <div className={`h-12 bg-gradient-to-t ${state.theme === 'dark' ? 'from-gray-900' : 'from-gray-50'} to-transparent`}></div>
          <div className={`border-t rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pt-6 pb-8 px-6 sm:px-8 transition-colors duration-300 ${state.theme === 'dark' ? 'bg-gray-800 border-gray-700 shadow-black' : 'bg-white border-gray-100'}`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Saldo Disponível</label>
                  <div className="relative group flex items-center">
                    <span className={`font-bold text-lg mr-1 ${state.theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>R$</span>
                    <input
                      type="number"
                      step="0.01"
                      className={`bg-transparent border-none text-lg font-bold focus:ring-0 w-32 outline-none p-0 ${state.theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}
                      value={state.balance === 0 ? '' : state.balance}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setState(prev => ({ ...prev, balance: val }));
                        updateBalance(val);
                      }}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Total Compra</label>
                  <p className={`text-lg font-bold ${state.theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{formatCurrency(totalExpense)}</p>
                </div>
              </div>

              <div className={`rounded-2xl p-4 border transition-all duration-300 flex justify-between items-center ${isOverBudget ? (state.theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100') : (state.theme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-100')}`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${isOverBudget ? 'text-red-400' : 'text-green-500'}`}>
                  {isOverBudget ? 'Orçamento Estourado' : 'Saldo Restante'}
                </span>
                <p className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(remainingBalance)}
                </p>
              </div>

              {isOverBudget && (
                <div className={`text-xs py-2 px-4 rounded-xl text-center font-bold animate-pulse uppercase ${state.theme === 'dark' ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700'}`}>
                  Saldo insuficiente!
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* History Detail Overlay */}
      {viewingHistoryItem && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col transition-colors duration-300 ${state.theme === 'dark' ? 'bg-gray-800 text-white shadow-black' : 'bg-white text-gray-900'}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{viewingHistoryItem.date}</span>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${viewingHistoryItem.status === 'concluída'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    }`}>
                    {viewingHistoryItem.status}
                  </span>
                </div>
                <h2 className="text-2xl font-bold leading-tight">{viewingHistoryItem.listName}</h2>
              </div>
              <button
                onClick={() => setViewingHistoryItem(null)}
                className={`p-2 rounded-full transition-colors ${state.theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6">
              {viewingHistoryItem.items.map((item) => (
                <div key={item.id} className={`flex justify-between items-center py-3 border-b ${state.theme === 'dark' ? 'border-gray-700' : 'border-gray-50'}`}>
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-xs text-gray-500 font-medium">{item.quantity}x {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.quantity * item.unitPrice)}</p>
                </div>
              ))}
            </div>

            <div className={`rounded-2xl p-6 border ${state.theme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-100'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-bold uppercase tracking-widest ${state.theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>Investimento Total</span>
                <span className={`text-2xl font-black ${state.theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>{formatCurrency(viewingHistoryItem.total)}</span>
              </div>
              <div className={`flex justify-between items-center text-xs font-medium ${state.theme === 'dark' ? 'text-green-500/50' : 'text-green-600/70'}`}>
                <span>Saldo na época</span>
                <span>{formatCurrency(viewingHistoryItem.balanceAtTime)}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setViewingHistoryItem(null)}
                className={`flex-1 py-4 font-bold rounded-2xl transition-all active:scale-95 ${state.theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Fechar
              </button>
              {viewingHistoryItem.status === 'pendente' ? (
                <button
                  onClick={() => resumePendingList(viewingHistoryItem)}
                  className="flex-[2] py-4 bg-green-500 text-white rounded-2xl font-bold shadow-lg shadow-green-200 active:scale-95 transition-all dark:bg-green-600 dark:shadow-black"
                >
                  Abrir na Lista
                </button>
              ) : (
                <button
                  onClick={() => setViewingHistoryItem(null)}
                  className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg shadow-gray-200 active:scale-95 transition-all dark:bg-gray-800 dark:shadow-black"
                >
                  Ok, entendi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={editingItem ? handleUpdateItem : handleAddItem}
        initialData={editingItem}
        theme={state.theme}
      />

      {/* Global Dialog Modal (Alert/Confirm) */}
      {dialogConfig.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300 ${state.theme === 'dark' ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900'}`}>
            <h3 className="text-xl font-bold mb-2">{dialogConfig.title}</h3>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">{dialogConfig.message}</p>

            <div className="flex gap-3">
              {dialogConfig.type === 'confirm' && (
                <button
                  onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                  className={`flex-1 py-4 font-bold rounded-2xl transition-all active:scale-95 ${state.theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}
                >
                  {dialogConfig.cancelLabel}
                </button>
              )}
              <button
                onClick={() => {
                  if (dialogConfig.type === 'confirm' && dialogConfig.onConfirm) {
                    dialogConfig.onConfirm();
                  } else {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                  }
                }}
                className={`flex-1 py-4 font-bold text-white rounded-2xl shadow-lg transition-all active:scale-95 ${dialogConfig.type === 'confirm' && (dialogConfig.title.includes('Excluir') || dialogConfig.title.includes('Sair'))
                    ? 'bg-red-500 shadow-red-200/50'
                    : 'bg-green-500 shadow-green-200/50'
                  }`}
              >
                {dialogConfig.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
