import { ethers } from 'ethers';
import { formatAddress } from '../utils/formatters.js';
import { getNetworkByChainId } from '../config/networkConfig';

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
    pali?: any;
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
    
    // Verificar si ethereum es PaliWallet
    if (window.ethereum?.isPali) {
      return window.ethereum;
    }
    
    // Priorizar PaliWallet si está disponible en window.pali
    // pero verificar que tenga el método request
    if (window.pali && typeof window.pali.request === 'function') {
      return window.pali;
    }
    
    // Fallback a ethereum genérico (MetaMask u otros)
    if (window.ethereum) {
      return window.ethereum;
    }
    
    return undefined;
  }

  isWalletInstalled(): boolean {
    return !!this.ethereum;
  }

  isPaliWalletInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.ethereum?.isPali || (window.pali && typeof window.pali.request === 'function'));
  }

  getWalletType(): 'pali' | 'metamask' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';
    
    if (window.ethereum?.isPali) return 'pali';
    if (window.pali && typeof window.pali.request === 'function') return 'pali';
    if (window.ethereum?.isMetaMask) return 'metamask';
    
    return 'unknown';
  }

  async waitForWallet(timeout = 5000): Promise<boolean> {
    if (this.isWalletInstalled()) {
      return true;
    }

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
    if (!this.ethereum) {
      throw new Error('WALLET_NOT_INSTALLED');
    }

    console.log('🔧 Inicializando provider...');
    console.log('Chain type:', this.ethereum.chainType);

    this.provider = new ethers.BrowserProvider(this.ethereum);

    try {
      const network = await this.provider.getNetwork();
      console.log('✅ Provider inicializado correctamente. Network:', network);
    } catch (error) {
      console.error('❌ Error al inicializar provider:', error);
      
      // Si falla, podría ser que esté en modo UTXO puro (Bitcoin/Litecoin)
      if (this.ethereum.chainType === 'bitcoin' || this.ethereum.chainType === 'litecoin') {
        throw new Error('WALLET_IN_UTXO_MODE');
      }
      
      throw new Error('PROVIDER_INITIALIZATION_ERROR');
    }
  }

  async getNetworkInfo(): Promise<NetworkInfo> {
    if (!this.provider) throw new Error('PROVIDER_NOT_INITIALIZED');

    // Create a Promise with a 10-second timeout
    const networkPromise = new Promise<NetworkInfo>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('NETWORK_INFO_TIMEOUT'));
      }, 10000);

      this.provider!.getNetwork()
        .then((network) => {
          clearTimeout(timeoutId);
          const chainIdStr = network.chainId.toString();

          // Resolve name: 1) Our networkConfig, 2) Pali Wallet fallback map, 3) ethers.js name
          const resolvedName = this.resolveChainName(chainIdStr, network.name);

          resolve({
            chainId: chainIdStr,
            name: resolvedName
          });
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });

    return networkPromise;
  }

  /**
   * Resolve a human-readable chain name from chainId.
   * ethers.js returns "unknown" for chains it doesn't recognize, so we
   * check our own config and a fallback map of Pali Wallet networks first.
   */
  private resolveChainName(chainId: string, ethersName: string): string {
    // 1) Check our networkConfig.ts
    const configNetwork = getNetworkByChainId(parseInt(chainId));
    if (configNetwork) return configNetwork.name;

    // Also check with string key (UTXO networks use string chainIds)
    const configNetworkStr = getNetworkByChainId(chainId);
    if (configNetworkStr) return configNetworkStr.name;

    // 2) Fallback map for Pali Wallet / Syscoin ecosystem networks
    const paliNetworkNames: Record<string, string> = {
      '57': 'Syscoin NEVM',
      '570': 'Rollux Mainnet',
      '5700': 'Syscoin NEVM Testnet',
      '57000': 'zkSYS PoB Devnet',
      '57042': 'Syscoin Tanenbaum Testnet',
      '57057': 'zkSYS Tesnet',
      '5': 'Goerli Testnet',
      '10': 'Optimism',
      '56': 'BNB Smart Chain',
      '97': 'BSC Testnet',
      '43114': 'Avalanche C-Chain',
      '43113': 'Avalanche Fuji Testnet',
      '250': 'Fantom Opera',
      '100': 'Gnosis Chain'
    };

    if (paliNetworkNames[chainId]) return paliNetworkNames[chainId];

    // 3) Use ethers.js name only if it's not "unknown"
    if (ethersName && ethersName !== 'unknown') return ethersName;

    // 4) Last resort
    return `Chain ${chainId}`;
  }

  /* ===== Eventos ===== */

  private handleAccountsChanged = (accounts: string[]) => {
    console.log('👤 accountsChanged event:', accounts);
    
    if (!accounts.length) return this.handleDisconnection();

    this.currentAddress = accounts[0];
    this.onAccountChangedCallback?.(accounts[0]);
  };

