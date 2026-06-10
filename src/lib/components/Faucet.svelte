<script>
  import { ethers } from 'ethers';
  import { FAUCET_NETWORKS } from '../config/faucetConfig';
  import { showSuccess, showError, showInfo } from '../utils/notifications';
  import LoadingSpinner from './LoadingSpinner.svelte';

  let address = $state('');
  let selectedFaucet = $state(null);
  let loading = $state(false);
  let error = $state('');
  let result = $state(null);
  let isConfigured = $state(true);
  let configChecked = $state(false);

  const syscoinFaucets = $derived(
    FAUCET_NETWORKS.filter(f =>
      f.isActive && (
        f.networkName.toLowerCase().includes('syscoin') ||
        f.networkName.toLowerCase().includes('zksys') ||
        f.networkName.toLowerCase().includes('rollux')
      )
    )
  );

  const otherFaucets = $derived(
    FAUCET_NETWORKS.filter(f =>
      f.isActive &&
      !f.networkName.toLowerCase().includes('syscoin') &&
      !f.networkName.toLowerCase().includes('zksys') &&
      !f.networkName.toLowerCase().includes('rollux')
    )
  );

  function isValidAddress(addr) {
    try {
      return ethers.isAddress(addr.trim());
    } catch {
      return false;
    }
  }

  function selectFaucet(faucet) {
    selectedFaucet = faucet;
    error = '';
    result = null;
  }

  async function requestTokens() {
    const addr = address.trim();

    if (!addr) {
      error = 'Ingresa tu dirección de wallet';
      return;
    }
    if (!isValidAddress(addr)) {
      error = 'Dirección inválida. Debe ser 0x + 40 caracteres hexadecimales';
      return;
    }
    if (!selectedFaucet) {
      error = 'Selecciona una red testnet';
      return;
    }

    loading = true;
    error = '';
    result = null;

    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addr,
          chainId: selectedFaucet.chainId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503 && data.detail?.includes('FAUCET_PRIVATE_KEY')) {
          isConfigured = false;
          throw new Error('Faucet no configurado. El administrador debe configurar FAUCET_PRIVATE_KEY');
        }
        throw new Error(data.error || data.detail || 'Error al solicitar tokens');
      }

      result = data;
      showSuccess(`Recibiste ${data.amount} ${data.currency} en ${data.network}`);
    } catch (e) {
      error = e.message || 'Error de conexión con el faucet';
      showError(error);
    } finally {
      loading = false;
      configChecked = true;
    }
  }

  async function handleConnectAndFaucet() {
    if (loading) return;
    showInfo('Conecta tu wallet primero para solicitar tokens');
  }
</script>

