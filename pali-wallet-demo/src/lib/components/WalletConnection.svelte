<script>
  /**
   * WalletConnection - Componente para manejar la conexión/desconexión de wallet
   * 
   * Props:
   * - isConnected: boolean
   * - isLoading: boolean
   * - error: string
   * - onconnect: () => void
   * - ondisconnect: () => void
   */
  
  import { onMount } from 'svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import ErrorMessage from './ErrorMessage.svelte';
  import { walletService } from '../services/walletService.ts';
  
  let { 
    isConnected = false,
    isLoading = false,
    error = '',
    onconnect = () => {},
    ondisconnect = () => {}
  } = $props();

  let isWalletInstalled = $state(false);
  let isCheckingWallet = $state(true);
  let walletType = $state('unknown');
  
  async function checkWalletInstallation() {
    isWalletInstalled = walletService.isWalletInstalled();
    walletType = walletService.getWalletType();
    
    if (!isWalletInstalled) {
      isWalletInstalled = await walletService.waitForWallet(5000);
      walletType = walletService.getWalletType();
    }
    
    isCheckingWallet = false;
  }
  
  onMount(() => {
    checkWalletInstallation();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkWalletInstallation);
    }
    
    const interval = setInterval(() => {
      if (!isWalletInstalled) {
        isWalletInstalled = walletService.isWalletInstalled();
        walletType = walletService.getWalletType();
      }
    }, 2000);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('DOMContentLoaded', checkWalletInstallation);
    };
  });

  function handleConnect() {
    if (isLoading) return;
    onconnect();
  }

  function handleDisconnect() {
    if (isLoading) return;
    ondisconnect();
  }

  const PALI_WALLET_INSTALL_URL = 'https://chrome.google.com/webstore/detail/pali-wallet/mlbnicldlpdimbjdcncnklfempedeipj';
</script>

<div class="wallet-connection-container">
  <!-- Error message -->
  {#if error}
    <div class="mb-6">
      <ErrorMessage 
        message={error} 
        type="error" 
        dismissible={true}
      />
    </div>
  {/if}

  {#if isCheckingWallet}
    <!-- Checking state -->
    <div class="glass-card p-12 sm:p-16 text-center">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-2xl mb-8">
        <LoadingSpinner size="large" color="blue" />
      </div>
      
      <h3 class="text-2xl font-bold text-white mb-3">
        Verificando Wallet
      </h3>
      
      <p class="text-sm text-slate-400 max-w-md mx-auto">
        Detectando si tienes Pali Wallet instalada en tu navegador...
      </p>
    </div>

  {:else if !isWalletInstalled}
    <!-- Wallet not installed -->
    <div class="glass-card p-12 sm:p-16 text-center">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-2xl mb-8">
        <span class="text-4xl">🔒</span>
      </div>
      
      <h3 class="text-2xl font-bold text-white mb-3">
        Wallet no detectada
      </h3>
      
      <p class="text-sm text-slate-400 max-w-lg mx-auto mb-8">
        Para continuar, necesitas instalar PaliWallet en tu navegador. Es una extensión segura que te permite gestionar criptomonedas y activos digitales.
      </p>
      
      <a
        href={PALI_WALLET_INSTALL_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 text-sm shadow-lg shadow-blue-600/20 hover:scale-105"
      >
        <span class="mr-2">📥</span>
        Instalar Pali Wallet
      </a>
    </div>

  {:else if !isConnected}
    <!-- Wallet installed but not connected -->
    <div class="glass-card p-12 sm:p-16 text-center">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-2xl mb-8">
        <span class="text-4xl">🔗</span>
      </div>
      
      <h3 class="text-2xl font-bold text-white mb-3">
        Conectar Wallet
      </h3>
      
      <p class="text-sm text-slate-400 max-w-lg mx-auto mb-6">
        Conecta tu billetera para comenzar a usar la aplicación. Podrás ver tu saldo, dirección pública e información de la red blockchain en tiempo real.
      </p>
      
      {#if walletType !== 'unknown'}
        <p class="text-xs text-blue-400 mb-8">
          🔷 {walletType === 'pali' ? 'PaliWallet' : walletType === 'metamask' ? 'MetaMask' : 'Wallet'} detectada
        </p>
      {/if}
      
      <button
        type="button"
        onclick={handleConnect}
        disabled={isLoading}
        class="inline-flex items-center px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed text-sm shadow-lg shadow-blue-600/20 hover:scale-105 disabled:hover:scale-100"
      >
        {#if isLoading}
          <LoadingSpinner size="small" color="white" />
          <span class="ml-3">Conectando...</span>
        {:else}
          <span class="mr-2">🔗</span>
          Conectar Wallet
        {/if}
      </button>
    </div>

  {:else}
    <!-- Wallet connected -->
    <div class="glass-card p-12 sm:p-16 text-center">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-2xl mb-8">
        <span class="text-4xl">✅</span>
      </div>
      
      <h3 class="text-2xl font-bold text-white mb-3">
        Wallet Conectada
      </h3>
      
      <p class="text-sm text-slate-400 max-w-lg mx-auto mb-8">
        Tu billetera está conectada y lista. Puedes ver tu saldo y dirección abajo, o enviar transacciones desde la pestaña correspondiente.
      </p>
      
      <button
        type="button"
        onclick={handleDisconnect}
        disabled={isLoading}
        class="inline-flex items-center px-8 py-3.5 bg-red-600/80 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed text-sm shadow-lg shadow-red-600/15 hover:scale-105 disabled:hover:scale-100"
      >
        {#if isLoading}
          <LoadingSpinner size="small" color="white" />
          <span class="ml-3">Desconectando...</span>
        {:else}
          <span class="mr-2">🔌</span>
          Desconectar
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .wallet-connection-container {
    margin: 0 auto;
    width: 100%;
  }
</style>