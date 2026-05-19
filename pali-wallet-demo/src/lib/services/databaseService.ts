/**
 * @file databaseService.ts
 * @description Servicio para gestionar almacenamiento de transacciones en Neon DB
 * @author Pali Wallet Team
 */

import type { Transaction } from './transactionService';

// Verificar si el entorno soporta database
const USE_DATABASE = import.meta.env.VITE_USE_DATABASE === 'true';
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL;

export class DatabaseService {
  private db: any = null;
  private isInitialized = false;

  constructor() {
    if (USE_DATABASE && DATABASE_URL) {
      this.initializeDatabase();
    }
  }

  /**
   * Inicializar conexión a Neon DB
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Importar dinámicamente solo si se va a usar
      const { neon } = await import('@neondatabase/serverless');
      this.db = neon(DATABASE_URL);
      
      this.isInitialized = true;
      console.log('✅ Neon DB inicializado correctamente');
    } catch (error) {
      console.error('❌ Error al inicializar Neon DB:', error);
      console.warn('⚠️ Usando localStorage como fallback');
      this.isInitialized = false;
    }
  }

  /**
   * Verificar si el servicio está usando database
   */
  isUsingDatabase(): boolean {
    return USE_DATABASE && this.isInitialized;
  }

  /**
   * Guardar transacción en la base de datos
   */
  async saveTransaction(tx: Transaction): Promise<boolean> {
    if (!this.isUsingDatabase()) {
      return false; // Fallback a localStorage
    }

    try {
      await this.db`
        INSERT INTO transactions (
          hash, from_address, to_address, value, gas_price, gas_limit,
          data, nonce, confirmations, status, timestamp, block_number,
          chain_id, network_name
        ) VALUES (
          ${tx.hash}, ${tx.from}, ${tx.to}, ${tx.value}, ${tx.gasPrice || null},
          ${tx.gasLimit || null}, ${tx.data || null}, ${tx.nonce || null},
          ${tx.confirmations}, ${tx.status || 'pending'}, ${tx.timestamp || Date.now()},
          ${tx.blockNumber || null}, ${tx.chainId || ''}, ${tx.networkName || ''}
        )
        ON CONFLICT (hash) DO UPDATE SET
          confirmations = EXCLUDED.confirmations,
          status = EXCLUDED.status,
          block_number = EXCLUDED.block_number
      `;
      
      console.log('💾 Transacción guardada en Neon DB:', tx.hash.substring(0, 10) + '...');
      return true;
    } catch (error) {
      console.error('❌ Error al guardar transacción en DB:', error);
      return false;
    }
  }

  /**
   * Obtener todas las transacciones
   */
  async getAllTransactions(): Promise<Transaction[]> {
    if (!this.isUsingDatabase()) {
      return [];
    }

    try {
      const rows = await this.db`
        SELECT * FROM transactions
        ORDER BY timestamp DESC
      `;
      
      return rows.map(this.mapRowToTransaction);
    } catch (error) {
      console.error('❌ Error al obtener transacciones:', error);
      return [];
    }
  }

  /**
   * Obtener transacciones por chain ID
   */
  async getTransactionsByChain(chainId: string): Promise<Transaction[]> {
    if (!this.isUsingDatabase()) {
      return [];
    }

    try {
      const rows = await this.db`
        SELECT * FROM transactions
        WHERE chain_id = ${chainId}
        ORDER BY timestamp DESC
      `;
      
      return rows.map(this.mapRowToTransaction);
    } catch (error) {
      console.error('❌ Error al obtener transacciones por chain:', error);
      return [];
    }
  }

  /**
   * Actualizar estado de una transacción
   */
  async updateTransactionStatus(
    hash: string,
    status: 'pending' | 'success' | 'failed',
    confirmations: number,
    blockNumber?: number
  ): Promise<boolean> {
    if (!this.isUsingDatabase()) {
      return false;
    }

    try {
      await this.db`
        UPDATE transactions
        SET status = ${status},
            confirmations = ${confirmations},
            block_number = ${blockNumber || null}
        WHERE hash = ${hash}
      `;
      
      console.log(`✅ Estado actualizado en DB: ${hash.substring(0, 10)}... → ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Error al actualizar estado en DB:', error);
      return false;
    }
  }

  /**
   * Eliminar todas las transacciones
   */
  async clearAllTransactions(): Promise<boolean> {
    if (!this.isUsingDatabase()) {
      return false;
    }

    try {
      await this.db`DELETE FROM transactions`;
      console.log('🗑️ Todas las transacciones eliminadas de DB');
      return true;
    } catch (error) {
      console.error('❌ Error al limpiar transacciones:', error);
      return false;
    }
  }

  /**
   * Mapear fila de DB a objeto Transaction
   */
  private mapRowToTransaction(row: any): Transaction {
    return {
      hash: row.hash,
      from: row.from_address,
      to: row.to_address,
      value: row.value,
      gasPrice: row.gas_price,
      gasLimit: row.gas_limit,
      data: row.data,
      nonce: row.nonce,
      confirmations: row.confirmations,
      status: row.status,
      timestamp: Number(row.timestamp),
      blockNumber: row.block_number,
      chainId: row.chain_id,
      networkName: row.network_name
    };
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
