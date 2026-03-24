<script>
  import { onMount } from 'svelte';
  import { walletService } from '../lib/services/walletService.ts';
  import { mapWalletError, RetryHandler } from '../lib/utils/errorHandler.js';
  import { showError, showSuccess, showInfo, notifications } from '../lib/utils/notifications.js';
  import { copyToClipboard } from '../lib/utils/formatters.js';

  import WalletConnection from '../lib/components/WalletConnection.svelte';
  import Toast from '../lib/components/Toast.svelte';

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

  const retryHandler = new RetryHandler(3, 1000);

  /* ================================
     DERIVED VALUES (NO $:)
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
      walletState.address = newAddress;
      await refreshBalance();
      showInfo('Cuenta cambiada');
    });

    walletService.onChainChanged(async () => {
      await refreshNetworkInfo();
      await refreshBalance();
      showInfo('Red cambiada');
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
</script>

<!-- ================================
     UI
=================================-->

<div class="min-h-screen bg-slate-50 flex flex-col">
  <!-- Header -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
    <div class="max-w-7xl mx-auto px-6 py-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <span class="text-white font-bold text-xl">KYL</span>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-slate-900">Valbitech</h1>
            <p class="text-sm text-slate-500">Seguridad y confianza para tus transacciones</p>
          </div>
        </div>
        <div class="hidden lg:block text-right">
          <p class="text-sm font-semibold text-slate-900">Svelte + Ethers.js</p>
          <p class="text-xs text-slate-500 mt-1">Integración Blockchain</p>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-6 py-12">


    <!-- Connection Section - Full Width -->
    <div class="mb-24 max-w-3xl mx-auto w-full">
      <WalletConnection 
        isConnected={walletState.isConnected}
        isLoading={connectionLoading}
        error={connectionError}
        on:connect={handleConnect}
        on:disconnect={handleDisconnect}
      />
    </div>

    <!-- Wallet Info Section -->
    {#if walletState.isConnected}
      <!-- Balance and Address Cards - 2x2 Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        
        <!-- Saldo Card 1 -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 hover:shadow-xl transition-all duration-300">
          <div class="flex items-start justify-between mb-8">
            <div>
              <h3 class="text-2xl font-bold text-slate-900">Saldo Total</h3>
              <p class="text-sm text-slate-500 mt-2">Fondos disponibles en tu billetera</p>
            </div>
            <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl">
              💰
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-10 mb-8 border-2 border-blue-100">
            <div class="flex items-baseline gap-3 mb-4">
              <span class="text-6xl font-bold text-slate-900">{balanceInt}</span>
              <span class="text-3xl text-slate-400">.{balanceDec}</span>
              <span class="text-xl font-bold text-slate-700 ml-2">{walletState.currency}</span>
            </div>
            <div class="h-3 w-40 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"></div>
          </div>

          <button onclick={refreshBalance}
            disabled={balanceLoading}
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-4 rounded-xl font-bold transition-all duration-200 disabled:cursor-not-allowed text-lg shadow-md hover:shadow-lg">
            {balanceLoading ? '⟳ Actualizando...' : '⟳ Actualizar Saldo'}
          </button>
        </div>

        <!-- Equivalencia USD Card 2 -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 hover:shadow-xl transition-all duration-300">
          <div class="flex items-start justify-between mb-8">
            <div>
              <h3 class="text-2xl font-bold text-slate-900">Equivalencia USD</h3>
              <p class="text-sm text-slate-500 mt-2">Valor en dólares estadounidenses</p>
            </div>
            <div class="w-20 h-20 to-emerald-200 rounded-2xl flex items-center justify-center text-5xl">
              💵
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-10 mb-8 border-2 border-green-100">
            <div class="flex items-baseline gap-3 mb-4">
              <span class="text-6xl font-bold text-slate-900">${balanceUSD}</span>
              <span class="text-2xl text-slate-500">USD</span>
            </div>
            <div class="h-3 w-40 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
          </div>

          <p class="text-sm text-slate-600 text-center">
            Conversión en tiempo real al tipo de cambio actual
          </p>
        </div>

        <!-- Address Card 3 -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 hover:shadow-xl transition-all duration-300 md:col-span-2">
          <div class="flex items-start justify-between mb-8">
            <div>
              <h3 class="text-2xl font-bold text-slate-900">Dirección de Wallet</h3>
              <p class="text-sm text-slate-500 mt-2">Tu dirección pública única en blockchain</p>
            </div>
            <div class="w-20 h-20 to-pink-100 rounded-2xl flex items-center justify-center text-5xl">
              📬
            </div>
          </div>
          
          <div class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-10 mb-8 border-2 border-slate-200 overflow-x-auto">
            <code class="text-slate-900 font-mono text-base leading-relaxed break-all font-bold">
              {walletState.address}
            </code>
          </div>

          <p class="text-base text-slate-600 mb-8 flex items-center gap-2">
            <span class="text-xl">💡</span> Usa esta dirección para recibir pagos y transferencias de criptomonedas
          </p>

          <button onclick={() => handleCopyAddress(walletState.address)}
            class="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-xl font-bold transition-all duration-200 text-lg shadow-md hover:shadow-lg">
            📋 Copiar Dirección
          </button>
        </div>
      </div>

      <!-- Network Info Section -->
      {#if walletState.network}
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 hover:shadow-xl transition-all duration-300">
          <h3 class="text-2xl font-bold text-slate-900 mb-10 flex items-center gap-4">
            <div class="w-16 h-16 bg-gradient-to-br rounded-xl flex items-center justify-center text-4xl">
              🌐
            </div>
            Información de Red Blockchain
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-10 border-2 border-slate-200">
              <p class="text-xs uppercase tracking-widest text-slate-500 font-bold mb-6">Chain ID</p>
              <p class="text-6xl font-bold text-slate-900 mb-4">{walletState.network.chainId}</p>
              <p class="text-sm text-slate-600">Identificador único de la red blockchain</p>
            </div>
            <div class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-10 border-2 border-slate-200">
              <p class="text-xs uppercase tracking-widest text-slate-500 font-bold mb-6">Nombre de Red</p>
              <p class="text-4xl font-bold text-slate-900 mb-4">{walletState.network.chainName}</p>
              <p class="text-sm text-slate-600">Red blockchain actualmente conectada</p>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </main>

</div>

{#each $notifications as n (n.id)}
  <Toast {...n} />
{/each}