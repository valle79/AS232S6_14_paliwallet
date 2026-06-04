<script lang="ts">
  /**
   * @component NetworkManager.svelte
   * @description Componente para gestionar redes personalizadas
   * Permite añadir y eliminar redes de prueba
   */

  import { onMount } from 'svelte';
  import { showError, showSuccess, showInfo } from '../utils/notifications';
  import { walletService } from '../services/walletService';
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
  let showEditModal = $state(false);
  let editingNetwork = $state<NetworkConfig | null>(null);
  
  // Form fields
  let networkName = $state<string>('');
  let chainId = $state<string>('');
  let rpcUrl = $state<string>('');
  let currencySymbol = $state<string>('');
  let explorerUrl = $state<string>('');

  /* ================================
     STORAGE KEY
  =================================*/
  const STORAGE_KEY = 'pali_wallet_custom_networks';

  /* ================================
     REDES PRECARGADAS
  =================================*/
  const PRESET_NETWORKS: NetworkConfig[] = [
    {
      chainId: 57042,
      name: 'zkSYS PoB Devnet',
      type: 'EVM',
      rpcUrl: 'https://rpc-pob.dev11.top/',
      nativeCurrency: { name: 'Test Syscoin', symbol: 'TSYS', decimals: 18 },
      blockExplorerUrl: 'https://explorer-pob.dev11.top',
      isTestnet: true,
      isCustom: true
    },
    {
      chainId: 57057,
      name: 'zkSYS Testnet',
      type: 'EVM',
      rpcUrl: 'https://rpc-zk.tanenbaum.io/',
      nativeCurrency: { name: 'Test Syscoin', symbol: 'TSYS', decimals: 18 },
      blockExplorerUrl: 'https://explorer-zk.tanenbaum.io',
      isTestnet: true,
      isCustom: true
    },
    {
      chainId: 560048,
      name: 'Ethereum Hoodi',
      type: 'EVM',
      rpcUrl: 'https://0xrpc.io/hoodi',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      blockExplorerUrl: 'https://hoodi.etherscan.io',
      isTestnet: true,
      isCustom: true
    },
    {
      chainId: 11155111,
      name: 'Sepolia',
      type: 'EVM',
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com/',
      nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
      blockExplorerUrl: 'https://sepolia.etherscan.io',
      isTestnet: true,
      isCustom: true
    },
    {
      chainId: 17000,
      name: 'Ethereum Holesky',
      type: 'EVM',
      rpcUrl: 'https://eth-holesky.g.alchemy.com/v2/demo',
      nativeCurrency: { name: 'Holesky ETH', symbol: 'hETH', decimals: 18 },
      blockExplorerUrl: 'https://holesky.etherscan.io',
      isTestnet: true,
      isCustom: true
    },
    {
      chainId: 80002,
      name: 'Polygon Amoy',
      type: 'EVM',
      rpcUrl: 'https://rpc-amoy.polygon.technology',
      nativeCurrency: { name: 'Amoy MATIC', symbol: 'MATIC', decimals: 18 },
      blockExplorerUrl: 'https://amoy.polygonscan.com',
      isTestnet: true,
      isCustom: true
    },
    {
      chainId: 84532,
      name: 'Base Sepolia',
      type: 'EVM',
      rpcUrl: 'https://sepolia.base.org',
      nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
      blockExplorerUrl: 'https://sepolia.basescan.org',
      isTestnet: true,
      isCustom: true
    },
    {
      chainId: 421614,
      name: 'Arbitrum Sepolia',
      type: 'EVM',
      rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
      nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
      blockExplorerUrl: 'https://sepolia.arbiscan.io',
      isTestnet: true,
      isCustom: true
    }
  ];

  /* ================================
     LIFECYCLE
  =================================*/
  onMount(() => {
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
    // Validaciones - Convertir a string y validar
    const name = String(networkName || '').trim();
    const chain = String(chainId || '').trim();
    const rpc = String(rpcUrl || '').trim();
    const symbol = String(currencySymbol || '').trim();
    
    if (!name) {
      showError('Ingresa un nombre para la red');
      return;
    }

    if (!chain || isNaN(parseInt(chain))) {
      showError('Chain ID debe ser un número válido');
      return;
    }

    if (!rpc || !rpc.startsWith('http')) {
      showError('RPC URL debe ser una URL válida (http/https)');
      return;
    }

    if (!symbol) {
      showError('Ingresa el símbolo de la moneda');
      return;
    }

    // Verificar si ya existe una red con ese chainId
    const exists = customNetworks.some(net => net.chainId.toString() === chain);
    if (exists) {
      showError('Ya existe una red con ese Chain ID');
      return;
    }

    // Crear nueva red
    const newNetwork: NetworkConfig = {
      chainId: parseInt(chain),
      name: name,
      type: 'EVM',
      rpcUrl: rpc,
      nativeCurrency: {
        name: symbol,
        symbol: symbol,
        decimals: 18
      },
      blockExplorerUrl: explorerUrl || undefined,
      isTestnet: true,
      isCustom: true
    };

    // Añadir a la lista
    customNetworks = [...customNetworks, newNetwork];
    saveCustomNetworks();

    showSuccess(`✅ Red "${name}" añadida correctamente`);

    // Resetear formulario
    resetForm();
    showAddForm = false;
  }

  /**
   * Eliminar red personalizada (marcar como inactiva)
   */
  function removeCustomNetwork(chainId: number | string): void {
    const network = customNetworks.find(net => net.chainId === chainId);
    if (!network) return;

    if (confirm(`¿Desactivar la red "${network.name}"? Podrás reactivarla después.`)) {
      // Marcar como inactiva en lugar de eliminar
      customNetworks = customNetworks.map(net => 
        net.chainId === chainId ? { ...net, isActive: false } : net
      );
      saveCustomNetworks();
      showSuccess(`🔕 Red "${network.name}" desactivada`);
    }
  }

  /**
   * 🔥 NUEVO: Reactivar red
   */
  function reactivateNetwork(chainId: number | string): void {
    const network = customNetworks.find(net => net.chainId === chainId);
    if (!network) return;

    customNetworks = customNetworks.map(net => 
      net.chainId === chainId ? { ...net, isActive: true } : net
    );
    saveCustomNetworks();
    showSuccess(`✅ Red "${network.name}" reactivada`);
  }

  /**
   * 🔥 NUEVO: Eliminar permanentemente
   */
  function deleteNetworkPermanently(chainId: number | string): void {
    const network = customNetworks.find(net => net.chainId === chainId);
    if (!network) return;

    if (confirm(`¿Eliminar permanentemente "${network.name}"? Esta acción no se puede deshacer.`)) {
      customNetworks = customNetworks.filter(net => net.chainId !== chainId);
      saveCustomNetworks();
      showSuccess(`🗑️ Red "${network.name}" eliminada permanentemente`);
    }
  }

  /**
   * 🔥 NUEVO: Abrir modal de edición
   */
  function openEditModal(network: NetworkConfig): void {
    editingNetwork = network;
    networkName = network.name;
    chainId = network.chainId.toString();
    rpcUrl = network.rpcUrl || '';
    currencySymbol = network.nativeCurrency.symbol;
    explorerUrl = network.blockExplorerUrl || '';
    showEditModal = true;
  }

  /**
   * 🔥 NUEVO: Guardar cambios de edición
   */
  function saveEditedNetwork(): void {
    if (!editingNetwork) return;

    const name = String(networkName || '').trim();
    const rpc = String(rpcUrl || '').trim();
    const symbol = String(currencySymbol || '').trim();

    if (!name || !rpc || !symbol) {
      showError('Completa todos los campos obligatorios');
      return;
    }

    customNetworks = customNetworks.map(net => 
      net.chainId === editingNetwork!.chainId
        ? {
            ...net,
            name,
            rpcUrl: rpc,
            nativeCurrency: {
              ...net.nativeCurrency,
              symbol,
              name: symbol
            },
            blockExplorerUrl: explorerUrl || undefined
          }
        : net
    );

    saveCustomNetworks();
    showSuccess(`✅ Red "${name}" actualizada`);
    closeEditModal();
  }

  /**
   * 🔥 NUEVO: Cerrar modal de edición
   */
  function closeEditModal(): void {
    showEditModal = false;
    editingNetwork = null;
    resetForm();
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
      // Crear objeto limpio sin referencias circulares
      const params = {
        chainId: `0x${network.chainId.toString(16)}`,
        chainName: network.name,
        nativeCurrency: {
          name: network.nativeCurrency.name,
          symbol: network.nativeCurrency.symbol,
          decimals: network.nativeCurrency.decimals
        },
        rpcUrls: network.rpcUrl ? [network.rpcUrl] : [],
        blockExplorerUrls: network.blockExplorerUrl ? [network.blockExplorerUrl] : []
      };

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [params]
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

  /**
   * 🔥 NUEVO: Añadir red precargada con un click
   */
  function addPresetNetwork(network: NetworkConfig): void {
    // Verificar si ya existe (activa o inactiva)
    const existing = customNetworks.find(net => net.chainId === network.chainId);
    
    if (existing) {
      if (existing.isActive === false) {
        // Si existe pero está inactiva, reactivarla
        reactivateNetwork(network.chainId);
      } else {
        showError(`La red "${network.name}" ya está activa`);
      }
      return;
    }

    // Añadir nueva red como activa
    customNetworks = [...customNetworks, { ...network, isActive: true }];
    saveCustomNetworks();

    showSuccess(`✅ Red "${network.name}" añadida a tu lista`);
  }

  /**
   * 🔥 NUEVO: Verificar si una red precargada está activa
   */
  function isPresetNetworkActive(chainId: number | string): boolean {
    const network = customNetworks.find(net => net.chainId.toString() === chainId.toString());
    return network ? network.isActive !== false : false;
  }

  /**
   * 🔥 NUEVO: Cambiar a una red específica
   */
  async function switchToNetwork(network: NetworkConfig): Promise<void> {
    if (!isConnected) {
      showError('Debes conectar tu wallet primero');
      return;
    }

    if (typeof window === 'undefined' || !window.ethereum) {
      showError('PaliWallet no está disponible');
      return;
    }

    try {
      const chainIdHex = `0x${network.chainId.toString(16)}`;

      // Intentar cambiar de red
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }]
        });

        showSuccess(`✅ Cambiado a ${network.name}`);
      } catch (error: any) {
        // Si la red no existe (error 4902), agregarla automáticamente
        if (error.code === 4902) {
          const params = {
            chainId: chainIdHex,
            chainName: network.name,
            nativeCurrency: {
              name: network.nativeCurrency.name,
              symbol: network.nativeCurrency.symbol,
              decimals: network.nativeCurrency.decimals
            },
            rpcUrls: network.rpcUrl ? [network.rpcUrl] : [],
            blockExplorerUrls: network.blockExplorerUrl ? [network.blockExplorerUrl] : []
          };

          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [params]
          });

          showSuccess(`✅ Red ${network.name} agregada y activada`);
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Error al cambiar de red:', error);
      
      if (error.code === 4001) {
        showError('Operación rechazada por el usuario');
      } else {
        showError(`No se pudo cambiar a ${network.name}`);
      }
    }
  }

  /**
   * 🔥 NUEVO: Verificar si estamos en una red específica
   */
  function isCurrentNetwork(chainId: number | string): boolean {
    const currentChainId = walletService.currentNetwork?.chainId;
    return currentChainId ? currentChainId.toString() === chainId.toString() : false;
  }

