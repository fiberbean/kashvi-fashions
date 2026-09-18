import { supabase } from './supabase';

/**
 * Sequential Order Number Generator
 * Format: KFOD0001, KFOD0002, KFOD0003...
 */
export async function generateOrderNumber(): Promise<string> {
  const PREFIX = 'KFOD';
  const PADDING = 4; // 4 digits: 0001, 0002, etc.

  try {
    // Database lo 'KFOD' tho start ayye latest order ni fetch cheyadam
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .ilike('id', `${PREFIX}%`)
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Error fetching latest order sequence, using fallback count:', error);
    }

    if (data && data.length > 0) {
      const latestId = data[0].id; // e.g. "KFOD0025"
      const numberPart = latestId.replace(PREFIX, '').trim();
      const nextNum = parseInt(numberPart, 10) + 1;

      if (!isNaN(nextNum)) {
        return `${PREFIX}${String(nextNum).padStart(PADDING, '0')}`;
      }
    }

    // Okavela database lo orders lekapothe count check cheyadam
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .ilike('id', `${PREFIX}%`);

    const nextCount = (count || 0) + 1;
    return `${PREFIX}${String(nextCount).padStart(PADDING, '0')}`;
  } catch (err) {
    console.error('Order generation exception:', err);
    return `${PREFIX}0001`;
  }
}