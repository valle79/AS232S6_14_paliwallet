<script lang="ts">
  /**
   * @component NetworkSwitcher.svelte
   * @description Componente para cambiar entre redes blockchain
   * Soporta UTXO Networks y EVM Networks con almacenamiento dinámico
   */

  import { onMount } from 'svelte';
  import { walletService } from '../services/walletService';
  import { EVM_NETWORKS, UTXO_NETWORKS, type NetworkConfig, type NetworkType } from '../config/networkConfig';
  import { showError, showSuccess, showInfo } from '../utils/notifications';

  /* ================================
     STATE (Svelte 5 runes)
  =================================*/
  let isOpen = $state(false);
  let selectedNetworkType = $state<NetworkType>('EVM');
  let isLoading = $state(false);
  let customNetworks = $state<Record<string, NetworkConfig>>({});
  let filterText = $state('');

  /* ================================
     DERIVED VALUES
  =================================*/
  const networksByType = $derived.by(() => {
    const networks = selectedNetworkType === 'EVM' ? EVM_NETWORKS : UTXO_NETWORKS;
    const allNetworks = { ...networks, ...customNetworks };
    
    if (!filterText) return Object.values(allNetworks);
    
    return Object.values(allNetworks).filter(net =>
      net.name.toLowerCase().includes(filterText.toLowerCase()) ||
      net.nativeCurrency.symbol.toLowerCase().includes(filterText.toLowerCase())
    );
  });

  /* ================================
     INITIALIZATION
  =================================*/
  onMount(() => {
    loadCustomNetworks();

    // Close dropdown when clicking outside
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.network-switcher-root')) {
        isOpen = false;
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });

  /* ================================
     FUNCTIONS
  =================================*/

  function loadCustomNetworks(): void {
    try {
      const stored = localStorage.getItem('customNetworks');
      if (stored) {
        customNetworks = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading custom networks:', error);
    }
  }

  function saveCustomNetworks(): void {
    try {
      localStorage.setItem('customNetworks', JSON.stringify(customNetworks));
    } catch (error) {
      console.error('Error saving custom networks:', error);
    }
  }

  async function switchNetwork(network: NetworkConfig): Promise<void> {
    if (!walletService.isConnected) {
      showError('Debe conectar su wallet primero');
      return;
    }

    isLoading = true;

    try {
      // Para redes UTXO, solo informar
      if (network.type === 'UTXO') {
        showInfo(`Red UTXO: ${network.name} — Soporte en desarrollo`);
        isOpen = false;
        isLoading = false;
        return;
      }

      const chainId = typeof network.chainId === 'string' 
        ? parseInt(network.chainId) 
        : network.chainId;

      const chainIdHex = `0x${chainId.toString(16)}`;

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }]
        });

        showSuccess(`Red cambiada a ${network.name}`);
        isOpen = false;
      } catch (error: any) {
        // Si la red no existe, agregarla automáticamente
        if (error.code === 4902) {
          await addNetworkToWallet(network, chainIdHex);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Network switch error:', error);
      showError(`No se pudo cambiar a ${network.name}`);
    } finally {
      isLoading = false;
    }
  }

  async function addNetworkToWallet(network: NetworkConfig, chainIdHex: string): Promise<void> {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName: network.name,
            rpcUrls: network.rpcUrl ? [network.rpcUrl] : [],
            blockExplorerUrls: network.blockExplorerUrl ? [network.blockExplorerUrl] : [],
            nativeCurrency: {
              name: network.nativeCurrency.name,
              symbol: network.nativeCurrency.symbol,
              decimals: network.nativeCurrency.decimals
            }
          }
        ]
      });

      showSuccess(`Red ${network.name} agregada y activada automáticamente`);
      isOpen = false;
    } catch (error) {
      console.error('Network add error:', error);
      throw new Error('NETWORK_ADD_FAILED');
    }
  }

  function setNetworkType(type: NetworkType): void {
    selectedNetworkType = type;
    filterText = '';
  }

  function getNetworkBadge(network: NetworkConfig): string {
    if (network.isCustom) return '⭐';
    if (network.isTestnet) return '🧪';
    return '';
  }
</script>

<div class="relative network-switcher-root">
  <!-- Trigger Button -->
  <button
    onclick={() => (isOpen = !isOpen)}
    class="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600/50 text-slate-200 rounded-xl font-semibold text-sm transition-all duration-200"
    disabled={isLoading}
  >
    <span class="text-base">⛓️</span>
    <span class="max-w-[140px] truncate hidden sm:inline">
      {walletService.currentNetwork?.name || 'Red'}
    </span>
    <span class="transition-transform duration-300 text-xs text-slate-500 {isOpen ? 'rotate-180' : ''}">
      ▼
    </span>
  </button>

  <!-- Dropdown Menu -->
  {#if isOpen}
    <div
      class="absolute right-0 mt-2 w-[360px] bg-[#0f172a] rounded-xl shadow-2xl z-50 border border-slate-700/50 overflow-hidden"
      role="menu"
    >
      <!-- Header -->
      <div class="p-4 border-b border-slate-700/50">
        <h3 class="font-bold text-white text-sm mb-3">Cambiar Red Blockchain</h3>

        <!-- Type Selector -->
        <div class="flex gap-1.5 mb-3 bg-slate-800/60 p-1 rounded-lg">
          <button
            onclick={() => setNetworkType('EVM')}
            class="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 {selectedNetworkType === 'EVM'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'}"
          >
            ⛓️ EVM Networks
          </button>
          <button
            onclick={() => setNetworkType('UTXO')}
            class="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 {selectedNetworkType === 'UTXO'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'}"
          >
            ₿ UTXO Networks
          </button>
        </div>

        <!-- Search -->
        <input
          bind:value={filterText}
          type="text"
          placeholder="Buscar red..."
          class="w-full px-3 py-2 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
        />
      </div>

      <!-- Network List -->
      <div class="max-h-72 overflow-y-auto">
        {#if networksByType.length === 0}
          <div class="p-6 text-center text-slate-500 text-sm">
            <p>No se encontraron redes</p>
          </div>
        {:else}
          {#each networksByType as network (network.chainId)}
            <button
              onclick={() => switchNetwork(network)}
              disabled={isLoading}
              class="w-full px-4 py-3 border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors duration-150 text-left disabled:opacity-50 disabled:cursor-not-allowed {walletService.currentNetwork?.chainId?.toString() === network.chainId?.toString()
                ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
                : ''}"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-semibold text-white text-sm">
                      {network.name}
                    </span>
                    {#if getNetworkBadge(network)}
                      <span class="text-xs">{getNetworkBadge(network)}</span>
                    {/if}
                  </div>
                  <div class="text-xs text-slate-500">
                    {network.nativeCurrency.symbol}
                    {#if network.isTestnet}
                      · <span class="text-amber-400/70">Testnet</span>
                    {/if}
                  </div>
                </div>
                {#if walletService.currentNetwork?.chainId?.toString() === network.chainId?.toString()}
                  <span class="text-emerald-400 text-sm font-bold">✓</span>
                {/if}
              </div>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="p-3 border-t border-slate-700/50 text-xs text-slate-500">
        <p>💡 Las redes desconocidas se agregan automáticamente</p>
      </div>
    </div>
  {/if}
</div>

<style>
  ::-webkit-scrollbar {
    width: 4px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 2px;
  }
</style>