</script>

<div class="w-full">
  <!-- Header General -->
  <div class="mb-6">
    <h2 class="text-2xl font-bold text-white mb-2 flex items-center gap-2">
      <span>🌐</span> Gestión de Redes Blockchain
    </h2>
    <p class="text-sm text-slate-400">
      Añade, elimina y cambia entre redes de prueba
    </p>
  </div>

  <!-- Layout de 2 columnas -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    
    <!-- COLUMNA IZQUIERDA: Redes Precargadas -->
    <div class="glass-card p-6">
      <div class="mb-6">
        <h3 class="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <span>⚡</span> Redes Precargadas
        </h3>
        <p class="text-xs text-slate-400">
          Añade y conecta a redes populares con un click
        </p>
      </div>

      <div class="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {#each PRESET_NETWORKS as network (network.chainId)}
          {@const isActive = isPresetNetworkActive(network.chainId)}
          {@const isCurrent = isCurrentNetwork(network.chainId)}
          
          <div class="bg-slate-800/40 border rounded-xl p-4 transition-all {isCurrent ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700/50 hover:border-slate-600/50'}">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="text-white font-bold text-sm">{network.name}</h4>
                  {#if isCurrent}
                    <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                      ✓ ACTIVA
                    </span>
                  {/if}
                </div>
                <p class="text-slate-400 text-[11px]">Chain ID: {network.chainId}</p>
              </div>
              <span class="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-semibold rounded">
                {network.nativeCurrency.symbol}
              </span>
            </div>

            <div class="space-y-1 mb-3">
              <div class="flex items-center gap-2 text-[10px]">
                <span class="text-slate-500 w-12">RPC:</span>
                <code class="flex-1 text-slate-300 font-mono truncate">{network.rpcUrl}</code>
              </div>
              {#if network.blockExplorerUrl}
                <div class="flex items-center gap-2 text-[10px]">
                  <span class="text-slate-500 w-12">Explorer:</span>
                  <code class="flex-1 text-slate-300 font-mono truncate">{network.blockExplorerUrl}</code>
                </div>
              {/if}
            </div>

            <div class="flex gap-2">
              {#if !isActive}
                <button
                  type="button"
                  onclick={() => addPresetNetwork(network)}
                  class="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg transition"
                >
                  ✓ Añadir a Mi Lista
                </button>
              {:else if isCurrent}
                <button
                  type="button"
                  disabled
                  class="flex-1 px-3 py-2 bg-emerald-600/50 text-white text-[11px] font-semibold rounded-lg cursor-not-allowed"
                >
                  ✓ Red Activa
                </button>
              {:else}
                <button
                  type="button"
                  onclick={() => switchToNetwork(network)}
                  disabled={!isConnected}
                  class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🔄 Cambiar a Esta Red
                </button>
              {/if}
              
              {#if isActive}
                <button
                  type="button"
                  onclick={() => removeCustomNetwork(network.chainId)}
                  class="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold rounded-lg transition"
                  title="Eliminar de mi lista"
                >
                  🗑️
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- COLUMNA DERECHA: Gestión de Redes Personalizadas -->
    <div class="glass-card p-6">
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
              type="text"
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
</div>

<!-- 🔥 Modal de Edición -->
{#if showEditModal && editingNetwork}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    role="button"
    tabindex="0"
    onclick={closeEditModal}
    onkeydown={(e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        closeEditModal();
      }
    }}
  >
    <div
      class="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
      role="dialog"
      aria-modal="true"
      tabindex="0"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-bold text-white">
          ✏️ Editar Red
        </h3>

        <button
          type="button"
          onclick={closeEditModal}
          class="text-slate-400 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      <form
        onsubmit={(e) => {
          e.preventDefault();
          saveEditedNetwork();
        }}
        class="space-y-4"
      >
        <div>
          <label
            for="edit-network-name"
            class="block text-sm font-semibold text-slate-300 mb-2"
          >
            Nombre de la Red
          </label>

          <input
            id="edit-network-name"
            bind:value={networkName}
            type="text"
            class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <label
            for="edit-chain-id"
            class="block text-sm font-semibold text-slate-300 mb-2"
          >
            Chain ID (no editable)
          </label>

          <input
            id="edit-chain-id"
            value={chainId}
            type="text"
            disabled
            class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/20 text-slate-500 text-sm cursor-not-allowed"
          />
        </div>

        <div>
          <label
            for="edit-rpc-url"
            class="block text-sm font-semibold text-slate-300 mb-2"
          >
            RPC URL
          </label>

          <input
            id="edit-rpc-url"
            bind:value={rpcUrl}
            type="url"
            class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <label
            for="edit-currency-symbol"
            class="block text-sm font-semibold text-slate-300 mb-2"
          >
            Símbolo de Moneda
          </label>

          <input
            id="edit-currency-symbol"
            bind:value={currencySymbol}
            type="text"
            class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <label
            for="edit-explorer-url"
            class="block text-sm font-semibold text-slate-300 mb-2"
          >
            Block Explorer URL (Opcional)
          </label>

          <input
            id="edit-explorer-url"
            bind:value={explorerUrl}
            type="url"
            class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="button"
            onclick={closeEditModal}
            class="flex-1 px-4 py-2.5 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-lg font-semibold transition text-sm"
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition text-sm"
          >
            ✓ Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}