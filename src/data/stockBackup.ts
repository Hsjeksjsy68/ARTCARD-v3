import stockBackupData from './stockBackup.json';
import { FootballCard } from '../types';

export interface StockBackupSnapshot {
  backupTitle: string;
  backupTimestamp: string;
  backupVersion: string;
  description: string;
  defaultRarityStockRules: Record<string, { defaultStock: number; defaultMaxSupply: number }>;
  archivedCards: Array<{
    cardNumber: string;
    player: string;
    rarity: string;
    stock: number;
    maxSupply: number;
    team: string;
    nationalTeam?: string;
  }>;
}

export const STOCK_BACKUP_SNAPSHOT: StockBackupSnapshot = stockBackupData as StockBackupSnapshot;

/**
 * Creates a dynamic stock backup snapshot from the currently loaded cards in memory or Firestore
 */
export function generateLiveStockBackup(cards: FootballCard[]): StockBackupSnapshot {
  return {
    backupTitle: `Stock Backup Snapshot (${new Date().toISOString().split('T')[0]})`,
    backupTimestamp: new Date().toISOString(),
    backupVersion: '1.1.0',
    description: 'Archived snapshot of stock counts and supply limits captured before or during stock removal.',
    defaultRarityStockRules: STOCK_BACKUP_SNAPSHOT.defaultRarityStockRules,
    archivedCards: cards.map(c => ({
      cardNumber: c.cardNumber || '—',
      player: c.player,
      rarity: c.rarity,
      stock: c.stock !== undefined ? c.stock : (STOCK_BACKUP_SNAPSHOT.defaultRarityStockRules[c.rarity]?.defaultStock || 50),
      maxSupply: c.maxSupply !== undefined ? c.maxSupply : (STOCK_BACKUP_SNAPSHOT.defaultRarityStockRules[c.rarity]?.defaultMaxSupply || 50),
      team: c.team || '',
      nationalTeam: c.nationalTeam
    }))
  };
}

/**
 * Utility to download the stock backup as a formatted JSON file
 */
export function downloadStockBackupJSON(cards?: FootballCard[]) {
  const data = cards && cards.length > 0 ? generateLiveStockBackup(cards) : STOCK_BACKUP_SNAPSHOT;
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `artcard_stock_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
