<script>
  import { ethers } from 'ethers';
  import { EVM_NETWORKS } from '../config/networkConfig';
  import { showError, showSuccess } from '../utils/notifications';
  import LoadingSpinner from './LoadingSpinner.svelte';

  let address = $state('');
  let selectedNetwork = $state(null);
  let selectedNetworkType = $state('EVM');
  let balance = $state(null);
  let balanceCurrency = $state('');
  let loading = $state(false);
  let networkLoading = $state(false);
  let error = $state('');

  const evmNetworks = $derived(
    Object.values(EVM_NETWORKS).filter(n => n.rpcUrl)
  );

  function handleNetworkSelect(network) {
    selectedNetwork = network;
    balance = null;
    error = '';
  }

  function isValidAddress(addr) {
    try {
      return ethers.isAddress(addr);
    } catch {
      return false;
    }
  }

  async function checkBalance() {
    if (!address.trim()) {
      error = 'Ingresa una dirección de wallet';
      return;
    }
    if (!isValidAddress(address.trim())) {
      error = 'Dirección inválida. Debe ser una dirección EVM válida (0x...)';
      return;
    }
    if (!selectedNetwork) {
      error = 'Selecciona una red blockchain';
      return;
    }

    loading = true;
    error = '';
    balance = null;

    try {
      const rpcUrl = selectedNetwork.rpcUrl;
      if (!rpcUrl) {
        throw new Error('Esta red no tiene RPC configurado');
      }

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balanceWei = await provider.getBalance(address.trim());
      const formattedBalance = ethers.formatEther(balanceWei);

      balance = formattedBalance;
      balanceCurrency = selectedNetwork.nativeCurrency.symbol;
      showSuccess(`Saldo consultado en ${selectedNetwork.name}`);
    } catch (e) {
      error = e.message || 'Error al consultar saldo';
      showError(error);
    } finally {
      loading = false;
    }
  }
</script>

<div class="glass-card p-8">
  <div class="flex items-start justify-between mb-8">
    <div>
      <h3 class="text-xl font-bold text-white">Consultar Saldo</h3>
      <p class="text-xs text-slate-500 mt-1">Sin necesidad de conectar wallet</p>
    </div>
    <div class="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl">🔍</div>
  </div>

  <div class="mb-6">
    <label for="balance-address" class="block text-sm font-semibold text-slate-300 mb-2">Dirección Wallet</label>
    <input
      id="balance-address"
      bind:value={address}
      type="text"
      placeholder="0x..."
      class="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/40 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 font-mono"
    />
  </div>

  <div class="mb-6">
    <p class="block text-sm font-semibold text-slate-300 mb-3">Seleccionar Red</p>
    <div class="max-h-64 overflow-y-auto space-y-1.5 border border-slate-700/30 rounded-xl p-2 bg-slate-800/20">
      {#each evmNetworks as network (network.chainId)}
        <button
          onclick={() => handleNetworkSelect(network)}
          class="w-full px-4 py-2.5 rounded-lg text-left transition-all duration-150 {selectedNetwork?.chainId === network.chainId ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-slate-800/40 border border-transparent'}"
        >
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-medium text-white">{network.name}</span>
              <span class="text-xs text-slate-500 ml-2">({network.nativeCurrency.symbol})</span>
            </div>
            <div class="flex items-center gap-2">
              {#if network.isTestnet}
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Testnet</span>
              {/if}
              {#if selectedNetwork?.chainId === network.chainId}
                <span class="text-emerald-400 text-sm font-bold">✓</span>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <button
    onclick={checkBalance}
    disabled={loading || !address.trim() || !selectedNetwork}
    class="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
  >
    {#if loading}
      <span class="inline-flex items-center gap-2">
        <LoadingSpinner size="small" color="white" />
        Consultando...
      </span>
    {:else}
      ⟳ Consultar Saldo
    {/if}
  </button>

  {#if error}
    <div class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
      <p class="text-sm text-red-400">{error}</p>
    </div>
  {/if}

  {#if balance !== null}
    <div class="mt-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl p-6 border border-blue-500/10">
      <p class="text-xs text-slate-500 mb-2">Saldo en {selectedNetwork?.name}</p>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-bold text-white">{parseFloat(balance).toFixed(6)}</span>
        <span class="text-base font-semibold text-blue-400">{balanceCurrency}</span>
      </div>
    </div>
  {/if}
</div>
