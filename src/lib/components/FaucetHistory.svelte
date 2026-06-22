<script lang="ts">
  import { FAUCET_NETWORKS } from '../config/faucetConfig';

  interface FaucetHistoryItem {
    address: string;
    network: string;
    currency: string;
    amount: number | string;
    txHash: string;
    chainId: number | string;
    timestamp: number;
    explorerUrl: string | null;
  }

  let { key = 0 } = $props();

  let history: FaucetHistoryItem[] = $state([]);
  let filterNetwork = $state('all');

  function loadHistory() {
    if (typeof window === 'undefined') return;
    const raw = JSON.parse(localStorage.getItem('faucet_history') || '[]');
    history = raw;
  }

  $effect(() => {
    key;
    loadHistory();
  });

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function shortHash(hash: string) {
    if (!hash) return '';
    return hash.substring(0, 6) + '...' + hash.substring(hash.length - 4);
  }

  const filteredHistory = $derived(
    filterNetwork === 'all'
      ? history
      : history.filter(h => h.chainId.toString() === filterNetwork.toString())
  );

  function clearHistory() {
    if (typeof window === 'undefined') return;
    if (confirm('¿Eliminar todo el historial del faucet?')) {
      localStorage.removeItem('faucet_history');
      history = [];
    }
  }
</script>

<div class="glass-card p-8 h-full">
  <div class="flex items-start justify-between mb-6">
    <div>
      <h3 class="text-xl font-bold text-white">📜 Historial del Faucet</h3>
      <p class="text-xs text-slate-500 mt-1">Sin necesidad de conectar wallet</p>
    </div>
    <div class="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-2xl">📋</div>
  </div>

  {#if history.length === 0}
    <div class="text-center py-8">
      <p class="text-sm text-slate-500">Aún no hay solicitudes al faucet</p>
      <p class="text-xs text-slate-600 mt-1">Las solicitudes exitosas aparecerán aquí</p>
    </div>
  {:else}
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-500">Filtrar por red:</span>
        <select
          bind:value={filterNetwork}
          class="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-white text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        >
          <option value="all">🌐 Todas las redes</option>
          {#each FAUCET_NETWORKS.filter(f => f.isActive) as net (net.chainId)}
            <option value={net.chainId}>{net.networkName}</option>
          {/each}
        </select>
      </div>
      <button
        onclick={clearHistory}
        class="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
      >
        🗑️ Limpiar
      </button>
    </div>

    <div class="space-y-2 max-h-96 overflow-y-auto">
      {#each filteredHistory as item (item.txHash + item.timestamp)}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-slate-800/30 rounded-xl border border-slate-700/30 gap-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
              <span class="text-sm">💧</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-white truncate">{item.network}</p>
              <p class="text-xs text-slate-500 font-mono truncate">{item.address}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 sm:gap-4 shrink-0">
            <div class="text-right">
              <p class="text-sm font-bold text-emerald-400">+{item.amount} {item.currency}</p>
              <p class="text-[10px] text-slate-500">{formatDate(item.timestamp)}</p>
            </div>
            <div class="flex items-center gap-1.5">
              <div class="text-right">
                <p class="text-[10px] text-slate-500">Tx</p>
                <code class="text-[10px] text-slate-400 font-mono">{shortHash(item.txHash)}</code>
              </div>
              {#if item.explorerUrl}
                <a
                  href={item.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="shrink-0 w-6 h-6 rounded-lg bg-slate-700/50 hover:bg-cyan-500/20 border border-slate-600/50 hover:border-cyan-500/30 flex items-center justify-center transition-all duration-200 group"
                  title="Ver en explorer"
                >
                  <svg class="w-3 h-3 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <p class="text-[10px] text-slate-600 text-center mt-4">
      Mostrando {filteredHistory.length} de {history.length} solicitudes
    </p>
  {/if}
</div>