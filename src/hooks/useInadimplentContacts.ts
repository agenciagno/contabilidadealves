import { useMemo } from 'react';
import { useContacts } from './useContacts';
import { useTransactions } from './useTransactions';

export interface InadimplentContact {
  id: string;
  name: string;
  type: 'cliente' | 'fornecedor' | 'ambos';
  overdueCount: number;
  totalOverdue: number;
  oldestDueDate: string;
}

export function useInadimplentContacts() {
  const { contacts } = useContacts();
  const { transactions } = useTransactions();
  
  const today = new Date().toISOString().split('T')[0];
  
  const inadimplentContacts = useMemo(() => {
    const contactsMap = new Map<string, InadimplentContact>();
    
    // Find all unpaid transactions with due_date < today
    const overdueTransactions = transactions.filter(
      t => !t.is_paid && t.due_date && t.due_date < today && t.contact_id
    );
    
    // Group by contact
    overdueTransactions.forEach(t => {
      const contact = contacts.find(c => c.id === t.contact_id);
      if (!contact) return;
      
      const existing = contactsMap.get(contact.id);
      if (existing) {
        existing.overdueCount += 1;
        existing.totalOverdue += Number(t.amount);
        if (t.due_date && t.due_date < existing.oldestDueDate) {
          existing.oldestDueDate = t.due_date;
        }
      } else {
        contactsMap.set(contact.id, {
          id: contact.id,
          name: contact.name,
          type: contact.type as 'cliente' | 'fornecedor' | 'ambos',
          overdueCount: 1,
          totalOverdue: Number(t.amount),
          oldestDueDate: t.due_date!,
        });
      }
    });
    
    // Convert to array and sort by oldest due date
    return Array.from(contactsMap.values()).sort(
      (a, b) => new Date(a.oldestDueDate).getTime() - new Date(b.oldestDueDate).getTime()
    );
  }, [contacts, transactions, today]);
  
  return {
    inadimplentContacts,
    count: inadimplentContacts.length,
    totalAmount: inadimplentContacts.reduce((sum, c) => sum + c.totalOverdue, 0),
  };
}
