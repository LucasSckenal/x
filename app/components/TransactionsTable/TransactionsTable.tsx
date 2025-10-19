'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, Calendar, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import Modal from '../Modal/Modal';
import CustomSelect from '../CustomSelect/CustomSelect';
import styles from './TransactionsTable.module.scss';

// Exportar a interface Transaction
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryIcon: string;
  date: any; // Pode ser string ou Firestore Timestamp
  recurring?: boolean;
  nextDueDate?: any;
}

// Categorias de transação
export const transactionCategories = [
  { value: 'Alimentação', label: 'Alimentação', icon: '🍕' },
  { value: 'Transporte', label: 'Transporte', icon: '🚗' },
  { value: 'Compras', label: 'Compras', icon: '🛍️' },
  { value: 'Entretenimento', label: 'Entretenimento', icon: '🎬' },
  { value: 'Saúde', label: 'Saúde', icon: '🏥' },
  { value: 'Educação', label: 'Educação', icon: '📚' },
  { value: 'Salário', label: 'Salário', icon: '💰' },
  { value: 'Investimentos', label: 'Investimentos', icon: '📈' },
  { value: 'Outros', label: 'Outros', icon: '📦' },
  { value: 'Cartão de Crédito', label: 'Cartão de Crédito', icon: '💳' },
  { value: 'Lazer', label: 'Lazer', icon: '🎉' }
];

const frequencyOptions = [
  { value: 'weekly', label: 'Semanal', icon: '🔄' },
  { value: 'monthly', label: 'Mensal', icon: '📅' },
  { value: 'yearly', label: 'Anual', icon: '🎉' }
];

const typeOptions = [
  { value: 'expense', label: 'Despesa', icon: '📤' },
  { value: 'income', label: 'Receita', icon: '📥' }
];

interface TransactionsTableProps {
  transactions: Transaction[];
  onAddTransaction?: (transaction: Omit<Transaction, 'id'>) => void;
  onEditTransaction?: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction?: (id: string) => void;
}

interface FormData {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
  categoryIcon: string;
  date: string;
  recurring: boolean;
  frequency?: 'weekly' | 'monthly' | 'yearly';
  endDate?: string;
  nextDueDate?: string;
}

// Função para garantir que o valor seja Date ou ISO string
const fixDateIssue = (date: string | any): string => {
  if (!date) return new Date().toISOString().split('T')[0];

  let dateObj: Date;

  if (date.toDate) dateObj = date.toDate(); // Firestore Timestamp
  else if (typeof date === 'string') dateObj = new Date(date);
  else if (date instanceof Date) dateObj = date;
  else dateObj = new Date();

  const problematicDate = new Date('2000-01-01');
  if (dateObj.getTime() === problematicDate.getTime()) {
    return new Date().toISOString().split('T')[0];
  }

  return dateObj.toISOString().split('T')[0];
};

// Formatar para exibição
const formatDateForDisplay = (date: string | any): string => {
  if (!date) return '';
  let dateObj: Date;

  if (date.toDate) dateObj = date.toDate();
  else if (typeof date === 'string') dateObj = new Date(date);
  else if (date instanceof Date) dateObj = date;
  else return '';

  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('pt-BR');
};

// Pegar ícone da categoria
const getCategoryIcon = (category: string) => {
  const found = transactionCategories.find(c => c.value === category);
  return found?.icon || '💰';
};