private handleChainChanged = async (chainId: string) => {
  try {
    this.provider = null;
    this.signer = null;

    await this.initializeProvider();

    if (this.provider) {
      this.signer = await this.provider.getSigner();
    }

    this.currentNetwork = await this.getNetworkInfo();

    // 🔥 FORZAR actualización real
    const balance = await this.getBalance();

    this.onChainChangedCallback?.(chainId);

    console.log('🌐 Nueva red:', this.currentNetwork);
    console.log('💰 Nuevo balance:', balance);

  } catch (error) {
    console.error('❌ Error al manejar cambio de red:', error);
  }
};

  private handleDisconnectEvent = () => {
    this.handleDisconnection();
  };

  private setupEventListeners(): void {
    if (!this.ethereum) return;

    this.cleanup();

    console.log('🎧 Configurando event listeners...');
    
    this.ethereum.on('accountsChanged', this.handleAccountsChanged);
    this.ethereum.on('chainChanged', this.handleChainChanged);
    this.ethereum.on('disconnect', this.handleDisconnectEvent);
    
    console.log('✅ Event listeners configurados');
  }

  private handleDisconnection(): void {
    this.isConnected = false;
    this.currentAddress = null;
    this.signer = null;
    this.provider = null;
    this.currentNetwork = null;

    this.onDisconnectCallback?.();
  }

  cleanup(): void {
    if (!this.ethereum?.removeListener) return;

    this.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
    this.ethereum.removeListener('chainChanged', this.handleChainChanged);
    this.ethereum.removeListener('disconnect', this.handleDisconnectEvent);
  }

  /* ===== Conexión ===== */

  async connectWallet(): Promise<string> {
    if (!this.ethereum) {
      throw new Error('WALLET_NOT_INSTALLED');
    }

    console.log('🔗 Conectando con:', this.getWalletType());
    console.log('Provider:', this.ethereum);
    console.log('Chain type:', this.ethereum.chainType);

    // Always create a fresh provider to avoid stale cache after disconnect
    await this.initializeProvider();

    try {
      console.log('📡 Solicitando cuentas a PaliWallet...');
      
      // Create a Promise with a 15-second timeout
      const connectionPromise = new Promise<string[]>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          console.error('❌ Timeout esperando respuesta de PaliWallet');
          reject(new Error('CONNECTION_TIMEOUT'));
        }, 15000);

        this.ethereum!.request({
          method: 'eth_requestAccounts'
        })
          .then((accounts: string[]) => {
            clearTimeout(timeoutId);
            console.log('✅ Cuentas recibidas:', accounts);
            resolve(accounts);
          })
          .catch((error: any) => {
            clearTimeout(timeoutId);
            console.error('❌ Error en eth_requestAccounts:', error);
            reject(error);
          });
      });

      const accounts: string[] = await connectionPromise;

      if (!accounts.length) {
        throw new Error('NO_ACCOUNTS_FOUND');
      }

      console.log('✅ Obteniendo signer...');
      this.signer = await this.provider!.getSigner();
      this.currentAddress = accounts[0];
      this.isConnected = true;
      this.currentNetwork = await this.getNetworkInfo();

      this.setupEventListeners();

      console.log('✅ Conexión completada');
      return accounts[0];

    } catch (error: any) {
      console.error('❌ Error completo:', error);

      if (error.message === 'CONNECTION_TIMEOUT') throw new Error('CONNECTION_TIMEOUT');
      if (error.message === 'WALLET_IN_UTXO_MODE') throw error;
      if (error.code === 4001 || error.message?.includes('User rejected')) throw new Error('CONNECTION_REJECTED');
      if (error.code === -32002) throw new Error('CONNECTION_PENDING');

      throw new Error('CONNECTION_ERROR');
    }
  }

  async disconnectWallet(): Promise<void> {
    this.cleanup();
    // Reset state — this fires onDisconnectCallback
    this.handleDisconnection();
  }

  async autoConnect(): Promise<boolean> {
    if (!this.ethereum) {
      return false;
    }

    try {
      // Create a Promise with a 5-second timeout for autoConnect
      const accountsPromise = new Promise<string[]>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('AUTOCONNECT_TIMEOUT'));
        }, 5000);

        this.ethereum!.request({
          method: 'eth_accounts'
        })
          .then((accounts: string[]) => {
            clearTimeout(timeoutId);
            resolve(accounts);
          })
          .catch((error: any) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });

      const accounts: string[] = await accountsPromise;

      if (!accounts.length) {
        return false;
      }

      await this.initializeProvider();

      this.signer = await this.provider!.getSigner();
      this.currentAddress = accounts[0];
      this.isConnected = true;
      this.currentNetwork = await this.getNetworkInfo();

      this.setupEventListeners();

      return true;
    } catch (error) {
      console.warn('AutoConnect failed:', error);
      return false;
    }
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

    try {
      // Create a Promise with a 10-second timeout
      const balancePromise = new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('BALANCE_FETCH_TIMEOUT'));
        }, 10000);

        this.provider!.getBalance(this.currentAddress!)
          .then((balanceWei) => {
            clearTimeout(timeoutId);
            resolve(ethers.formatEther(balanceWei));
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });

      return await balancePromise;
    } catch {
      throw new Error('BALANCE_FETCH_ERROR');
    }
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

  /* ===== Accessors ===== */

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }

  /* ===== Utils ===== */

  getCurrencySymbol(chainId: string): string {
    const map: Record<string, string> = {
      '1': 'ETH',
      '5': 'ETH',
      '11155111': 'ETH',
      '137': 'MATIC',
      '80001': 'MATIC',
      '80002': 'MATIC',
      '57': 'SYS',
      '5700': 'SYS',
      '570': 'SYS',
      '57042': 'TSYS',
      '57000': 'TSYS',
      '8453': 'ETH',
      '84531': 'ETH',
      '84532': 'ETH',
      '42161': 'ETH',
      '421614': 'ETH',
      '17000': 'hETH'
    };

    return map[chainId] ?? 'ETH';
  }

  onAccountChanged(cb: (address: string) => void) {
    this.onAccountChangedCallback = cb;
  }

  onChainChanged(cb: (chainId: string) => void) {
    this.onChainChangedCallback = cb;
  }

  onDisconnect(cb: () => void) {
    this.onDisconnectCallback = cb;
  }
}

/* ===== Singleton ===== */

export const walletService = new WalletService();