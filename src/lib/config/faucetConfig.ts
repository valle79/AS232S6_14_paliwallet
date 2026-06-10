export interface FaucetInfo {
  chainId: number | string;
  networkName: string;
  currency: string;
  rpcUrl: string;
  blockExplorerUrl?: string;
  dripAmount: string;
  isActive: boolean;
}

export const FAUCET_NETWORKS: FaucetInfo[] = [
  {
    chainId: 5700,
    networkName: 'Syscoin NEVM Testnet',
    currency: 'TSYS',
    rpcUrl: 'https://rpc.tanenbaum.io',
    blockExplorerUrl: 'https://tanenbaum.io',
    dripAmount: '10',
    isActive: true
  },
  {
    chainId: 57042,
    networkName: 'zkSYS PoB Devnet',
    currency: 'TSYS',
    rpcUrl: 'https://rpc-pob.dev11.top/',
    blockExplorerUrl: 'https://explorer-pob.dev11.top',
    dripAmount: '10',
    isActive: true
  },
  {
    chainId: 57057,
    networkName: 'zkSYS Testnet',
    currency: 'TSYS',
    rpcUrl: 'https://rpc-zk.tanenbaum.io/',
    blockExplorerUrl: 'https://explorer-zk.tanenbaum.io',
    dripAmount: '10',
    isActive: true
  },
  {
    chainId: 11155111,
    networkName: 'Sepolia',
    currency: 'ETH',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com/',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    dripAmount: '0.1',
    isActive: true
  },
  {
    chainId: 17000,
    networkName: 'Ethereum Holesky',
    currency: 'hETH',
    rpcUrl: 'https://eth-holesky.g.alchemy.com/v2/demo',
    blockExplorerUrl: 'https://holesky.etherscan.io',
    dripAmount: '0.5',
    isActive: true
  },
  {
    chainId: 560048,
    networkName: 'Ethereum Hoodi',
    currency: 'ETH',
    rpcUrl: 'https://0xrpc.io/hoodi',
    blockExplorerUrl: 'https://hoodi.etherscan.io',
    dripAmount: '0.1',
    isActive: true
  },
  {
    chainId: 80002,
    networkName: 'Polygon Amoy',
    currency: 'MATIC',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorerUrl: 'https://amoy.polygonscan.com',
    dripAmount: '1',
    isActive: true
  },
  {
    chainId: 84532,
    networkName: 'Base Sepolia',
    currency: 'ETH',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    dripAmount: '0.1',
    isActive: true
  },
  {
    chainId: 421614,
    networkName: 'Arbitrum Sepolia',
    currency: 'ETH',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
    dripAmount: '0.1',
    isActive: true
  }
];

export function getFaucetByChainId(chainId: number | string): FaucetInfo | null {
  return FAUCET_NETWORKS.find(f => f.chainId.toString() === chainId.toString()) || null;
}
