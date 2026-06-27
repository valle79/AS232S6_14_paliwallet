export interface FaucetInfo {
  chainId: number | string;
  networkName: string;
  currency: string;
  rpcUrl: string;
  blockExplorerUrl?: string;
  dripAmount: string;
  isActive: boolean;
  contractAddress?: string;
  tokenAddress?: string;
  faucetType?: 'native' | 'erc20';
}

export const FAUCET_ABI = [
  'function requestTokens(address recipient) external',
  'function claimFor(address user) external'
];

export const FAUCET_FULL_ABI = [
  'function claim() external',
  'function claimFor(address user) external',
  'function claimGasless(address user,uint256 deadline,bytes signature) external',
  'function token() view returns (address)',
  'function dripAmount() view returns (uint256)',
  'function cooldown() view returns (uint256)',
  'function lastClaimTime(address) view returns (uint256)',
  'function gasRefund() view returns (uint256)',
  'function relayers(address) view returns (bool)',
  'function nonces(address) view returns (uint256)',
  'function owner() view returns (address)',
  'event TokensClaimed(address indexed user, uint256 amount)',
  'event GasRefunded(address indexed user, uint256 amount)'
];

export const TOKEN_MIN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

export const FAUCET_NETWORKS: FaucetInfo[] = [
  {
    chainId: 5700,
    networkName: 'Syscoin NEVM Testnet',
    currency: 'TSYS',
    rpcUrl: 'https://rpc.tanenbaum.io',
    blockExplorerUrl: 'https://tanenbaum.io',
    dripAmount: '10',
    isActive: true,
    contractAddress: '0xFe1254f698773A071B33CF2d0fff94c5D9E6759E',
    faucetType: 'native'
  },
  {
    chainId: 57042,
    networkName: 'zkSYS PoB Devnet',
    currency: 'TSYS',
    rpcUrl: 'https://rpc-pob.dev11.top/',
    blockExplorerUrl: 'https://explorer-pob.dev11.top',
    dripAmount: '10',
    isActive: false,
    faucetType: 'native'
  },
  {
    chainId: 57057,
    networkName: 'zkSYS Testnet',
    currency: 'TSYS',
    rpcUrl: 'https://rpc-zk.tanenbaum.io/',
    blockExplorerUrl: 'https://explorer-zk.tanenbaum.io',
    dripAmount: '1',
    isActive: true,
    faucetType: 'native'
  },
  {
    chainId: 11155111,
    networkName: 'Sepolia',
    currency: 'FCT',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com/',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    dripAmount: '0.01',
    isActive: true,
    contractAddress: '0x652c9ACcC53e765e1d96e2455E618dAaB79bA595',
    tokenAddress: '0xd9145CCE52D386f254917e481eB44e9943F39138',
    faucetType: 'erc20'
  },
  {
    chainId: 17000,
    networkName: 'Ethereum Holesky',
    currency: 'hETH',
    rpcUrl: 'https://eth-holesky.g.alchemy.com/v2/demo',
    blockExplorerUrl: 'https://holesky.etherscan.io',
    dripAmount: '0.5',
    isActive: true,
    faucetType: 'native'
  },
  {
    chainId: 560048,
    networkName: 'Ethereum Hoodi',
    currency: 'ETH',
    rpcUrl: 'https://0xrpc.io/hoodi',
    blockExplorerUrl: 'https://hoodi.etherscan.io',
    dripAmount: '0.1',
    isActive: true,
    faucetType: 'native'
  },
  {
    chainId: 80002,
    networkName: 'Polygon Amoy',
    currency: 'MATIC',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorerUrl: 'https://amoy.polygonscan.com',
    dripAmount: '1',
    isActive: true,
    faucetType: 'native'
  },
  {
    chainId: 84532,
    networkName: 'Base Sepolia',
    currency: 'ETH',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia.basescan.org',
    dripAmount: '0.1',
    isActive: true,
    faucetType: 'native'
  },
  {
    chainId: 421614,
    networkName: 'Arbitrum Sepolia',
    currency: 'ETH',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
    dripAmount: '0.1',
    isActive: true,
    faucetType: 'native'
  }
];

export function getFaucetByChainId(chainId: number | string): FaucetInfo | null {
  return FAUCET_NETWORKS.find(f => f.chainId.toString() === chainId.toString()) || null;
}
