// components/GlobalModals.tsx - VERSÃO ATUALIZADA
'use client';

import { useModal } from '../../context/ModalContext';
import { ConfirmDeleteModal, EditTransactionModal, CreateTransactionModal } from '../TransactionsTable/TransactionsTable';
import { useTransactions } from '../../hooks/useTransactions'; // 👈 ADICIONAR HOOK

export function GlobalModals() {
  const { 
    deleteModal, 
    editModal, 
    createModal, 
    closeModals 
  } = useModal();

  const { createTransaction, updateTransaction, deleteTransaction } = useTransactions(); // 👈 USAR HOOK

  const handleCreate = async (formData: any) => {
    try {
      await createTransaction(formData);
      closeModals();
    } catch (error) {
      // Erro já é tratado no hook
    }
  };

  const handleEdit = async (formData: any) => {
    if (!editModal.transaction) return;
    
    try {
      await updateTransaction(editModal.transaction, formData);
      closeModals();
    } catch (error) {
      // Erro já é tratado no hook
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.transaction) return;
    
    try {
      await deleteTransaction(deleteModal.transaction);
      closeModals();
    } catch (error) {
      // Erro já é tratado no hook
    }
  };

  return (
    <>
      <ConfirmDeleteModal 
        isOpen={deleteModal.isOpen}
        onClose={closeModals}
        onConfirm={handleDelete}
        transaction={deleteModal.transaction}
      />
      
      <EditTransactionModal 
        isOpen={editModal.isOpen}
        onClose={closeModals}
        transaction={editModal.transaction}
        onSave={handleEdit}
      />
      
      <CreateTransactionModal 
        isOpen={createModal.isOpen}
        onClose={closeModals}
        onSave={handleCreate}
      />
    </>
  );
}