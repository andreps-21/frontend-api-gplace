import { useState, useEffect } from 'react';

export interface DateRange {
  date_from: string;
  date_to: string;
}

export const useDateRange = (periodo: string = '1ano') => {
  const [dateRange, setDateRange] = useState<DateRange>({
    date_from: '',
    date_to: ''
  });

  const calculateDateRange = (period: string): DateRange => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 0-indexed
    
    switch (period) {
      case '1ano':
        return {
          date_from: `${currentYear}-01-01`,
          date_to: `${currentYear}-12-31`
        };
      case '6meses':
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        return {
          date_from: sixMonthsAgo.toISOString().split('T')[0],
          date_to: today.toISOString().split('T')[0]
        };
      case '3meses':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        return {
          date_from: threeMonthsAgo.toISOString().split('T')[0],
          date_to: today.toISOString().split('T')[0]
        };
      case '1mes':
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);
        return {
          date_from: oneMonthAgo.toISOString().split('T')[0],
          date_to: today.toISOString().split('T')[0]
        };
      default:
        return {
          date_from: `${currentYear}-01-01`,
          date_to: `${currentYear}-12-31`
        };
    }
  };

  useEffect(() => {
    const range = calculateDateRange(periodo);
    console.log('📅 useDateRange - Período calculado:', { periodo, range });
    setDateRange(range);
  }, [periodo]);

  return { dateRange, setDateRange };
};
