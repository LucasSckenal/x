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
  date: string;
  recurring?: boolean;
  nextDueDate?: string;
}

// Exportar as categorias de transação
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

// Função para corrigir o problema da data 01/01/2000
const fixDateIssue = (dateString: string): string => {
  if (!dateString) return new Date().toISOString().split('T')[0];
  
  // Se a data for 01/01/2000, substituir pela data atual
  const date = new Date(dateString);
  const problematicDate = new Date('2000-01-01');
  
  if (date.getTime() === problematicDate.getTime()) {
    return new Date().toISOString().split('T')[0];
  }
  
  return dateString;
};

// Função para formatar a data para o input type="date"
const formatDateForInput = (dateString: string): string => {
  const fixedDate = fixDateIssue(dateString);
  
  try {
    const date = new Date(fixedDate);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

// Função para formatar a data para exibição
const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Tenta reconhecer formato do Firebase
    const parts = dateString.match(/(\d+) de (\w+) de (\d{4})/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const monthStr = parts[2].toLowerCase();
      const year = parseInt(parts[3], 10);

      const monthsMap: { [key: string]: number } = {
        janeiro: 0,
        fevereiro: 1,
        março: 2,
        abril: 3,
        maio: 4,
        junho: 5,
        julho: 6,
        agosto: 7,
        setembro: 8,
        outubro: 9,
        novembro: 10,
        dezembro: 11
      };

      const month = monthsMap[monthStr];
      if (month !== undefined) {
        const date = new Date(year, month, day);
        return date.toLocaleDateString('pt-BR');
      }
    }

    // fallback para ISO ou outros formatos
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('pt-BR');
    }

    return '';
  } catch {
    return '';
  }
};

