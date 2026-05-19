<script lang="ts">
  /**
   * @component NetworkManager.svelte
   * @description Componente para gestionar redes personalizadas
   * Permite añadir y eliminar redes de prueba
   */

  import { showError, showSuccess, showInfo } from '../utils/notifications';
  import type { NetworkConfig } from '../config/networkConfig';

  /* ================================
     PROPS
  =================================*/
  let { isConnected = false } = $props();

  /* ================================
     STATE (Svelte 5 runes)
  =================================*/
  let customNetworks = $state<NetworkConfig[]>([]);
  let showAddForm = $state(false);
  
  // Form fields
  let networkName = $state('');
  let chainId = $state('');
  let rpcUrl = $state('');
  let currencySymbol = $state('');
  let explorerUrl = $state('');

  /* ================================
     STORAGE KEY
  =================================*/
  const STORAGE_KEY = 'pali_wallet_custom_networks';

  /* ================================
     LIFECYCLE
  =================================*/
  $effect(() => {
    loadCustomNetworks();
  });

  /* ================================
     FUNCTIONS
  =================================*/

  /**
   * Cargar redes personalizadas desde localStorage
   */
  function loadCustomNetworks(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        customNetworks = JSON.parse(stored);
        console.log('📦 Redes personalizadas cargadas:', customNetworks.length);
      }
    } catch (error) {
      console.error('Error al cargar redes personalizadas:', error);
    }
  }

  /**
   * Guardar redes personalizadas en localStorage
   */
  function saveCustomNetworks(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customNetworks));
      console.log('💾 Redes personalizadas guardadas');
    } catch (error) {
      console.error('Error al guardar redes personalizadas:', error);
    }
  }

  /**
   * Añadir nueva red personalizada
   */
  function addCustomNetwork(): void {
    // Validaciones
    if (!networkName.trim()) {
      showError('Ingresa un nombre para la red');
      return;
    }

    if (!chainId.trim() || isNaN(parseInt(chainId))) {
      showError('Chain ID debe ser un número válido');
      return;
    }

    if (!rpcUrl.trim() || !rpcUrl.startsWith('http')) {
      showError('RPC URL debe ser una URL válida (http/https)');
      return;
    }

    if (!currencySymbol.trim()) {
      showError('Ingresa el símbolo de la moneda');
      return;
    }

    // Verificar si ya existe una red con ese chainId
    const exists = customNetworks.some(net => net.chainId.toString() === chainId);
    if (exists) {
      showError('Ya existe una red con ese Chain ID');
      return;
    }

    // Crear nueva red
    const newNetwork: NetworkConfig = {
      chainId: parseInt(chainId),
      name: networkName,
      type: 'EVM',
      rpcUrl: rpcUrl,
      nativeCurrency: {
        name: currencySymbol,
        symbol: currencySymbol,
        decimals: 18
      },
      blockExplorerUrl: explorerUrl || undefined,
      isTestnet: true,
      isCustom: true
    };

    // Añadir a la lista
    customNetworks = [...customNetworks, newNetwork];
    saveCustomNetworks();

    showSuccess(`✅ Red "${networkName}" añadida correctamente`);

    // Resetear formulario
    resetForm();
    showAddForm = false;
  }

  /**
   * Eliminar red personalizada
   */
  function removeCustomNetwork(chainId: number | string): void {
    const network = customNetworks.find(net => net.chainId === chainId);
    if (!network) return;

    if (confirm(`¿Estás seguro de eliminar la red "${network.name}"?`)) {
      customNetworks = customNetworks.filter(net => net.chainId !== chainId);
      saveCustomNetworks();
      showSuccess(`🗑️ Red "${network.name}" eliminada`);
    }
  }

  /**
   * Resetear formulario
   */
  function resetForm(): void {
    networkName = '';
    chainId = '';
    rpcUrl = '';
    currencySymbol = '';
    explorerUrl = '';
  }

  /**
   * Añadir red a PaliWallet
   */
  async function addNetworkToWallet(network: NetworkConfig): Promise<void> {
    if (typeof window === 'undefined' || !window.ethereum) {
      showError('PaliWallet no está disponible');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${network.chainId.toString(16)}`,
          chainName: network.name,
          nativeCurrency: network.nativeCurrency,
          rpcUrls: [network.rpcUrl],
          blockExplorerUrls: network.blockExplorerUrl ? [network.blockExplorerUrl] : undefined
        }]
      });

      showSuccess(`✅ Red "${network.name}" añadida a PaliWallet`);
    } catch (error: any) {
      console.error('Error al añadir red a wallet:', error);
      
      if (error.code === 4001) {
        showError('Operación rechazada por el usuario');
      } else {
        showError('Error al añadir red a PaliWallet');
      }
    }
  }
</script>

<div class="w-full">
  <!-- Card Principal -->
  <div class="glass-card p-8">
    <!-- Header -->
    <div class="mb-8">
      <h2 class="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <span>🌐</span> Gestión de Redes
      </h2>
      <p class="text-sm text-slate-400">
        Añade o elimina redes de prueba personalizadas
      </p>
    </div>

    <!-- Add Network Button -->
    <button
      type="button"
      onclick={() => showAddForm = !showAddForm}
      class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition text-sm mb-6 flex items-center justify-center gap-2"
    >
      {showAddForm ? '❌ Cancelar' : '➕ Añadir Red Personalizada'}
    </button>

    <!-- Add Network Form -->
    {#if showAddForm}
      <div class="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 mb-6">
        <h3 class="text-lg font-bold text-white mb-4">Nueva Red</h3>
        
        <form onsubmit={(e) => { e.preventDefault(); addCustomNetwork(); }} class="space-y-4">
          <!-- Network Name -->
          <div>
            <label for="network-name" class="block text-sm font-semibold text-slate-300 mb-2">
              Nombre de la Red
            </label>
            <input
              id="network-name"
              bind:value={networkName}
              type="text"
              placeholder="Ej: Mi Red de Prueba"
              class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
            />
          </div>

          <!-- Chain ID -->
          <div>
            <label for="chain-id" class="block text-sm font-semibold text-slate-300 mb-2">
              Chain ID
            </label>
            <input
              id="chain-id"
              bind:value={chainId}
              type="number"
              placeholder="Ej: 12345"
              class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
            />
          </div>

          <!-- RPC URL -->
          <div>
            <label for="rpc-url" class="block text-sm font-semibold text-slate-300 mb-2">
              RPC URL
            </label>
            <input
              id="rpc-url"
              bind:value={rpcUrl}
              type="url"
              placeholder="https://rpc.example.com"
              class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm font-mono"
            />
          </div>

          <!-- Currency Symbol -->
          <div>
            <label for="currency-symbol" class="block text-sm font-semibold text-slate-300 mb-2">
              Símbolo de Moneda
            </label>
            <input
              id="currency-symbol"
              bind:value={currencySymbol}
              type="text"
              placeholder="Ej: ETH, TSYS"
              class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
            />
          </div>

          <!-- Explorer URL (Optional) -->
          <div>
            <label for="explorer-url" class="block text-sm font-semibold text-slate-300 mb-2">
              Block Explorer URL (Opcional)
            </label>
            <input
              id="explorer-url"
              bind:value={explorerUrl}
              type="url"
              placeholder="https://explorer.example.com"
              class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm font-mono"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-sm"
          >
            ✅ Guardar Red
          </button>
        </form>
      </div>
    {/if}

    <!-- Custom Networks List -->
    {#if customNetworks.length > 0}
      <div class="space-y-3">
        <h3 class="text-lg font-bold text-white mb-4">Redes Personalizadas ({customNetworks.length})</h3>
        
        {#each customNetworks as network (network.chainId)}
          <div class="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h4 class="text-white font-bold text-base">{network.name}</h4>
                <p class="text-slate-400 text-xs mt-1">Chain ID: {network.chainId}</p>
              </div>
              <span class="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded">
                {network.nativeCurrency.symbol}
              </span>
            </div>

            <div class="space-y-2 mb-4">
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-500 w-16">RPC:</span>
                <code class="flex-1 text-slate-300 font-mono truncate">{network.rpcUrl}</code>
              </div>
              {#if network.blockExplorerUrl}
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-slate-500 w-16">Explorer:</span>
                  <code class="flex-1 text-slate-300 font-mono truncate">{network.blockExplorerUrl}</code>
                </div>
              {/if}
            </div>

            <div class="flex gap-2">
              <button
                type="button"
                onclick={() => addNetworkToWallet(network)}
                class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
              >
                ➕ Añadir a Wallet
              </button>
              <button
                type="button"
                onclick={() => removeCustomNetwork(network.chainId)}
                class="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition"
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="bg-slate-800/20 border border-slate-700/30 rounded-xl p-8 text-center">
        <p class="text-slate-500 text-sm">
          No hay redes personalizadas. Añade una para comenzar.
        </p>
      </div>
    {/if}
  </div>
</div>
