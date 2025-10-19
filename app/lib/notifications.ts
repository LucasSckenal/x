// Adicione este arquivo: lib/notifications.ts
export interface RecurringNotification {
  id: string;
  transactionId: string;
  description: string;
  amount: number;
  category: string;
  dueDate: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  isActive: boolean;
  createdAt: Date;
  notified: boolean;
}

export class NotificationService {
  static async checkRecurringPayments(transactions: any[]): Promise<RecurringNotification[]> {
    const recurringTransactions = transactions.filter(t => 
      t.recurring && t.recurringFrequency && t.isActive !== false
    );

    const notifications: RecurringNotification[] = [];
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    for (const transaction of recurringTransactions) {
      const nextDueDate = this.calculateNextDueDate(
        transaction.date.toDate(),
        transaction.recurringFrequency
      );

      if (nextDueDate >= today && nextDueDate <= threeDaysFromNow) {
        notifications.push({
          id: `notif_${transaction.id}_${nextDueDate.getTime()}`,
          transactionId: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          dueDate: nextDueDate,
          frequency: transaction.recurringFrequency,
          isActive: true,
          createdAt: new Date(),
          notified: false
        });
      }
    }

    return notifications;
  }

  static calculateNextDueDate(startDate: Date, frequency: string): Date {
    const nextDate = new Date(startDate);
    const today = new Date();

    while (nextDate <= today) {
      switch (frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          nextDate.setMonth(nextDate.getMonth() + 1);
      }
    }

    return nextDate;
  }

  static formatDueDate(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'hoje';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'amanhã';
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  }
}