<div class="glass-card p-8">
  <div class="flex items-start justify-between mb-8">
    <div>
      <h3 class="text-xl font-bold text-white">💧 Faucet de Tokens</h3>
      <p class="text-xs text-slate-500 mt-1">Recibe tokens de prueba directo a tu wallet</p>
    </div>
    <div class="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center text-2xl">💧</div>
  </div>

  {#if isConfigured && configChecked}
    <div class="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
      <p class="text-sm text-emerald-400 flex items-center gap-2">
        <span>✅</span>
        <span>Faucet listo — solicita tokens sin conectar wallet</span>
      </p>
    </div>
  {:else if !isConfigured && configChecked}
    <div class="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <p class="text-sm text-amber-400 flex items-center gap-2">
        <span>⚠️</span>
        <span>Faucet no configurado. Configura FAUCET_PRIVATE_KEY en el servidor.</span>
      </p>
    </div>
  {/if}

  <div class="mb-6">
    <label for="faucet-address" class="block text-sm font-semibold text-slate-300 mb-2">
      Tu Dirección
    </label>
    <div class="relative">
      <input
        id="faucet-address"
        bind:value={address}
        type="text"
        placeholder="0x..."
        class="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/40 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-mono"
        disabled={loading}
      />
      {#if address && isValidAddress(address)}
        <div class="absolute right-3 top-1/2 -translate-y-1/2">
          <span class="text-emerald-400 text-sm">✓</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="mb-6">
    <p class="block text-sm font-semibold text-slate-300 mb-3">Selecciona una red testnet</p>

    {#if syscoinFaucets.length > 0}
      <div class="mb-4">
        <p class="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">🔷 Ecosistema Syscoin</p>
        <div class="space-y-1.5">
          {#each syscoinFaucets as faucet (faucet.chainId)}
            <button
              onclick={() => selectFaucet(faucet)}
              disabled={loading}
              class="w-full px-4 py-3 rounded-xl text-left transition-all duration-150 {selectedFaucet?.chainId === faucet.chainId ? 'bg-cyan-600/20 border border-cyan-500/30' : 'bg-slate-800/20 border border-slate-700/30 hover:bg-slate-800/40'} disabled:opacity-50"
            >
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-sm font-medium text-white">{faucet.networkName}</span>
                  <span class="text-xs text-slate-500 ml-2">({faucet.currency})</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    +{faucet.dripAmount} {faucet.currency}
                  </span>
                  {#if selectedFaucet?.chainId === faucet.chainId}
                    <span class="text-emerald-400 text-sm font-bold">✓</span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if otherFaucets.length > 0}
      <div class="mb-2">
        <p class="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">🌐 Otras Redes</p>
        <div class="space-y-1.5">
          {#each otherFaucets as faucet (faucet.chainId)}
            <button
              onclick={() => selectFaucet(faucet)}
              disabled={loading}
              class="w-full px-4 py-3 rounded-xl text-left transition-all duration-150 {selectedFaucet?.chainId === faucet.chainId ? 'bg-cyan-600/20 border border-cyan-500/30' : 'bg-slate-800/20 border border-slate-700/30 hover:bg-slate-800/40'} disabled:opacity-50"
            >
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-sm font-medium text-white">{faucet.networkName}</span>
                  <span class="text-xs text-slate-500 ml-2">({faucet.currency})</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    +{faucet.dripAmount} {faucet.currency}
                  </span>
                  {#if selectedFaucet?.chainId === faucet.chainId}
                    <span class="text-emerald-400 text-sm font-bold">✓</span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
      <p class="text-sm text-red-400">{error}</p>
    </div>
  {/if}

  <button
    onclick={requestTokens}
    disabled={loading || !address.trim() || !selectedFaucet}
    class="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed text-sm shadow-lg shadow-cyan-600/20 hover:shadow-cyan-500/30 disabled:shadow-none"
  >
    {#if loading}
      <span class="inline-flex items-center gap-2 justify-center">
        <LoadingSpinner size="small" color="white" />
        Solicitando {selectedFaucet?.dripAmount || ''} {selectedFaucet?.currency || ''}...
      </span>
    {:else if selectedFaucet}
      💧 Solicitar {selectedFaucet.dripAmount} {selectedFaucet.currency}
    {:else}
      💧 Solicitar Tokens de Prueba
    {/if}
  </button>

  {#if result}
    <div class="mt-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-6 border border-emerald-500/10 fade-in">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
          <span class="text-emerald-400 text-lg">✅</span>
        </div>
        <div>
          <h4 class="text-sm font-bold text-white">Transferencia Exitosa</h4>
          <p class="text-xs text-slate-400">
            {result.amount} {result.currency} enviados en {result.network}
          </p>
        </div>
      </div>

      <div class="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 mb-4">
        <p class="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Transaction Hash</p>
        <code class="text-xs text-slate-200 font-mono break-all">{result.txHash}</code>
      </div>

      <div class="flex items-center justify-between text-xs">
        <span class="text-slate-500">Bloque #{result.blockNumber}</span>
        {#if result.explorerUrl}
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
          >
            Ver en explorer →
          </a>
        {/if}
      </div>
    </div>
  {/if}

  {#if selectedFaucet && !result}
    <div class="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
      <div class="flex items-start gap-3">
        <span class="text-slate-500 text-sm mt-0.5">ℹ️</span>
        <div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Recibirás <strong class="text-slate-200">{selectedFaucet.dripAmount} {selectedFaucet.currency}</strong> en {selectedFaucet.network}.
            Los tokens de prueba no tienen valor real.
          </p>
          <p class="text-xs text-slate-500 mt-2">
            Límite: 1 solicitud cada 24 horas por dirección
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>
