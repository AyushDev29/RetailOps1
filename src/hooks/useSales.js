import { useState, useEffect } from 'react';
import { getSales } from '../services/salesService';

export function useSales(filters) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      const data = await getSales(filters);
      setSales(data);
      setLoading(false);
    };
    fetchSales();
  }, [filters]);

  return { sales, loading };
}