export default function TransactionsTable({ 
  transactions, 
  onAddTransaction, 
  onEditTransaction, 
  onDeleteTransaction 
}: TransactionsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  // Dados do formulário
  const [formData, setFormData] = useState<FormData>({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    categoryIcon: '💰',
    date: formatDateForInput(new Date().toISOString()),
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
    let filtered = transactions.filter(transaction => {
      // Filtro por tipo
      if (filter !== 'all' && transaction.type !== filter) return false;
      
      // Filtro por busca
      if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro por mês
      if (monthFilter !== 'all') {
        const transactionMonth = new Date(transaction.date).getMonth().toString();
        if (transactionMonth !== monthFilter) return false;
      }
      
      return true;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [transactions, filter, searchTerm, monthFilter, sortField, sortDirection]);

  // Agrupar transações por mês
  const transactionsByMonth = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    filteredAndSortedTransactions.forEach(transaction => {
      const date = new Date(fixDateIssue(transaction.date)); // Corrigir a data aqui também
      const monthYear = date.toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long' 
      }).replace(/de /g, '');
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(transaction);
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
      date: formatDateForInput(new Date().toISOString()),
      recurring: false,
      frequency: 'monthly',
      endDate: '',
      nextDueDate: ''
    });
    setSelectedTransaction(null);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setFormData({
      description: transaction.description,
      amount: Math.abs(transaction.amount).toString(),
      type: transaction.type,
      category: transaction.category,
      categoryIcon: transaction.categoryIcon,
      date: formatDateForInput(transaction.date),
      recurring: transaction.recurring || false,
      frequency: 'monthly',
      endDate: '',
      nextDueDate: transaction.nextDueDate ? formatDateForInput(transaction.nextDueDate) : ''
    });
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
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

    if (selectedTransaction) {
      // Editar transação existente
      onEditTransaction?.(selectedTransaction.id, transactionData);
    } else {
      // Adicionar nova transação
      onAddTransaction?.(transactionData);
    }
    
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
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmountChange = (value: string) => {
    // Remove caracteres não numéricos, exceto ponto decimal
    const numericValue = value.replace(/[^\d.]/g, '');
    handleInputChange('amount', numericValue);
  };

  const incrementAmount = () => {
    const currentAmount = parseFloat(formData.amount) || 0;
    handleInputChange('amount', (currentAmount + 1).toString());
  };

  const decrementAmount = () => {
    const currentAmount = parseFloat(formData.amount) || 0;
    if (currentAmount > 0) {
      handleInputChange('amount', (currentAmount - 1).toString());
    }
  };

  const getCategoryIcon = (category: string) => {
    if (!category) return '💰';
    const foundCategory = transactionCategories.find(
      cat =>
        cat.value.toLowerCase() === category.toLowerCase() ||
        cat.label.toLowerCase() === category.toLowerCase()
    );
    return foundCategory?.icon || '💰';
  };

  const modalFooter = (
    <div className={styles.modalActions}>
      <button 
        className={styles.cancelButton} 
        onClick={() => setIsModalOpen(false)}
      >
        Cancelar
      </button>
      <button 
        className={styles.saveButton} 
        onClick={handleSaveTransaction}
        disabled={!formData.description || !formData.amount || !formData.category}
      >
        {selectedTransaction ? 'Atualizar' : 'Adicionar'}
      </button>
    </div>
  );

  const deleteModalFooter = (
    <div className={styles.modalActions}>
      <button 
        className={styles.cancelButton} 
        onClick={() => setIsDeleteModalOpen(false)}
      >
        Cancelar
      </button>
      <button 
        className={styles.deleteConfirmButton} 
        onClick={handleConfirmDelete}
      >
        Confirmar Exclusão
      </button>
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
          <div 
            className={`${styles.monthFilter} ${isMonthDropdownOpen ? styles.open : ''}`}
            onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
          >
            <span className={styles.selectedMonth}>
              {months.find(m => m.value === monthFilter)?.label || 'Todos os meses'}
            </span>
            {isMonthDropdownOpen && (
              <div className={styles.dropdownOptions}>
                {months.map(month => (
                  <div
                    key={month.value}
                    className={styles.dropdownOption}
                    onClick={() => {
                      setMonthFilter(month.value);
                      setIsMonthDropdownOpen(false);
                    }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className={styles.filterButtons}>
            <button 
              className={filter === 'all' ? styles.active : ''}
              onClick={() => setFilter('all')}
            >
              Todas
            </button>
            <button 
              className={filter === 'income' ? styles.active : ''}
              onClick={() => setFilter('income')}
            >
              Receitas
            </button>
            <button 
              className={filter === 'expense' ? styles.active : ''}
              onClick={() => setFilter('expense')}
            >
              Despesas
            </button>
          </div>

          <button className={styles.addButton} onClick={handleAddTransaction}>
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Tabela */}
      {filteredAndSortedTransactions.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h3>Nenhuma transação encontrada</h3>
          <p>
            {searchTerm || filter !== 'all' || monthFilter !== 'all' 
              ? 'Tente ajustar os filtros de busca'
              : 'Adicione sua primeira transação clicando no botão +'
            }
          </p>
        </div>
      ) : (
        <div className={styles.table}>
          {/* Cabeçalho da tabela - Desktop */}
          <div className={styles.tableHeader}>
            <div 
              className={styles.sortableHeader}
              onClick={() => handleSort('description')}
            >
              Descrição <SortIcon field="description" />
            </div>
            <div>Categoria</div>
            <div 
              className={styles.sortableHeader}
              onClick={() => handleSort('date')}
            >
              Data <SortIcon field="date" />
            </div>
            <div 
              className={styles.sortableHeader}
              onClick={() => handleSort('amount')}
            >
              Valor <SortIcon field="amount" />
            </div>
            <div>Ações</div>
          </div>

          {/* Transações agrupadas por mês */}
          {Object.entries(transactionsByMonth).map(([month, monthTransactions]) => (
            <div key={month}>
              <div className={styles.monthHeader}>
                {month}
              </div>
              {monthTransactions.map((transaction) => (
                <div key={transaction.id} className={styles.tableRow}>
                  <div className={styles.cell}>
                    <div className={styles.cellDescription}>
                      <span className={styles.categoryIcon}>
                        {transaction.categoryIcon || getCategoryIcon(transaction.category)}
                      </span>
                      <div>
                        <div>{transaction.description}</div>
                        {transaction.recurring && (
                          <div className={styles.recurringBadge}>
                            <Calendar size={12} />
                            Recorrente
                            {transaction.nextDueDate && (
                              <span className={styles.nextDueDate}>
                                • Próxima: {formatDateForDisplay(transaction.nextDueDate)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={styles.cell}>{transaction.category}</div>
                  <div className={styles.cell}>
                    {formatDateForDisplay(transaction.date)}
                  </div>
                  <div className={`${styles.cell} ${styles.cellAmount}`}>
                    <span className={transaction.type === 'income' ? styles.income : styles.expense}>
                      {transaction.type === 'income' ? '+' : '-'} 
                      R$ {Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.cellActions}>
                    <div className={styles.actionButtons}>
                      <button 
                        onClick={() => handleEditTransaction(transaction)}
                        title="Editar transação"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTransaction(transaction)}
                        title="Excluir transação"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Adicionar/Editar Transação */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTransaction ? 'Editar Transação' : 'Nova Transação'}
        footer={modalFooter}
        width="520px" // Aumentei um pouco para evitar cortes
      >
        <div className={styles.modalForm}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Descrição *</label>
              <input 
                type="text" 
                placeholder="Descrição da transação"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Valor *</label>
              <div className={styles.numberInputWrapper}>
                <input 
                  type="text" 
                  className={styles.numberInput}
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
                <div className={styles.numberControls}>
                  <button 
                    className={styles.numberBtn}
                    onClick={incrementAmount}
                    type="button"
                  >
                    +
                  </button>
                  <button 
                    className={styles.numberBtn}
                    onClick={decrementAmount}
                    type="button"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Tipo *</label>
              <CustomSelect
                options={typeOptions}
                value={formData.type}
                onChange={(value) => handleInputChange('type', value as 'income' | 'expense')}
                placeholder="Selecione o tipo"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Data *</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Categoria *</label>
            <CustomSelect
              options={transactionCategories}
              value={formData.category}
              onChange={(value) => {
                handleInputChange('category', value);
                handleInputChange('categoryIcon', getCategoryIcon(value));
              }}
              placeholder="Selecione uma categoria"
            />
          </div>

          {/* Seção de Recorrência */}
          <div className={styles.recurringSection}>
            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                className={styles.checkboxInput}
                checked={formData.recurring}
                onChange={(e) => handleInputChange('recurring', e.target.checked)}
              />
              <span className={styles.checkboxCustom}></span>
              Transação Recorrente
            </label>

            {formData.recurring && (
              <div className={styles.recurringFields}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Frequência</label>
                    <div className={styles.selectWrapper}> {/* Wrapper para evitar cortes */}
                      <CustomSelect
                        options={frequencyOptions}
                        value={formData.frequency || 'monthly'}
                        onChange={(value) => handleInputChange('frequency', value as 'weekly' | 'monthly' | 'yearly')}
                        placeholder="Selecione a frequência"
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Data Final</label>
                    <input 
                      type="date" 
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
                {formData.nextDueDate && (
                  <div className={styles.nextDueInfo}>
                    <Calendar size={16} />
                    Próxima transação: {formatDateForDisplay(formData.nextDueDate)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Exclusão"
        footer={deleteModalFooter}
        width="400px"
      >
        <div className={styles.confirmContent}>
          <div className={styles.confirmIcon}>⚠️</div>
          <p>
            Tem certeza que deseja excluir a transação 
            <strong> "{selectedTransaction?.description}"</strong>?
          </p>
          <p className={styles.warningText}>
            Esta ação não pode ser desfeita.
          </p>
        </div>
      </Modal>
    </div>
  );
}