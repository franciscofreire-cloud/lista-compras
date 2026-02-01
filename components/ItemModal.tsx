
import React, { useState, useEffect } from 'react';
import { ShoppingItem } from '../types';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<ShoppingItem, 'id'>) => void;
  initialData?: ShoppingItem | null;
  theme?: 'light' | 'dark';
}

const ItemModal: React.FC<ItemModalProps> = ({ isOpen, onClose, onSave, initialData, theme = 'light' }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unitPrice, setUnitPrice] = useState<number | string>('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setQuantity(initialData.quantity);
      setUnitPrice(initialData.unitPrice);
    } else {
      setName('');
      setQuantity(1);
      setUnitPrice('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(quantity);
    const p = Number(unitPrice);
    
    if (!name.trim() || isNaN(q) || q <= 0 || isNaN(p) || p < 0) {
      alert('Por favor, preencha todos os campos corretamente.');
      return;
    }
    
    onSave({ name: name.trim(), quantity: q, unitPrice: p });
    onClose();
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl transform transition-all animate-in slide-in-from-bottom duration-300 ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {initialData ? 'Editar Item' : 'Novo Item'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 font-medium"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Nome do Produto</label>
            <input
              type="text"
              required
              placeholder="Ex: Arroz, Feijão..."
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quantidade</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                placeholder="1"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Preço Unitário</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 font-bold rounded-xl transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-[2] py-3 text-white font-bold bg-green-500 rounded-xl hover:bg-green-600 shadow-lg transition-all active:scale-95 dark:bg-green-600"
            >
              {initialData ? 'Salvar Alterações' : 'Adicionar à Lista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemModal;
