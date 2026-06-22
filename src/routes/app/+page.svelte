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
  let activeTab = $state('wallet');
  let sidebarOpen = $state(false);

  const retryHandler = new RetryHandler(3, 1000);

  const balanceParts = $derived((walletState.balance || '0').split('.'));
  const balanceInt   = $derived(balanceParts[0]);
  const balanceDec   = $derived(balanceParts[1]?.substring(0,4) || '0000');
  const balanceUSD   = $derived((parseFloat(walletState.balance || '0') * 3.78).toFixed(2));

  const navItems = [
    { id: 'wallet', label: 'Mi Wallet', icon: '💰', needsWallet: false },
    { id: 'send', label: 'Enviar', icon: '⚡', needsWallet: true },
    { id: 'contract', label: 'Contrato', icon: '🤖', needsWallet: true },
    { id: 'networks', label: 'Redes', icon: '🌐', needsWallet: false },
    { id: 'balance', label: 'Saldo', icon: '🔍', needsWallet: false },
    { id: 'faucet', label: 'Faucet', icon: '💧', needsWallet: false }
  ];

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

  function setupWalletEventListeners() {
    walletService.onAccountChanged(async (newAddress) => {
      walletState.address = newAddress;
      await refreshBalance();
      showInfo('Cuenta cambiada');
    });

    walletService.onChainChanged(({ chainId, network, balance }) => {
      walletState.network = network;
      walletState.balance = balance;
      walletState.currency = walletService.getCurrencySymbol(network.chainId);
      const provider = walletService.getProvider();
      const signer = walletService.getSigner();
      if (provider) transactionService.setProvider(provider);
      if (signer) transactionService.setSigner(signer);
      showSuccess(`Red cambiada a ${network.name}`);
    });

    walletService.onDisconnect(() => {
      handleDisconnection();
      showInfo('Wallet desconectada');
    });
  }

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

  async function handleCopyAddress(address) {
    const ok = await copyToClipboard(address);
    ok ? showSuccess('Dirección copiada') : showError('No se pudo copiar');
  }

  function truncateAddress(addr) {
    if (!addr) return '';
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
  }

  function navigateTo(tab) {
    activeTab = tab;
    sidebarOpen = false;
  }
</script>

<svelte:head>
  <title>Pali Wallet | Dashboard</title>
  <meta name="description" content="Panel principal de Pali Wallet — Gestiona tu billetera, envía transacciones y cambia de redes blockchain." />
</svelte:head>