export default function TransactionsTable({ transactions, onAddTransaction, onEditTransaction, onDeleteTransaction }: TransactionsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    categoryIcon: '💰',
    date: new Date().toISOString().split('T')[0],
    recurring: false,
    frequency: 'monthly',
    endDate: '',
    nextDueDate: ''
  });

  const months = [
    { value: 'all', label: 'Todos os meses' },
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' }
  ];

  // Filtragem e ordenação
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(t => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (monthFilter !== 'all') {
        const month = new Date(fixDateIssue(t.date)).getMonth().toString();
        if (month !== monthFilter) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'date':
          aVal = new Date(fixDateIssue(a.date)).getTime();
          bVal = new Date(fixDateIssue(b.date)).getTime();
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'description':
          aVal = a.description.toLowerCase();
          bVal = b.description.toLowerCase();
          break;
        default:
          return 0;
      }
      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return filtered;
  }, [transactions, filter, searchTerm, monthFilter, sortField, sortDirection]);

  // Agrupar por mês
  const transactionsByMonth = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredAndSortedTransactions.forEach(t => {
      const date = new Date(fixDateIssue(t.date));
      const monthYear = date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' }).replace(/de /g, '');
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(t);
    });
    return groups;
  }, [filteredAndSortedTransactions]);

  const handleAddTransaction = () => {
    setFormData({
      description: '',
      amount: '',
      type: 'expense',
      category: '',
      categoryIcon: '💰',
      date: new Date().toISOString().split('T')[0],
      recurring: false,
      frequency: 'monthly',
      endDate: '',
      nextDueDate: ''
    });
    setSelectedTransaction(null);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (t: Transaction) => {
    setFormData({
      description: t.description,
      amount: Math.abs(t.amount).toString(),
      type: t.type,
      category: t.category,
      categoryIcon: t.categoryIcon,
      date: fixDateIssue(t.date),
      recurring: t.recurring || false,
      frequency: 'monthly',
      endDate: '',
      nextDueDate: t.nextDueDate ? fixDateIssue(t.nextDueDate) : ''
    });
    setSelectedTransaction(t);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = (t: Transaction) => {
    setSelectedTransaction(t);
    setIsDeleteModalOpen(true);
  };

  const handleSaveTransaction = () => {
    const transactionData = {
      description: formData.description,
      amount: formData.type === 'income' ? +formData.amount : -(+formData.amount),
      type: formData.type,
      category: formData.category,
      categoryIcon: formData.categoryIcon,
      date: formData.date,
      recurring: formData.recurring,
      nextDueDate: formData.recurring ? formData.nextDueDate : undefined
    };

    if (selectedTransaction) onEditTransaction?.(selectedTransaction.id, transactionData);
    else onAddTransaction?.(transactionData);

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (selectedTransaction) {
      onDeleteTransaction?.(selectedTransaction.id);
      setIsDeleteModalOpen(false);
      setSelectedTransaction(null);
    }
  };

  const handleSort = (field: 'date' | 'amount' | 'description') => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const handleInputChange = (field: keyof FormData, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleAmountChange = (value: string) => handleInputChange('amount', value.replace(/[^\d.]/g, ''));

  const incrementAmount = () => handleInputChange('amount', ((parseFloat(formData.amount) || 0) + 1).toString());
  const decrementAmount = () => handleInputChange('amount', Math.max(0, (parseFloat(formData.amount) || 0) - 1).toString());

  const modalFooter = (
    <div className={styles.modalActions}>
      <button className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancelar</button>
      <button className={styles.saveButton} onClick={handleSaveTransaction} disabled={!formData.description || !formData.amount || !formData.category}>
        {selectedTransaction ? 'Atualizar' : 'Adicionar'}
      </button>
    </div>
  );

  const deleteModalFooter = (
    <div className={styles.modalActions}>
      <button className={styles.cancelButton} onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
      <button className={styles.deleteConfirmButton} onClick={handleConfirmDelete}>Confirmar Exclusão</button>
    </div>
  );

  const SortIcon = ({ field }: { field: 'date' | 'amount' | 'description' }) => {
    if (sortField !== field) return <Filter size={12} />;
    return sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3>Transações</h3>
        <div className={styles.controls}>
          {/* Month Filter */}
          <div className={`${styles.monthFilter} ${isMonthDropdownOpen ? styles.open : ''}`} onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}>
            <span className={styles.selectedMonth}>{months.find(m => m.value === monthFilter)?.label || 'Todos os meses'}</span>
            {isMonthDropdownOpen && (
              <div className={styles.dropdownOptions}>
                {months.map(month => (
                  <div key={month.value} className={styles.dropdownOption} onClick={() => { setMonthFilter(month.value); setIsMonthDropdownOpen(false); }}>
                    {month.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className={styles.searchBox}>
            <Search size={18} />
            <input type="text" placeholder="Buscar transações..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          {/* Filter Buttons */}
          <div className={styles.filterButtons}>
            <button className={filter === 'all' ? styles.active : ''} onClick={() => setFilter('all')}>Todas</button>
            <button className={filter === 'income' ? styles.active : ''} onClick={() => setFilter('income')}>Receitas</button>
            <button className={filter === 'expense' ? styles.active : ''} onClick={() => setFilter('expense')}>Despesas</button>
          </div>

          <button className={styles.addButton} onClick={handleAddTransaction}><Plus size={20} /></button>
        </div>
      </div>

      {/* Tabela */}
      {filteredAndSortedTransactions.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h3>Nenhuma transação encontrada</h3>
          <p>{searchTerm || filter !== 'all' || monthFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Adicione sua primeira transação clicando no botão +'}</p>
        </div>
      ) : (
        <div className={styles.table}>
          {/* Cabeçalho */}
          <div className={styles.tableHeader}>
            <div className={styles.sortableHeader} onClick={() => handleSort('description')}>Descrição <SortIcon field="description" /></div>
            <div>Categoria</div>
            <div className={styles.sortableHeader} onClick={() => handleSort('date')}>Data <SortIcon field="date" /></div>
            <div className={styles.sortableHeader} onClick={() => handleSort('amount')}>Valor <SortIcon field="amount" /></div>
            <div>Ações</div>
          </div>

          {/* Linhas por mês */}
          {Object.entries(transactionsByMonth).map(([month, monthTransactions]) => (
            <div key={month}>
              <div className={styles.monthHeader}>{month}</div>
              {monthTransactions.map(transaction => (
                <div key={transaction.id} className={styles.tableRow}>
                  <div className={styles.cell}>
                    <div className={styles.cellDescription}>
                      <span className={styles.categoryIcon}>{getCategoryIcon(transaction.category)}</span>
                      <div>
                        <div>{transaction.description}</div>
                        {transaction.recurring && (
                          <div className={styles.recurringBadge}>
                            <Calendar size={12} /> Recorrente
                            {transaction.nextDueDate && (
                              <span className={styles.nextDueDate}>• Próxima: {formatDateForDisplay(transaction.nextDueDate)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={styles.cell}>{transaction.category}</div>
                  <div className={styles.cell}>{formatDateForDisplay(transaction.date)}</div>
                  <div className={`${styles.cell} ${styles.cellAmount}`}>
                    <span className={transaction.type === 'income' ? styles.income : styles.expense}>
                      {transaction.type === 'income' ? '+' : '-'} R$ {Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.cellActions}>
                    <div className={styles.actionButtons}>
                      <button onClick={() => handleEditTransaction(transaction)} title="Editar transação"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteTransaction(transaction)} title="Excluir transação"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedTransaction ? 'Editar Transação' : 'Nova Transação'} footer={modalFooter} width="520px">
        <div className={styles.modalForm}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Descrição *</label>
              <input type="text" placeholder="Descrição da transação" value={formData.description} onChange={e => handleInputChange('description', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Valor *</label>
              <div className={styles.numberInputWrapper}>
                <input type="text" className={styles.numberInput} placeholder="0,00" value={formData.amount} onChange={e => handleAmountChange(e.target.value)} />
                <div className={styles.numberControls}>
                  <button className={styles.numberBtn} type="button" onClick={incrementAmount}>+</button>
                  <button className={styles.numberBtn} type="button" onClick={decrementAmount}>-</button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Tipo *</label>
              <CustomSelect options={typeOptions} value={formData.type} onChange={value => handleInputChange('type', value as 'income' | 'expense')} placeholder="Selecione o tipo" />
            </div>
            <div className={styles.formGroup}>
              <label>Data *</label>
              <input type="date" value={formData.date.split('T')[0]} onChange={e => handleInputChange('date', e.target.value)} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Categoria *</label>
            <CustomSelect options={transactionCategories} value={formData.category} onChange={value => handleInputChange('category', value)} placeholder="Selecione uma categoria" />
          </div>
        </div>
      </Modal>

      {/* Modal Excluir */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Exclusão" footer={deleteModalFooter} width="400px">
        <div className={styles.confirmContent}>
          <div className={styles.confirmIcon}>⚠️</div>
          <p>Tem certeza que deseja excluir a transação <strong>"{selectedTransaction?.description}"</strong>?</p>
          <p className={styles.warningText}>Esta ação não pode ser desfeita.</p>
        </div>
      </Modal>
    </div>
  );
}
