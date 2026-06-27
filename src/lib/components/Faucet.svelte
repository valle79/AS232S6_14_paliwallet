<script>
  import { ethers } from 'ethers';
  import { FAUCET_NETWORKS, FAUCET_FULL_ABI, TOKEN_MIN_ABI } from '../config/faucetConfig';
  import { walletService } from '../services/walletService';
  import { showSuccess, showError } from '../utils/notifications';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import FaucetHistory from './FaucetHistory.svelte';

  let address = $state('');
  let selectedFaucet = $state(null);
  let loading = $state(false);
  let directLoading = $state(false);
  let error = $state('');
  let result = $state(null);
  let isConfigured = $state(true);
  let configChecked = $state(false);
  let faucetHistoryKey = $state(0);
  let faucetInfo = $state(null);
  let cooldownRemaining = $state(0);

  let walletConnected = $derived(walletService.isConnected);
  let currentChainId = $derived(walletService.currentNetwork?.chainId || null);

  let countdownInterval;

  $effect(() => {
    if (cooldownRemaining > 0) {
      countdownInterval = setInterval(() => {
        cooldownRemaining = Math.max(0, cooldownRemaining - 1);
      }, 1000);
    } else {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  });

  $effect(() => {
    const addr = address.trim();
    const faucet = selectedFaucet;
    if (addr && faucet && faucet.contractAddress && faucet.faucetType === 'erc20') {
      refreshCooldown(faucet, addr);
    } else {
      cooldownRemaining = 0;
    }
  });

  function saveFaucetHistory(data, requestedChainId) {
    if (typeof window === 'undefined') return;
    const history = JSON.parse(localStorage.getItem('faucet_history') || '[]');
    history.unshift({
      address: address.trim(),
      network: data.network,
      currency: data.currency,
      amount: data.amount,
      txHash: data.txHash,
      chainId: requestedChainId,
      timestamp: Date.now(),
      explorerUrl: data.explorerUrl || null
    });
    if (history.length > 50) history.length = 50;
    localStorage.setItem('faucet_history', JSON.stringify(history));
    faucetHistoryKey++;
  }

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
    faucetInfo = null;
    cooldownRemaining = 0;
    loadFaucetInfo(faucet);
  }

  async function loadFaucetInfo(faucet) {
    if (!faucet.contractAddress || faucet.faucetType !== 'erc20') return;
    try {
      const provider = new ethers.JsonRpcProvider(faucet.rpcUrl);
      const contract = new ethers.Contract(faucet.contractAddress, FAUCET_FULL_ABI, provider);
      const dripRaw = await contract.dripAmount();
      const cooldownSecs = Number(await contract.cooldown());
      const tokenAddr = await contract.token();

      let tokenSymbol = faucet.currency;
      let tokenDecimals = 18;
      if (tokenAddr && ethers.isAddress(tokenAddr)) {
        const tc = new ethers.Contract(tokenAddr, TOKEN_MIN_ABI, provider);
        tokenSymbol = await tc.symbol();
        tokenDecimals = Number(await tc.decimals());
      }

      faucetInfo = {
        dripFormatted: ethers.formatUnits(dripRaw, tokenDecimals),
        tokenSymbol,
        cooldownSecs,
        cooldownHuman: formatCooldown(cooldownSecs)
      };
    } catch {
      // fallback
    }
  }

  async function refreshCooldown(faucet, addr) {
    if (!faucet.contractAddress || faucet.faucetType !== 'erc20') return;
    if (!ethers.isAddress(addr)) return;
    try {
      const provider = new ethers.JsonRpcProvider(faucet.rpcUrl);
      const contract = new ethers.Contract(faucet.contractAddress, FAUCET_FULL_ABI, provider);
      const lastTime = Number(await contract.lastClaimTime(addr));
      if (lastTime > 0) {
        const cooldownSecs = Number(await contract.cooldown());
        const elapsed = Math.floor(Date.now() / 1000) - lastTime;
        cooldownRemaining = Math.max(0, cooldownSecs - elapsed);
      } else {
        cooldownRemaining = 0;
      }
    } catch {
      // fallback
    }
  }

  function formatCooldown(secs) {
    if (secs < 60) return `${secs} segundos`;
    if (secs < 3600) return `${Math.floor(secs / 60)} minutos`;
    if (secs < 86400) return `${Math.floor(secs / 3600)} horas`;
    return `${Math.floor(secs / 86400)} días`;
  }

  function formatHMS(secs) {
    if (secs <= 0) return { h: 0, m: 0, s: 0, str: '00:00:00' };
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return {
      h, m, s,
      str: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    };
  }

  function cooldownPercent(secs, total) {
    if (!total || total <= 0) return 100;
    return ((secs / total) * 100);
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
    if (cooldownRemaining > 0) {
      error = `Debes esperar ${formatHMS(cooldownRemaining).str} antes de reclamar de nuevo`;
      return;
    }

    loading = true;
    error = '';
    result = null;
    const requestedChainId = selectedFaucet.chainId;

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
        if (res.status === 502) {
          const msg = data.error || '';
          if (msg.includes('CooldownActive') || msg.includes('cooldown')) {
            const f = selectedFaucet;
            if (f && f.contractAddress) await refreshCooldown(f, addr);
            throw new Error('Cooldown activo. Debes esperar antes de reclamar de nuevo.');
          }
          throw new Error(msg || 'Error del contrato. Verifica fondos y cooldown.');
        }
        throw new Error(data.error || data.detail || 'Error al solicitar tokens');
      }

      result = data;
      saveFaucetHistory(data, requestedChainId);
      showSuccess(`Recibiste ${data.amount} ${data.currency} en ${data.network}`);
      const f = selectedFaucet;
      if (f && f.faucetType === 'erc20' && f.contractAddress) {
        await refreshCooldown(f, addr);
      }
    } catch (e) {
      error = e.message || 'Error de conexión con el faucet';
      showError(error);
    } finally {
      loading = false;
      configChecked = true;
    }
  }

  async function claimDirect() {
    if (!selectedFaucet || !selectedFaucet.contractAddress) return;
    if (cooldownRemaining > 0) return;
    directLoading = true;
    error = '';
    try {
      const signer = walletService.getSigner();
      if (!signer) throw new Error('Wallet no conectada');
      const contract = new ethers.Contract(selectedFaucet.contractAddress, FAUCET_FULL_ABI, signer);
      const tx = await contract.claim();
      const receipt = await tx.wait();
      showSuccess(`Reclamo exitoso! Tx: ${tx.hash}`);
      result = {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber,
        amount: faucetInfo?.dripFormatted || selectedFaucet.dripAmount,
        currency: faucetInfo?.tokenSymbol || selectedFaucet.currency,
        network: selectedFaucet.networkName,
        explorerUrl: selectedFaucet.blockExplorerUrl
          ? `${selectedFaucet.blockExplorerUrl}/tx/${tx.hash}`
          : null
      };
      const addr = address.trim();
      const f = selectedFaucet;
      if (f && f.contractAddress && ethers.isAddress(addr)) {
        await refreshCooldown(f, addr);
      }
    } catch (e) {
      const msg = e.reason || e.message || 'Error al reclamar';
      if (msg.includes('CooldownActive') || msg.includes('cooldown')) {
        error = 'Debes esperar a que termine el cooldown antes de reclamar de nuevo.';
        const f = selectedFaucet;
        const addr = address.trim();
        if (f && f.contractAddress && ethers.isAddress(addr)) await refreshCooldown(f, addr);
      } else if (msg.includes('NoFunds') || msg.includes('no funds')) {
        error = 'El faucet no tiene fondos suficientes.';
      } else {
        error = msg;
      }
      showError(error);
    } finally {
      directLoading = false;
    }
  }

  const isCooldownLocked = $derived(cooldownRemaining > 0);
  const hms = $derived(formatHMS(cooldownRemaining));
  const cooldownTotal = $derived(faucetInfo?.cooldownSecs || 86400);
  const cdPercent = $derived(cooldownPercent(cooldownRemaining, cooldownTotal));
  const circumference = 2 * Math.PI * 48;

