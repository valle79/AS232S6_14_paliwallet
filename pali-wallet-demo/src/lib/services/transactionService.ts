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
   * Obtener gas estimado para una transacción
   */
  async estimateGas(params: SendTransactionParams): Promise<string> {
    if (!this.provider) throw new Error('PROVIDER_NOT_INITIALIZED');

    try {
      const gasEstimate = await this.provider.estimateGas({
        to: params.to,
        value: params.value ? this.toWei(params.value) : BigInt(0),
        data: params.data
      });

      return gasEstimate.toString();
    } catch (error: any) {
      console.error('Gas estimation error:', error);
      
      // Detectar error de fondos insuficientes
      if (error.code === 'INSUFFICIENT_FUNDS' || error.message?.includes('insufficient funds')) {
        throw new Error('INSUFFICIENT_FUNDS');
      }
      
      throw new Error('GAS_ESTIMATION_FAILED');
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

      // Preparar transacción
      const txData: Partial<ethers.TransactionRequest> = {
        to: this.formatAddress(params.to),
        value: params.value ? this.toWei(params.value) : BigInt(0),
      };

      // Agregar gas estimado si no se proporciona
      if (!params.gasLimit) {
        const estimated = await this.estimateGas(params);
        // Agregar 10% de buffer
        txData.gasLimit = (BigInt(estimated) * BigInt(110)) / BigInt(100);
      } else {
        txData.gasLimit = BigInt(params.gasLimit);
      }

      // Enviar transacción
      const tx = await this.signer.sendTransaction(txData);
      
      // Guardar en historial
      this.transactionHistory.set(tx.hash, {
        hash: tx.hash,
        from: tx.from || '',
        to: params.to,
        value: params.value,
        gasLimit: params.gasLimit || txData.gasLimit?.toString(),
        gasPrice: params.gasPrice,
        confirmations: 0,
        status: 'pending',
        timestamp: Date.now()
      });

      return tx.hash;
    } catch (error: any) {
      console.error('Transaction send error:', error);

      if (error.code === 'ACTION_REJECTED') {
        throw new Error('TRANSACTION_REJECTED');
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
