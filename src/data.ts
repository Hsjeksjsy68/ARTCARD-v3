import { FootballCard, PricePoint } from './types';

function generatePriceHistory(startPrice: number, volatility: number, months: number = 6): PricePoint[] {
  const history: PricePoint[] = [];
  let currentPrice = startPrice;
  const now = new Date();
  
  for (let i = months * 4; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7); // weekly data points
    
    const change = 1 + (Math.random() * volatility * 2 - volatility);
    currentPrice = Math.max(currentPrice * change, 1); // Never drop below $1
    
    history.push({
      date: date.toISOString().split('T')[0],
      price: Number(currentPrice.toFixed(2))
    });
  }
  
  return history;
}

export const cardsDatabase: FootballCard[] = [];

// Initialize price history for mock data
cardsDatabase.forEach(card => {
  let startPrice = 10;
  let volatility = 0.05;

  if (card.rarity === '1-of-1 Shield') { startPrice = 5000; volatility = 0.1; }
  else if (card.rarity === 'Gold Autograph') { startPrice = 450; volatility = 0.08; }
  else if (card.rarity === 'Silver Refractor') { startPrice = 45; volatility = 0.06; }
  
  card.priceHistory = generatePriceHistory(startPrice, volatility);
  card.currentPrice = card.priceHistory[card.priceHistory.length - 1].price;
});
