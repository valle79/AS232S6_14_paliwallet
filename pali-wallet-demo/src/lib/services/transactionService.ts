/**
 * @file transactionService.ts
 * @description Servicio centralizado para gestionar transacciones blockchain
 * @author Pali Wallet Team
 */

import { ethers } from 'ethers';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice?: string;
  gasLimit?: string;
  data?: string;
  nonce?: number;
  confirmations: number;
  status?: 'pending' | 'success' | 'failed';
  timestamp?: number;
  blockNumber?: number;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string;
  gasUsed: string;
  gasPrice: string;
  cumulativeGasUsed: string;
  contractAddress: string | null;
  status: number;
  confirmations: number;
  logs: any[];
}

export interface SendTransactionParams {
  to: string;
  value: string;
  gasPrice?: string;
  gasLimit?: string;
  data?: string;
}

export class TransactionService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private transactionHistory: Map<string, Transaction> = new Map();
  private readonly STORAGE_KEY = 'pali_wallet_transactions';

  constructor() {
    this.loadTransactionsFromStorage();
  }

  /**
   * Cargar transacciones desde localStorage
   */
  private loadTransactionsFromStorage(): void {
    // Solo ejecutar en el navegador (no en SSR)
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const transactions = JSON.parse(stored);
        this.transactionHistory = new Map(Object.entries(transactions));
        console.log('📦 Transacciones cargadas desde localStorage:', this.transactionHistory.size);
      }
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
    }
  }

  /**
   * Guardar transacciones en localStorage
   */
  private saveTransactionsToStorage(): void {
    // Solo ejecutar en el navegador (no en SSR)
    if (typeof window === 'undefined') return;
    
    try {
      const transactions = Object.fromEntries(this.transactionHistory);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
      console.log('💾 Transacciones guardadas en localStorage');
    } catch (error) {
      console.error('Error al guardar transacciones:', error);
    }
  }

  /**
   * Inicializar servicio con provider y signer
   */
  setProvider(provider: ethers.BrowserProvider): void {
    this.provider = provider;
  }

  setSigner(signer: ethers.JsonRpcSigner): void {
    this.signer = signer;
  }

  /**
   * Validar dirección blockchain
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Validar y formatear dirección
   */
  formatAddress(address: string): string {
    if (!this.isValidAddress(address)) {
      throw new Error('INVALID_ADDRESS');
    }
    return ethers.getAddress(address);
  }

  /**
   * Convertir cantidad a Wei
   */
  toWei(amount: string | number): bigint {
    return ethers.parseEther(String(amount));
  }

  /**
   * Convertir Wei a cantidad legible
   */
  fromWei(amount: string | bigint): string {
    return ethers.formatEther(amount);
  }

  /**
   * Obtener gas estimado para una transacción (opcional, no bloquea el envío)
   */
  async estimateGas(params: SendTransactionParams): Promise<string> {
    if (!this.provider) throw new Error('PROVIDER_NOT_INITIALIZED');

    try {
      // Convertir value a string si es número
      const valueStr = String(params.value || '0');
      
      // Asegurar que value sea un bigint válido
      const valueInWei = valueStr && valueStr !== '0' && valueStr !== '' 
        ? this.toWei(valueStr) 
        : BigInt(0);

      console.log('💰 Estimando gas para:', params.to);
      console.log('💰 Valor:', valueStr, '→', valueInWei.toString(), 'wei');

      const gasEstimate = await this.provider.estimateGas({
        to: params.to,
        value: valueInWei
      });

      console.log('✅ Gas estimado:', gasEstimate.toString());
      return gasEstimate.toString();
    } catch (error: any) {
      console.warn('⚠️ No se pudo estimar el gas, pero la transacción puede funcionar igual');
      console.warn('Error:', error.message);
      
      // No lanzar error, devolver un estimado por defecto
      // La transacción puede funcionar igual sin estimación previa
      return '21000'; // Gas mínimo para transferencia simple
    }
  }

  /**
   * Obtener precio del gas actual
   */
  async getGasPrice(): Promise<string> {
    if (!this.provider) throw new Error('PROVIDER_NOT_INITIALIZED');

    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      if (!gasPrice) throw new Error('UNABLE_TO_FETCH_GAS_PRICE');
      return ethers.formatUnits(gasPrice, 'gwei');
    } catch (error) {
      console.error('Gas price fetch error:', error);
      throw new Error('GAS_PRICE_FETCH_FAILED');
    }
  }

  /**
   * Enviar transacción de cuenta a cuenta
   */
  async sendTransaction(params: SendTransactionParams): Promise<string> {
    if (!this.signer) throw new Error('SIGNER_NOT_INITIALIZED');

    try {
      // Validar dirección destino
      if (!this.isValidAddress(params.to)) {
        throw new Error('INVALID_RECIPIENT_ADDRESS');
      }

      // Convertir value a string si es número
      const valueStr = String(params.value || '0');

      // Validar que haya un monto
      if (!valueStr || valueStr === '0' || valueStr === '') {
        throw new Error('INVALID_AMOUNT');
      }

      console.log('💸 Preparando transacción:', { to: params.to, value: valueStr });

      // Preparar transacción
      const valueInWei = this.toWei(valueStr);
      
      const txData: Partial<ethers.TransactionRequest> = {
        to: this.formatAddress(params.to),
        value: valueInWei,
      };

      // NO agregar gasLimit manualmente, dejar que ethers.js lo calcule automáticamente
      // Esto evita problemas con el cálculo de gas
      console.log('📤 Enviando transacción a la red...');
      
      // Enviar transacción
      const tx = await this.signer.sendTransaction(txData);
      
      console.log('✅ Transacción enviada. Hash:', tx.hash);
      
      // Guardar en historial
      this.transactionHistory.set(tx.hash, {
        hash: tx.hash,
        from: tx.from || '',
        to: params.to,
        value: valueStr,
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        confirmations: 0,
        status: 'pending',
        timestamp: Date.now()
      });

      // Guardar en localStorage
      this.saveTransactionsToStorage();

      return tx.hash;
    } catch (error: any) {
      console.error('❌ Transaction send error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        throw new Error('TRANSACTION_REJECTED');
      }
      if (error.message === 'INVALID_AMOUNT') {
        throw error;
      }
      if (error.message === 'INSUFFICIENT_FUNDS' || error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('INSUFFICIENT_FUNDS');
      }
      if (error.message?.includes('insufficient')) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      throw new Error('TRANSACTION_FAILED');
    }
  }

  /**
   * Obtener estado de transacción por hash
   */
  async getTransactionStatus(hash: string): Promise<Transaction | null> {
    if (!this.provider) throw new Error('PROVIDER_NOT_INITIALIZED');

    try {
      const tx = await this.provider.getTransaction(hash);
      if (!tx) return null;

      const receipt = await this.provider.getTransactionReceipt(hash);

      return {
        hash: tx.hash,
        from: tx.from || '',
        to: tx.to || '',
        value: this.fromWei(tx.value),
        gasPrice: this.fromWei(tx.gasPrice || '0'),
        gasLimit: tx.gasLimit?.toString(),
        data: tx.data,
        nonce: tx.nonce,
        confirmations: receipt?.confirmations || 0,
        status: receipt?.status === 1 ? 'success' : 'failed',
        blockNumber: receipt?.blockNumber
      };
    } catch (error) {
      console.error('Transaction status fetch error:', error);
      return null;
    }
  }

  /**
   * Esperar confirmación de transacción
   */
  async waitForTransaction(hash: string, confirmations: number = 1): Promise<TransactionReceipt | null> {
    if (!this.provider) throw new Error('PROVIDER_NOT_INITIALIZED');

    try {
      const receipt = await this.provider.waitForTransaction(hash, confirmations);
      return receipt as unknown as TransactionReceipt;
    } catch (error) {
      console.error('Transaction confirmation error:', error);
      return null;
    }
  }

  /**
   * Obtener historial de transacciones locales
   */
  getTransactionHistory(): Transaction[] {
    return Array.from(this.transactionHistory.values())
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  /**
   * Limpiar historial de transacciones
   */
  clearTransactionHistory(): void {
    this.transactionHistory.clear();
    
    // Solo ejecutar en el navegador (no en SSR)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Historial de transacciones limpiado');
    }
  }

  /**
   * Obtener balance de la cuenta
   */
  async getBalance(address: string): Promise<string> {
    if (!this.provider) throw new Error('PROVIDER_NOT_INITIALIZED');

    try {
      const balance = await this.provider.getBalance(address);
      return this.fromWei(balance);
    } catch (error) {
      console.error('Balance fetch error:', error);
      throw new Error('BALANCE_FETCH_FAILED');
    }
  }

  cleanup(): void {
    this.transactionHistory.clear();
  }
}

// Singleton instance
export const transactionService = new TransactionService();
