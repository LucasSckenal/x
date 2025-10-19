// lib/getStockPrice.ts
import axios from 'axios';

export interface StockPrice {
  lastPrice: number;
  change: number; // variação desde a última atualização
  changePercent: number;
}

export const getStockPrice = async (ticker: string): Promise<StockPrice | null> => {
  try {
    const res = await axios.get(`https://brapi.dev/api/quote/${ticker}`);
    const data = res.data.results[0];
    if (!data) return null;

    return {
      lastPrice: data.regularMarketPrice,
      change: data.change,
      changePercent: data.changePercent
    };
  } catch (error) {
    console.error("Erro ao buscar preço da ação:", error);
    return null;
  }
};