</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        class="w-full px-4 py-3 border rounded-xl bg-slate-800/40 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 font-mono transition-all duration-200 {isCooldownLocked ? 'border-amber-500/50 focus:border-amber-500/50 focus:ring-amber-500/50' : 'border-slate-700/50 focus:ring-cyan-500/50 focus:border-cyan-500/50'}"
        disabled={loading}
      />
      {#if address && isValidAddress(address)}
        <div class="absolute right-3 top-1/2 -translate-y-1/2">
          {#if isCooldownLocked}
            <span class="text-amber-400 text-sm">🔒</span>
          {:else}
            <span class="text-emerald-400 text-sm">✓</span>
          {/if}
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
                <div class="flex items-center gap-1.5">
                  {#if faucet.faucetType === 'erc20'}
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">ERC-20</span>
                  {/if}
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
                <div class="flex items-center gap-1.5">
                  {#if faucet.faucetType === 'erc20'}
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">ERC-20</span>
                  {/if}
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
    disabled={loading || !address.trim() || !selectedFaucet || isCooldownLocked}
    class="w-full px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed text-sm shadow-lg {isCooldownLocked ? 'bg-amber-600/20 border border-amber-500/30 text-amber-400 shadow-amber-500/10' : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-cyan-600/20 hover:shadow-cyan-500/30'} {loading || !address.trim() || !selectedFaucet ? 'from-slate-700 to-slate-700 text-slate-500 shadow-none' : ''}"
  >
    {#if loading}
      <span class="inline-flex items-center gap-2 justify-center">
        <LoadingSpinner size="small" color="white" />
        Solicitando {selectedFaucet?.dripAmount || ''} {selectedFaucet?.currency || ''}...
      </span>
    {:else if isCooldownLocked}
      <span class="inline-flex items-center gap-2 justify-center">
        <span>🔒</span>
        <span>Espera {hms.str}</span>
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

  {#if isCooldownLocked && faucetInfo}
    <div class="mt-6 p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 fade-in text-center">
      <div class="flex flex-col items-center gap-3">
        <div class="relative w-28 h-28">
          <svg class="w-28 h-28 -rotate-90" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="48" fill="none" stroke="rgb(120 53 15 / 0.2)" stroke-width="6" class="opacity-30" />
            <circle cx="55" cy="55" r="48" fill="none" stroke="rgb(245 158 11)" stroke-width="6" stroke-dasharray={circumference} stroke-dashoffset={circumference * (1 - cdPercent / 100)} stroke-linecap="round" class="transition-all duration-1000 ease-linear" />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl mb-0.5">🔒</span>
            <span class="text-lg font-bold text-amber-300 tabular-nums">{hms.str}</span>
          </div>
        </div>
        <div>
          <p class="text-sm font-semibold text-amber-300">Cooldown Activo</p>
          <p class="text-xs text-amber-400/70 mt-0.5">Espera antes de reclamar de nuevo en {selectedFaucet.networkName}</p>
        </div>
      </div>
    </div>
  {/if}

  {#if selectedFaucet && !result}
    <div class="mt-6 space-y-3">
      {#if faucetInfo && !isCooldownLocked}
        <div class="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <div class="flex items-start gap-3">
            <span class="text-slate-500 text-sm mt-0.5">ℹ️</span>
            <div class="flex-1">
              <p class="text-xs text-slate-400 leading-relaxed">
                Recibirás <strong class="text-slate-200">{faucetInfo.dripFormatted} {faucetInfo.tokenSymbol}</strong> en {selectedFaucet.network}.
                Los tokens de prueba no tienen valor real.
              </p>
              <p class="text-xs text-slate-500 mt-2">
                Límite: 1 solicitud cada {faucetInfo.cooldownHuman} por dirección
              </p>
            </div>
          </div>
        </div>
      {:else if !faucetInfo}
        <div class="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <div class="flex items-start gap-3">
            <span class="text-slate-500 text-sm mt-0.5">ℹ️</span>
            <div>
              <p class="text-xs text-slate-400 leading-relaxed">
                Recibirás <strong class="text-slate-200">{selectedFaucet.dripAmount} {selectedFaucet.currency}</strong> en {selectedFaucet.network}.
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#if selectedFaucet.faucetType === 'erc20' && walletConnected && selectedFaucet.contractAddress}
        <button
          onclick={claimDirect}
          disabled={directLoading || isCooldownLocked}
          class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 disabled:shadow-none"
        >
          {#if directLoading}
            <span class="inline-flex items-center gap-2 justify-center">
              <LoadingSpinner size="small" color="white" />
              Reclamando directo...
            </span>
          {:else if isCooldownLocked}
            🔒 Espera {hms.str}
          {:else}
            ⚡ Reclamar Directo (conectado)
          {/if}
        </button>
        <p class="text-[10px] text-slate-600 text-center -mt-2">El gas lo pagas tú desde tu wallet conectada</p>
      {/if}
    </div>
  {/if}
</div>

<FaucetHistory key={faucetHistoryKey} />
</div>
