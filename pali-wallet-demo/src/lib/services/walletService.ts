import { ethers } from 'ethers';
import { formatAddress } from '../utils/formatters.js';

/* ===== Tipos ===== */

interface NetworkInfo {
  chainId: string;
  name: string;
}

interface BalanceInfo {
  balance: string;
  network: string;
  chainId: string;
  currency: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

/* ===== Servicio ===== */

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  public isConnected = false;
  public currentAddress: string | null = null;
  public currentNetwork: NetworkInfo | null = null;

  private onAccountChangedCallback: ((address: string) => void) | null = null;
  private onChainChangedCallback: ((chainId: string) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  /* ===== Utils ===== */

  private get ethereum() {
    if (typeof window === 'undefined') return undefined;
    return window.ethereum;
  }

  isWalletInstalled(): boolean {
    return !!this.ethereum;
  }

  async waitForWallet(timeout = 3000): Promise<boolean> {
    if (this.isWalletInstalled()) return true;

    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (this.isWalletInstalled()) {
          clearInterval(interval);
          resolve(true);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
      }, timeout);
    });
  }

  /* ===== Provider ===== */

  async initializeProvider(): Promise<void> {
    if (!this.ethereum) throw new Error('WALLET_NOT_INSTALLED');

    this.provider = new ethers.BrowserProvider(this.ethereum);
    await this.provider.getNetwork();
  }

  async getNetworkInfo(): Promise<NetworkInfo> {
    if (!this.provider) throw new Error('PROVIDER_NOT_INITIALIZED');

    const network = await this.provider.getNetwork();

    return {
      chainId: network.chainId.toString(),
      name: network.name
    };
  }

  /* ===== Eventos ===== */

  private setupEventListeners(): void {
    if (!this.ethereum) return;

    this.cleanup();

    this.ethereum.on('accountsChanged', (accounts: string[]) => {
      if (!accounts.length) return this.handleDisconnection();

      this.currentAddress = accounts[0];
      this.onAccountChangedCallback?.(accounts[0]);
    });

    this.ethereum.on('chainChanged', (chainId: string) => {
      this.onChainChangedCallback?.(chainId);
    });

    this.ethereum.on('disconnect', () => {
      this.handleDisconnection();
    });
  }

  private handleDisconnection(): void {
    this.isConnected = false;
    this.currentAddress = null;
    this.signer = null;
    this.currentNetwork = null;
    this.onDisconnectCallback?.();
  }

  cleanup(): void {
    if (!this.ethereum?.removeListener) return;

    this.ethereum.removeListener('accountsChanged', () => {});
    this.ethereum.removeListener('chainChanged', () => {});
    this.ethereum.removeListener('disconnect', () => {});
  }

  /* ===== Conexión ===== */

  async connectWallet(): Promise<string> {
    if (!this.ethereum) throw new Error('WALLET_NOT_INSTALLED');

    if (!this.provider) await this.initializeProvider();

    try {
      const accounts: string[] = await this.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts.length) throw new Error('NO_ACCOUNTS_FOUND');

      this.signer = await this.provider!.getSigner();
      this.currentAddress = accounts[0];
      this.isConnected = true;
      this.currentNetwork = await this.getNetworkInfo();

      this.setupEventListeners();

      return accounts[0];

    } catch (error: any) {
      if (error.code === 4001) throw new Error('CONNECTION_REJECTED');
      if (error.code === -32002) throw new Error('CONNECTION_PENDING');
      throw new Error('CONNECTION_ERROR');
    }
  }

  async disconnectWallet(): Promise<void> {
    this.handleDisconnection();
    this.cleanup();
  }

  async autoConnect(): Promise<boolean> {
    if (!this.ethereum) return false;

    const accounts: string[] = await this.ethereum.request({
      method: 'eth_accounts'
    });

    if (!accounts.length) return false;

    await this.initializeProvider();

    this.signer = await this.provider!.getSigner();
    this.currentAddress = accounts[0];
    this.isConnected = true;
    this.currentNetwork = await this.getNetworkInfo();

    this.setupEventListeners();
    return true;
  }

  /* ===== Datos ===== */

  async getAddress(): Promise<string> {
    if (!this.isConnected || !this.currentAddress)
      throw new Error('WALLET_NOT_CONNECTED');

    return this.currentAddress;
  }

  async getFormattedAddress(start = 6, end = 4): Promise<string> {
    return formatAddress(await this.getAddress(), start, end);
  }

  async getBalance(): Promise<string> {
    if (!this.provider || !this.currentAddress)
      throw new Error('WALLET_NOT_CONNECTED');

    const balanceWei = await this.provider.getBalance(this.currentAddress);
    return ethers.formatEther(balanceWei);
  }

  async getBalanceWithNetwork(): Promise<BalanceInfo> {
    const balance = await this.getBalance();
    const network = this.currentNetwork ?? await this.getNetworkInfo();

    return {
      balance,
      network: network.name,
      chainId: network.chainId,
      currency: this.getCurrencySymbol(network.chainId)
    };
  }

  /* ===== Utils ===== */

  getCurrencySymbol(chainId: string): string {
    const map: Record<string,string> = {
      '1':'ETH','5':'ETH','11155111':'ETH',
      '137':'MATIC','80001':'MATIC',
      '57':'SYS','5700':'SYS','570':'SYS',
      '57042':'TSYS','57000':'TSYS',
      '8453':'ETH','84531':'ETH'
    };

    return map[chainId] ?? 'ETH';
  }

  onAccountChanged(cb:(address:string)=>void){ this.onAccountChangedCallback = cb; }
  onChainChanged(cb:(chainId:string)=>void){ this.onChainChangedCallback = cb; }
  onDisconnect(cb:()=>void){ this.onDisconnectCallback = cb; }

}

/* ===== Singleton ===== */

export const walletService = new WalletService();