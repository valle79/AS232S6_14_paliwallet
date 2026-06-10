<script>
  import { onMount } from 'svelte';
  import { walletService } from '$lib/services/walletService.ts';
  import { transactionService } from '$lib/services/transactionService.ts';
  import { mapWalletError, RetryHandler } from '$lib/utils/errorHandler.js';
  import { showError, showSuccess, showInfo, notifications } from '$lib/utils/notifications.js';
  import { copyToClipboard } from '$lib/utils/formatters.js';

  import WalletConnection from '$lib/components/WalletConnection.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import NetworkSwitcher from '$lib/components/NetworkSwitcher.svelte';
  import TransactionForm from '$lib/components/TransactionForm.svelte';
  import SmartContractForm from '$lib/components/SmartContractForm.svelte';
  import NetworkManager from '$lib/components/NetworkManager.svelte';
  import BalanceChecker from '$lib/components/BalanceChecker.svelte';
  import Faucet from '$lib/components/Faucet.svelte';

  /* ================================
     STATE (Svelte 5 runes)
  =================================*/
  let walletState = $state({
    isConnected: false,
    address: '',
    balance: '0',
    currency: 'ETH',
    network: null
  });

  let connectionLoading = $state(false);
  let balanceLoading = $state(false);
  let connectionError = $state('');
  let balanceError = $state('');
  let activeTab = $state('wallet'); // 'wallet' | 'send' | 'contract' | 'networks' | 'balance' | 'faucet'

  const retryHandler = new RetryHandler(3, 1000);

  /* ================================
     DERIVED VALUES
  =================================*/
  const balanceParts = $derived((walletState.balance || '0').split('.'));
  const balanceInt   = $derived(balanceParts[0]);
  const balanceDec   = $derived(balanceParts[1]?.substring(0,4) || '0000');
  const balanceUSD   = $derived((parseFloat(walletState.balance || '0') * 3.78).toFixed(2));

  /* ================================
     LIFECYCLE
  =================================*/
  onMount(async () => {
    try {
      const autoConnected = await walletService.autoConnect();
      if (autoConnected) {
        await handleSuccessfulConnection();
        showInfo('Wallet reconectada automáticamente');
      }
    } catch (error) {
      console.error(error);
    }

    setupWalletEventListeners();
  });

  /* ================================
     EVENTS
  =================================*/
  function setupWalletEventListeners() {
    walletService.onAccountChanged(async (newAddress) => {
      console.log('👤 Cuenta cambiada a:', newAddress);
      walletState.address = newAddress;
      await refreshBalance();
      showInfo('Cuenta cambiada');
    });

    // 🔥 RECIBIR DATOS COMPLETOS DEL CALLBACK
    walletService.onChainChanged(({ chainId, network, balance }) => {
      console.log('🔄 Red cambiada - Actualizando UI con datos completos');
      console.log('ChainId:', chainId);
      console.log('Network:', network);
      console.log('Balance:', balance);
      
      // 🔥 ACTUALIZAR TODO EL ESTADO DE UNA VEZ (REACTIVIDAD)
      walletState.network = network;
      walletState.balance = balance;
      walletState.currency = walletService.getCurrencySymbol(network.chainId);
      
      // Actualizar provider y signer en transactionService
      const provider = walletService.getProvider();
      const signer = walletService.getSigner();
      if (provider) transactionService.setProvider(provider);
      if (signer) transactionService.setSigner(signer);
      
      console.log('✅ UI actualizada completamente');
      showSuccess(`Red cambiada a ${network.name}`);
    });

    walletService.onDisconnect(() => {
      handleDisconnection();
      showInfo('Wallet desconectada');
    });
  }

  /* ================================
     CONNECTION
  =================================*/
  async function handleConnect() {
    connectionLoading = true;
    connectionError = '';

    try {
      await retryHandler.executeWithRetry(
        () => walletService.connectWallet(),
        'wallet connection'
      );

      await handleSuccessfulConnection();
      showSuccess('Wallet conectada exitosamente');
    } catch (error) {
      const errorInfo = mapWalletError(error);
      connectionError = error.message || 'CONNECTION_ERROR';
      showError(errorInfo.message);
    } finally {
      connectionLoading = false;
    }
  }

  async function handleSuccessfulConnection() {
    try {
      const address = await walletService.getAddress();
      const networkInfo = await walletService.getNetworkInfo();

      walletState.isConnected = true;
      walletState.address = address;
      walletState.network = networkInfo;
      walletState.currency = walletService.getCurrencySymbol(networkInfo.chainId);

      // Initialize transaction service with provider and signer
      const provider = walletService.getProvider();
      const signer = walletService.getSigner();
      if (provider) transactionService.setProvider(provider);
      if (signer) transactionService.setSigner(signer);

      await refreshBalance();
    } catch (error) {
      showError(mapWalletError(error).message);
    }
  }

  async function handleDisconnect() {
    await walletService.disconnectWallet();
    handleDisconnection();
    showSuccess('Wallet desconectada');
  }

  async function handleFullDisconnect() {
    connectionLoading = true;
    try {
      await walletService.fullDisconnectWallet();
      handleDisconnection();
      activeTab = 'wallet';
      showSuccess('Sesión cerrada completamente. Vuelve a conectar para usar la wallet.');
    } catch (error) {
      showError('Error al cerrar sesión completamente');
    } finally {
      connectionLoading = false;
    }
  }

  function handleDisconnection() {
    walletState.isConnected = false;
    walletState.address = '';
    walletState.balance = '0';
    walletState.currency = 'ETH';
    walletState.network = null;
  }

  /* ================================
     DATA REFRESH
  =================================*/
  async function refreshBalance() {
    if (!walletState.isConnected) return;

    balanceLoading = true;
    balanceError = '';

    try {
      const balanceInfo = await retryHandler.executeWithRetry(
        () => walletService.getBalanceWithNetwork(),
        'balance fetch'
      );

      walletState.balance = balanceInfo?.balance || '0';
      walletState.currency = balanceInfo?.currency || 'ETH';
    } catch (error) {
      balanceError = error.message || 'BALANCE_FETCH_ERROR';
      showError(mapWalletError(error).message);
    } finally {
      balanceLoading = false;
    }
  }

  async function refreshNetworkInfo() {
    if (!walletState.isConnected) return;
    const networkInfo = await walletService.getNetworkInfo();
    walletState.network = networkInfo;
  }

  /* ================================
     UTILITIES
  =================================*/
  async function handleCopyAddress(address) {
    const ok = await copyToClipboard(address);
    ok ? showSuccess('Dirección copiada') : showError('No se pudo copiar');
  }

  function truncateAddress(addr) {
    if (!addr) return '';
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
  }
