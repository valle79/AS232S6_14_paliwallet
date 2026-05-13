/**
 * @file networkConfig.ts
 * @description Configuración centralizada de redes blockchain (UTXO y EVM)
 * @author Pali Wallet Team
 */

export type NetworkType = 'UTXO' | 'EVM';

export interface NetworkConfig {
  chainId: number | string;
  name: string;
  type: NetworkType;
  rpcUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
  isTestnet: boolean;
  isCustom?: boolean;
}

/**
 * Redes preconfiguradas (UTXO Networks)
 */
export const UTXO_NETWORKS: Record<string, NetworkConfig> = {
  bitcoin_mainnet: {
    chainId: 'BTC',
    name: 'Bitcoin Mainnet',
    type: 'UTXO',
    nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
    blockExplorerUrl: 'https://blockchain.info',
    isTestnet: false
  },
  bitcoin_testnet: {
    chainId: 'BTC_TESTNET',
    name: 'Bitcoin Testnet',
    type: 'UTXO',
    nativeCurrency: { name: 'Bitcoin Test', symbol: 'tBTC', decimals: 8 },
    blockExplorerUrl: 'https://testnet.blockchain.info',
    isTestnet: true
  },
  litecoin_mainnet: {
    chainId: 'LTC',
    name: 'Litecoin Mainnet',
    type: 'UTXO',
    nativeCurrency: { name: 'Litecoin', symbol: 'LTC', decimals: 8 },
    blockExplorerUrl: 'https://blockchair.com/litecoin',
    isTestnet: false
  }
};

/**
 * Redes preconfiguradas (EVM Networks)
 */
export const EVM_NETWORKS: Record<string, NetworkConfig> = {
  // --- Syscoin / Pali Wallet Ecosystem ---
  syscoin_nevm: {
    chainId: 57,
    name: 'Syscoin NEVM',
    type: 'EVM',
    rpcUrl: 'https://rpc.syscoin.org',
    nativeCurrency: { name: 'Syscoin', symbol: 'SYS', decimals: 18 },
    blockExplorerUrl: 'https://explorer.syscoin.org',
    isTestnet: false
  },
  rollux_mainnet: {
    chainId: 570,
    name: 'Rollux Mainnet',
    type: 'EVM',
    rpcUrl: 'https://rpc.rollux.com',
    nativeCurrency: { name: 'Syscoin', symbol: 'SYS', decimals: 18 },
    blockExplorerUrl: 'https://explorer.rollux.com',
    isTestnet: false
  },
  syscoin_nevm_testnet: {
    chainId: 5700,
    name: 'Syscoin NEVM Testnet',
    type: 'EVM',
    rpcUrl: 'https://rpc.tanenbaum.io',
    nativeCurrency: { name: 'Test Syscoin', symbol: 'TSYS', decimals: 18 },
    blockExplorerUrl: 'https://tanenbaum.io',
    isTestnet: true
  },
  syscoin_tanenbaum: {
    chainId: 57042,
    name: 'zkSYS PoB Devnet',
    type: 'EVM',
    rpcUrl: 'https://rpc-pob.dev11.top/',
    nativeCurrency: { name: 'Test Syscoin', symbol: 'TSYS', decimals: 18 },
    blockExplorerUrl: 'https://explorer-pob.dev11.top',
    isTestnet: true
  },
  zksys_tesnet: {
    chainId: 57057,
    name: 'zkSYS Testnet',
    type: 'EVM',
    rpcUrl: 'https://rpc-zk.tanenbaum.io/',
    nativeCurrency: { name: 'Test Syscoin', symbol: 'TSYS', decimals: 18 },
    blockExplorerUrl: 'https://explorer-zk.tanenbaum.io',
    isTestnet: true
  },
  // --- Ethereum ---
  ethereum_mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    type: 'EVM',
    rpcUrl: 'https://eth.public-rpc.com',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://etherscan.io',
    isTestnet: false
  },
  ethereum_sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    type: 'EVM',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com/',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true
  },
  ethereum_holesky: {
    chainId: 17000,
    name: 'Ethereum Holesky',
    type: 'EVM',
    rpcUrl: 'https://eth-holesky.g.alchemy.com/v2/demo',
    nativeCurrency: { name: 'Holesky ETH', symbol: 'hETH', decimals: 18 },
    blockExplorerUrl: 'https://holesky.etherscan.io',
    isTestnet: true
  },
  ethereum_hoodi: {
    chainId: 560048,
    name: 'Ethereum Hoodi',
    type: 'EVM',
    rpcUrl: 'https://0xrpc.io/hoodi',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://hoodi.etherscan.io',
    isTestnet: true
  },
  // --- Polygon ---
  polygon_mainnet: {
    chainId: 137,
    name: 'Polygon Mainnet',
    type: 'EVM',
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://polygonscan.com',
    isTestnet: false
  },
  polygon_amoy: {
    chainId: 80002,
    name: 'Polygon Amoy',
    type: 'EVM',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    nativeCurrency: { name: 'Amoy MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrl: 'https://amoy.polygonscan.com',
    isTestnet: true
  },
  // --- Base ---
  base_mainnet: {
    chainId: 8453,
    name: 'Base Mainnet',
    type: 'EVM',
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://basescan.org',
    isTestnet: false
  },
  base_sepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    type: 'EVM',
    rpcUrl: 'https://sepolia.base.org',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://sepolia.basescan.org',
    isTestnet: true
  },
  // --- Arbitrum ---
  arbitrum_one: {
    chainId: 42161,
    name: 'Arbitrum One',
    type: 'EVM',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://arbiscan.io',
    isTestnet: false
  },
  arbitrum_sepolia: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    type: 'EVM',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
    isTestnet: true
  }
};

/**
 * Todas las redes disponibles
 */
export const ALL_NETWORKS: Record<string, NetworkConfig> = {
  ...UTXO_NETWORKS,
  ...EVM_NETWORKS
};

/**
 * Obtener configuración de red por chainId
 */
export function getNetworkByChainId(chainId: number | string): NetworkConfig | null {
  return Object.values(ALL_NETWORKS).find(net => net.chainId === chainId) || null;
}

/**
 * Obtener todas las redes de un tipo específico
 */
export function getNetworksByType(type: NetworkType): NetworkConfig[] {
  return Object.values(ALL_NETWORKS).filter(net => net.type === type);
}

/**
 * Validar si una red es personalizada
 */
export function isCustomNetwork(chainId: number | string): boolean {
  return !getNetworkByChainId(chainId)?.chainId;
}
