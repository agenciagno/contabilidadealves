import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useInadimplentContacts } from '@/hooks/useInadimplentContacts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCashFlowForecast } from '@/hooks/useCashFlowForecast';
import { startOfDay, parseISO, isToday, differenceInDays, format } from 'date-fns';

export type NotificationType = 'error' | 'warning' | 'success' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  category: 'inadimplencia' | 'vencimento' | 'saldo' | 'sucesso' | 'sistema';
  actionUrl?: string;
  contactId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'app_notifications';
const READ_IDS_KEY = 'app_notifications_read';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [manualNotifications, setManualNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(READ_IDS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const { inadimplentContacts } = useInadimplentContacts();
  const { transactions } = useTransactions();
  const { alerts: cashFlowAlerts } = useCashFlowForecast(7);

  // Save read IDs to localStorage
  useEffect(() => {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify([...readIds]));
  }, [readIds]);

  // Generate system notifications from data
  const systemNotifications = useMemo(() => {
    const notifications: Notification[] = [];
    const today = startOfDay(new Date());

    // Inadimplência notifications
    inadimplentContacts.forEach((contact) => {
      const id = `inadimplencia-${contact.id}`;
      const daysOverdue = differenceInDays(today, parseISO(contact.oldestDueDate));
      notifications.push({
        id,
        type: 'error',
        title: 'Inadimplência Detectada',
        description: `O cliente ${contact.name} possui ${contact.overdueCount} título(s) vencido(s) há ${daysOverdue} dias.`,
        timestamp: new Date(),
        read: readIds.has(id),
        category: 'inadimplencia',
        actionUrl: `/crm/cliente/${contact.id}`,
        contactId: contact.id,
      });
    });

    // Vencimentos do dia
    const dueTodayTransactions = transactions.filter(
      (t) => !t.is_paid && t.due_date && isToday(parseISO(t.due_date))
    );
    
    if (dueTodayTransactions.length > 0) {
      const totalAmount = dueTodayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const id = `vencimento-hoje-${format(today, 'yyyy-MM-dd')}`;
      notifications.push({
        id,
        type: 'warning',
        title: 'Vencimentos do Dia',
        description: `Você tem ${dueTodayTransactions.length} conta(s) vencendo hoje, totalizando R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        timestamp: new Date(),
        read: readIds.has(id),
        category: 'vencimento',
        actionUrl: '/movimentacoes',
      });
    }

    // Projeção de saldo negativo
    if (cashFlowAlerts.length > 0) {
      const firstAlert = cashFlowAlerts[0];
      const id = `saldo-negativo-${firstAlert.date}`;
      notifications.push({
        id,
        type: 'error',
        title: 'Projeção de Saldo Negativo',
        description: `Atenção: Projeção de saldo negativo detectada para ${format(parseISO(firstAlert.date), 'dd/MM')}. Saldo previsto: R$ ${firstAlert.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        timestamp: new Date(),
        read: readIds.has(id),
        category: 'saldo',
        actionUrl: '/relatorios',
      });
    }

    return notifications;
  }, [inadimplentContacts, transactions, cashFlowAlerts, readIds]);

  // Combine all notifications
  const notifications = useMemo(() => {
    return [...systemNotifications, ...manualNotifications].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }, [systemNotifications, manualNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
      };
      setManualNotifications((prev) => [newNotification, ...prev]);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
    setManualNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => new Set([...prev, ...allIds]));
    setManualNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifications]);

  const clearAll = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => new Set([...prev, ...allIds]));
    setManualNotifications([]);
  }, [notifications]);

  const removeNotification = useCallback((id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
    setManualNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