</script>

<svelte:head>
  <title>Pali Wallet | Dashboard</title>
  <meta name="description" content="Panel principal de Pali Wallet — Gestiona tu billetera, envía transacciones y cambia de redes blockchain." />
</svelte:head>

<!-- ================================
     UI
================================= -->

<div class="min-h-screen bg-[#080c16] text-slate-200 relative overflow-hidden">
  
  <!-- Background glow -->
  <div class="fixed inset-0 pointer-events-none">
    <div class="absolute -top-48 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[150px]"></div>
    <div class="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-indigo-600/8 rounded-full blur-[130px]"></div>
  </div>

  <!-- Header -->
  <header class="relative z-20 border-b border-slate-800/80 bg-[#080c16]/80 backdrop-blur-xl sticky top-0">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <a href="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span class="text-white font-bold text-sm">PW</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-white">Pali Wallet</h1>
              <p class="text-[11px] text-slate-500 -mt-0.5">Dashboard DApp</p>
            </div>
          </a>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Network Switcher -->
          <NetworkSwitcher />
          
          <!-- Connected address badge -->
          {#if walletState.isConnected && walletState.address}
            <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span class="text-xs text-emerald-400 font-mono">{truncateAddress(walletState.address)}</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="relative z-10 max-w-7xl w-full mx-auto px-6 py-10">

    <!-- Connection Section -->
    <div class="mb-12 max-w-3xl mx-auto w-full fade-in">
      <WalletConnection 
        isConnected={walletState.isConnected}
        isLoading={connectionLoading}
        error={connectionError}
        onconnect={handleConnect}
        ondisconnect={handleDisconnect}
        onfulldisconnect={handleFullDisconnect}
      />
    </div>

    <!-- Tab Navigation (always visible) -->
    <div class="flex justify-center gap-2 mb-10 flex-wrap">
      <button
        onclick={() => activeTab = 'wallet'}
        class="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 {activeTab === 'wallet' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'}"
      >
        💰 Mi Wallet
      </button>
      <button
        onclick={() => activeTab = 'send'}
        disabled={!walletState.isConnected}
        class="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 {activeTab === 'send' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'} {!walletState.isConnected ? 'opacity-50 cursor-not-allowed' : ''}"
      >
        ⚡ Enviar
      </button>
      <button
        onclick={() => activeTab = 'contract'}
        disabled={!walletState.isConnected}
        class="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 {activeTab === 'contract' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'} {!walletState.isConnected ? 'opacity-50 cursor-not-allowed' : ''}"
      >
        🤖 Contrato
      </button>
      <button
        onclick={() => activeTab = 'networks'}
        class="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 {activeTab === 'networks' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'}"
      >
        🌐 Redes
      </button>
      <button
        onclick={() => activeTab = 'balance'}
        class="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 {activeTab === 'balance' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'}"
      >
        🔍 Saldo
      </button>
      <button
        onclick={() => activeTab = 'faucet'}
        class="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 {activeTab === 'faucet' ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'}"
      >
        💧 Faucet
      </button>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'wallet'}
      {#if walletState.isConnected}
        <!-- Wallet Dashboard -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 fade-in">
          
          <!-- Balance Card -->
          <div class="glass-card p-8">
            <div class="flex items-start justify-between mb-6">
              <div>
                <h3 class="text-lg font-bold text-white">Saldo Total</h3>
                <p class="text-xs text-slate-500 mt-1">Fondos disponibles</p>
              </div>
              <div class="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl">💰</div>
            </div>
            
            <div class="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl p-6 mb-6 border border-blue-500/10">
              <div class="flex items-baseline gap-2 mb-2">
                <span class="text-4xl font-bold text-white">{balanceInt}</span>
                <span class="text-2xl text-slate-500">.{balanceDec}</span>
                <span class="text-base font-bold text-blue-400 ml-1">{walletState.currency}</span>
              </div>
              <div class="h-1.5 w-32 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-60"></div>
            </div>

            <button onclick={refreshBalance}
              disabled={balanceLoading}
              class="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30">
              {balanceLoading ? '⟳ Actualizando...' : '⟳ Actualizar Saldo'}
            </button>
          </div>

          <!-- USD Equivalence Card -->
          <div class="glass-card p-8">
            <div class="flex items-start justify-between mb-6">
              <div>
                <h3 class="text-lg font-bold text-white">Equivalencia USD</h3>
                <p class="text-xs text-slate-500 mt-1">Valor estimado</p>
              </div>
              <div class="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-2xl">💵</div>
            </div>
            
            <div class="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-6 mb-6 border border-emerald-500/10">
              <div class="flex items-baseline gap-2 mb-2">
                <span class="text-4xl font-bold text-white">${balanceUSD}</span>
                <span class="text-base text-slate-500">USD</span>
              </div>
              <div class="h-1.5 w-32 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full opacity-60"></div>
            </div>

            <p class="text-xs text-slate-500 text-center">
              Conversión estimada al tipo de cambio actual
            </p>
          </div>

          <!-- Address Card -->
          <div class="glass-card p-8 md:col-span-2">
            <div class="flex items-start justify-between mb-6">
              <div>
                <h3 class="text-lg font-bold text-white">Dirección de Wallet</h3>
                <p class="text-xs text-slate-500 mt-1">Tu dirección pública en blockchain</p>
              </div>
              <div class="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-2xl">📬</div>
            </div>
            
            <div class="bg-slate-800/40 rounded-xl p-5 mb-6 border border-slate-700/30 overflow-x-auto">
              <code class="text-slate-200 font-mono text-sm leading-relaxed break-all">
                {walletState.address}
              </code>
            </div>

            <button onclick={() => handleCopyAddress(walletState.address)}
              class="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 text-sm">
              📋 Copiar Dirección
            </button>
          </div>
        </div>

        <!-- Network Info -->
        {#if walletState.network}
          <div class="glass-card p-8 fade-in">
            <h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <div class="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-xl">🌐</div>
              Red Blockchain Activa
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-slate-800/40 rounded-xl p-6 border border-slate-700/30">
                <p class="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Chain ID</p>
                <p class="text-3xl font-bold text-white">{walletState.network.chainId}</p>
              </div>
              <div class="bg-slate-800/40 rounded-xl p-6 border border-slate-700/30">
                <p class="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Nombre de Red</p>
                <p class="text-2xl font-bold text-white">{walletState.network.name}</p>
              </div>
            </div>
          </div>
        {/if}
      {:else}
        <div class="glass-card p-12 text-center fade-in">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-2xl mb-6">
            <span class="text-3xl">🔒</span>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">Conecta tu Wallet</h3>
          <p class="text-sm text-slate-400 max-w-md mx-auto">Conecta tu wallet para ver tu saldo, dirección y gestión de redes.</p>
        </div>
      {/if}

    {:else if activeTab === 'send'}
      <div class="max-w-2xl mx-auto fade-in">
        <TransactionForm isConnected={walletState.isConnected} />
      </div>
    {:else if activeTab === 'contract'}
      <div class="max-w-2xl mx-auto fade-in">
        <SmartContractForm isConnected={walletState.isConnected} />
      </div>
    {:else if activeTab === 'networks'}
      <div class="max-w-2xl mx-auto fade-in">
        <NetworkManager isConnected={walletState.isConnected} />
      </div>
    {:else if activeTab === 'balance'}
      <div class="max-w-2xl mx-auto fade-in">
        <BalanceChecker />
      </div>
    {:else if activeTab === 'faucet'}
      <div class="max-w-2xl mx-auto fade-in">
        <Faucet />
      </div>
    {/if}
  </main>
</div>

{#each $notifications as n (n.id)}
  <Toast {...n} />
{/each}