<div class="min-h-screen bg-[#080c16] text-slate-200 flex">
  <!-- Background glow -->
  <div class="fixed inset-0 pointer-events-none">
    <div class="absolute -top-48 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[150px]"></div>
    <div class="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-indigo-600/8 rounded-full blur-[130px]"></div>
  </div>

  <!-- Mobile overlay -->
  {#if sidebarOpen}
    <button
      class="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden cursor-default"
      onclick={() => sidebarOpen = false}
      onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
      aria-label="Cerrar menú"
    ></button>
  {/if}

  <!-- Sidebar -->
  <aside
    class="fixed top-0 left-0 z-40 h-screen w-64 bg-[#080c16]/95 backdrop-blur-xl border-r border-slate-800/80 transform transition-transform duration-300 {sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
  >
    <div class="flex flex-col h-full">
      <!-- Sidebar Header -->
      <div class="p-5 border-b border-slate-800/80">
        <a href="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <span class="text-white font-bold text-xs">PW</span>
          </div>
          <div>
            <h1 class="text-base font-bold text-white">Pali Wallet</h1>
            <p class="text-[10px] text-slate-500 -mt-0.5">Dashboard DApp</p>
          </div>
        </a>
      </div>

      <!-- Network indicator -->
      <div class="px-4 py-3 border-b border-slate-800/60">
        <div class="flex items-center justify-between">
          <span class="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">Red Activa</span>
          {#if walletState.network}
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              {walletState.network.name}
            </span>
          {:else}
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
              No conectada
            </span>
          {/if}
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-3 space-y-1">
        {#each navItems as item}
          <button
            onclick={() => navigateTo(item.id)}
            disabled={item.needsWallet && !walletState.isConnected}
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 {activeTab === item.id ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/5' : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'} {item.needsWallet && !walletState.isConnected ? 'opacity-40 cursor-not-allowed' : ''}"
          >
            <span class="text-lg w-6 text-center shrink-0">{item.icon}</span>
            <span class="truncate">{item.label}</span>
            {#if activeTab === item.id}
              <span class="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            {/if}
          </button>
        {/each}
      </nav>

      <!-- Sidebar Footer -->
      <div class="p-4 border-t border-slate-800/80 space-y-2">
        {#if walletState.isConnected && walletState.address}
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <div class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0"></div>
            <span class="text-[11px] text-emerald-400 font-mono truncate">{truncateAddress(walletState.address)}</span>
          </div>
          <div class="flex gap-1.5">
            <button
              onclick={handleDisconnect}
              disabled={connectionLoading}
              class="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/15 transition-colors disabled:opacity-50"
            >
              🔌 Desconectar
            </button>
            <button
              onclick={handleFullDisconnect}
              disabled={connectionLoading}
              class="flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-red-900/30 hover:bg-red-800/40 text-red-300 border border-red-500/10 transition-colors disabled:opacity-50"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        {:else}
          <p class="text-[10px] text-slate-600 text-center">Conecta tu wallet para comenzar</p>
        {/if}
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <div class="flex-1 flex flex-col min-h-screen relative z-10 min-w-0 lg:ml-64">
    <!-- Top Bar -->
    <header class="sticky top-0 z-20 border-b border-slate-800/80 bg-[#080c16]/80 backdrop-blur-xl">
      <div class="flex items-center justify-between px-4 lg:px-6 py-3">
        <div class="flex items-center gap-3">
          <!-- Mobile menu button -->
          <button
            onclick={() => sidebarOpen = !sidebarOpen}
            class="lg:hidden p-2 rounded-lg hover:bg-slate-800/60 transition-colors text-slate-400 hover:text-white"
            aria-label="Abrir menú"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if sidebarOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              {/if}
            </svg>
          </button>

          <!-- Current page title -->
          <h2 class="text-sm font-semibold text-white hidden sm:block">
            {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
          </h2>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <NetworkSwitcher />

          {#if walletState.isConnected && walletState.address}
            <button
              onclick={() => handleCopyAddress(walletState.address)}
              class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              title="Copiar dirección"
            >
              <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
              <span class="text-xs text-emerald-400 font-mono">{truncateAddress(walletState.address)}</span>
            </button>

            <button
              onclick={() => handleCopyAddress(walletState.address)}
              class="sm:hidden p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              title="Copiar dirección"
            >
              <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            </button>
          {/if}
        </div>
      </div>
    </header>

    <!-- Page Content -->
    <main class="flex-1 p-4 lg:p-8">
      <div class="max-w-5xl mx-auto">
        <!-- Connection section (when not connected, show prominently) -->
        {#if !walletState.isConnected}
          <div class="mb-8 fade-in">
            <WalletConnection
              isConnected={walletState.isConnected}
              isLoading={connectionLoading}
              error={connectionError}
              onconnect={handleConnect}
              ondisconnect={handleDisconnect}
              onfulldisconnect={handleFullDisconnect}
            />
          </div>
        {/if}

        <!-- Tab Content -->
        {#if activeTab === 'wallet'}
          {#if walletState.isConnected}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 fade-in">
              <div class="glass-card p-6">
                <div class="flex items-start justify-between mb-5">
                  <div>
                    <h3 class="text-base font-bold text-white">Saldo Total</h3>
                    <p class="text-[11px] text-slate-500 mt-0.5">Fondos disponibles</p>
                  </div>
                  <div class="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-xl shrink-0">💰</div>
                </div>
                <div class="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl p-5 mb-4 border border-blue-500/10">
                  <div class="flex items-baseline gap-2 mb-1">
                    <span class="text-3xl font-bold text-white">{balanceInt}</span>
                    <span class="text-xl text-slate-500">.{balanceDec}</span>
                    <span class="text-sm font-bold text-blue-400 ml-1">{walletState.currency}</span>
                  </div>
                  <div class="h-1 w-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-60"></div>
                </div>
                <button onclick={refreshBalance}
                  disabled={balanceLoading}
                  class="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed text-xs shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30">
                  {balanceLoading ? '⟳ Actualizando...' : '⟳ Actualizar Saldo'}
                </button>
              </div>

              <div class="glass-card p-6">
                <div class="flex items-start justify-between mb-5">
                  <div>
                    <h3 class="text-base font-bold text-white">Equivalencia USD</h3>
                    <p class="text-[11px] text-slate-500 mt-0.5">Valor estimado</p>
                  </div>
                  <div class="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-xl shrink-0">💵</div>
                </div>
                <div class="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-5 mb-4 border border-emerald-500/10">
                  <div class="flex items-baseline gap-2 mb-1">
                    <span class="text-3xl font-bold text-white">${balanceUSD}</span>
                    <span class="text-sm text-slate-500">USD</span>
                  </div>
                  <div class="h-1 w-24 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full opacity-60"></div>
                </div>
                <p class="text-[11px] text-slate-500 text-center">Conversión estimada al tipo de cambio actual</p>
              </div>

              <div class="glass-card p-6 md:col-span-2">
                <div class="flex items-start justify-between mb-5">
                  <div>
                    <h3 class="text-base font-bold text-white">Dirección de Wallet</h3>
                    <p class="text-[11px] text-slate-500 mt-0.5">Tu dirección pública en blockchain</p>
                  </div>
                  <div class="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-xl shrink-0">📬</div>
                </div>
                <div class="bg-slate-800/40 rounded-xl p-4 mb-4 border border-slate-700/30 overflow-x-auto">
                  <code class="text-slate-200 font-mono text-xs leading-relaxed break-all">{walletState.address}</code>
                </div>
                <button onclick={() => handleCopyAddress(walletState.address)}
                  class="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 text-xs">
                  📋 Copiar Dirección
                </button>
              </div>
            </div>

            {#if walletState.network}
              <div class="glass-card p-6 fade-in">
                <h3 class="text-base font-bold text-white mb-5 flex items-center gap-3">
                  <div class="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center text-lg shrink-0">🌐</div>
                  Red Blockchain Activa
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="bg-slate-800/40 rounded-xl p-5 border border-slate-700/30">
                    <p class="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Chain ID</p>
                    <p class="text-2xl font-bold text-white">{walletState.network.chainId}</p>
                  </div>
                  <div class="bg-slate-800/40 rounded-xl p-5 border border-slate-700/30">
                    <p class="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Nombre de Red</p>
                    <p class="text-xl font-bold text-white">{walletState.network.name}</p>
                  </div>
                </div>
              </div>
            {/if}
          {:else}
            <div class="glass-card p-10 text-center fade-in">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mb-5">
                <span class="text-2xl">🔒</span>
              </div>
              <h3 class="text-lg font-bold text-white mb-2">Conecta tu Wallet</h3>
              <p class="text-sm text-slate-400 max-w-md mx-auto">Conecta tu wallet para ver tu saldo, dirección y gestión de redes.</p>
            </div>
          {/if}

        {:else if activeTab === 'send'}
          <div class="max-w-xl mx-auto fade-in">
            <TransactionForm isConnected={walletState.isConnected} />
          </div>
        {:else if activeTab === 'contract'}
          <div class="max-w-xl mx-auto fade-in">
            <SmartContractForm isConnected={walletState.isConnected} />
          </div>
        {:else if activeTab === 'networks'}
          <div class="max-w-xl mx-auto fade-in">
            <NetworkManager isConnected={walletState.isConnected} />
          </div>
        {:else if activeTab === 'balance'}
          <div class="max-w-xl mx-auto fade-in">
            <BalanceChecker />
          </div>
        {:else if activeTab === 'faucet'}
          <div class="fade-in">
            <Faucet />
          </div>
        {/if}
      </div>
    </main>
  </div>
</div>

{#each $notifications as n (n.id)}
  <Toast {...n} />
{/each}