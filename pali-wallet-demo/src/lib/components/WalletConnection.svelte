<script>
  /**
   * WalletConnection - Componente para manejar la conexión/desconexión de wallet
   * 
   * Props:
   * - isConnected: boolean - Estado de conexión actual
   * - isLoading: boolean - Si está en proceso de conexión
   * - error: string - Mensaje de error si existe
   * 
   * Events:
   * - connect: Se dispara cuando el usuario quiere conectar
   * - disconnect: Se dispara cuando el usuario quiere desconectar
   */
  
  import { createEventDispatcher, onMount } from 'svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import ErrorMessage from './ErrorMessage.svelte';
  import { walletService } from '../services/walletService.ts';
  
  let { 
    isConnected = false,
    isLoading = false,
    error = ''
  } = $props();

  const dispatch = createEventDispatcher();

  // Verificar si la wallet está instalada - usando $state para Svelte 5
  let isWalletInstalled = $state(false);
  let isCheckingWallet = $state(true);
  
  // Función para verificar la instalación
  async function checkWalletInstallation() {
    console.log('Checking wallet installation...');
    
    // Primero verificar inmediatamente
    isWalletInstalled = walletService.isWalletInstalled();
    
    if (!isWalletInstalled) {
      // Si no se detecta, esperar un poco más por si se está cargando
      console.log('Wallet not detected immediately, waiting...');
      isWalletInstalled = await walletService.waitForWallet(3000);
    }
    
    isCheckingWallet = false;
    console.log('Wallet installation check complete:', isWalletInstalled);
    console.log('Component state - isCheckingWallet:', isCheckingWallet, 'isWalletInstalled:', isWalletInstalled);
  }
  
  // Verificar instalación al montar el componente
  onMount(() => {
    checkWalletInstallation();
    
    // También verificar cuando la página termine de cargar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkWalletInstallation);
    }
    
    // Verificar periódicamente por si la wallet se instala después
    const interval = setInterval(() => {
      if (!isWalletInstalled) {
        const wasInstalled = isWalletInstalled;
        isWalletInstalled = walletService.isWalletInstalled();
        
        if (wasInstalled !== isWalletInstalled) {
          console.log('Wallet installation status changed:', isWalletInstalled);
        }
      }
    }, 2000);
    
    // Limpiar el interval al destruir el componente
    return () => {
      clearInterval(interval);
      document.removeEventListener('DOMContentLoaded', checkWalletInstallation);
    };
  });

async function handleConnect() {
  if (isLoading) return;

  try {
    isLoading = true;

    const address = await walletService.connectWallet();

    console.log("Wallet conectada:", address);

    dispatch('connect', { address });

  } catch (error) {
    console.error(error);
    dispatch('error', error.message); // importante
  } finally {
    isLoading = false;
  }
}

  async function handleDisconnect() {
    if (isLoading) return;
    
    try {
      dispatch('disconnect');
    } catch (error) {
      console.error('Error in disconnect handler:', error);
    }
  }

  function handleErrorDismiss() {
    // Notificar al componente padre que se cerró el error
    dispatch('errorDismiss');
  }

  // URL de instalación de Pali Wallet
  const PALI_WALLET_INSTALL_URL = 'https://chrome.google.com/webstore/detail/pali-wallet/mlbnicldlpdimbjdcncnklfempedeipj';
</script>

<div class="wallet-connection-container">
  <!-- Mensaje de error si existe -->
  {#if error}
    <div class="mb-10">
      <ErrorMessage 
        message={error} 
        type="error" 
        dismissible={true}
        on:dismiss={handleErrorDismiss}
      />
    </div>
  {/if}

  {#if isCheckingWallet}
    <!-- Estado de verificación -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
      <div class="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-2xl mb-10">
        <LoadingSpinner size="large" color="blue" />
      </div>
      
      <h3 class="text-3xl font-bold text-slate-900 mb-4">
        Verificando Wallet
      </h3>
      
      <p class="text-lg text-slate-600 max-w-xl mx-auto">
        Detectando si tienes Pali Wallet instalada en tu navegador...
      </p>
    </div>
  {:else if !isWalletInstalled}
    <!-- Wallet no instalada -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
      <div class="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-2xl mb-10">
        <span class="text-5xl">🔒</span>
      </div>
      
      <h3 class="text-3xl font-bold text-slate-900 mb-4">
        Pali Wallet no instalada
      </h3>
      
      <p class="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
        Para continuar, necesitas instalar Pali Wallet en tu navegador. Es una extensión segura y confiable que te permite gestionar criptomonedas de forma controlada.
      </p>
      
      <a
        href={PALI_WALLET_INSTALL_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-xl hover:scale-105 transform"
      >
        <span class="mr-3 text-2xl">📥</span>
        Instalar Pali Wallet
      </a>
    </div>
  {:else if !isConnected}
    <!-- Wallet instalada pero no conectada -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">

      
      <h3 class="text-3xl font-bold text-slate-900 mb-4">
        Conectar Pali Wallet
      </h3>
      
      <p class="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
        Conecta tu billetera para comenzar a usar la aplicación. Podrás ver tu saldo en tiempo real, tu dirección pública y la información de la red blockchain.
      </p>
      
      <button
        type="button"
        onclick={handleConnect}
        disabled={isLoading}
        class="inline-flex items-center px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl hover:scale-105 transform disabled:transform-none"
      >
        {#if isLoading}
          <LoadingSpinner size="small" color="white" />
          <span class="ml-4">Conectando...</span>
        {:else}
          <span class="mr-3 text-2xl">🔗</span>
          Conectar Pali Wallet
        {/if}
      </button>
    </div>
  {:else}
    <!-- Wallet conectada -->
    <div class="bg-white rounded-2xl border border-slate-200 p-16 text-center">

      
      <h3 class="text-3xl font-bold text-slate-900 mb-4">
        Wallet Conectada Correctamente
      </h3>
      
      <p class="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
        Tu billetera está correctamente conectada y lista para usar. Puedes ver tu saldo y dirección en las tarjetas inferiores. Todos los datos se actualizan en tiempo real.
      </p>
      
      <button
        type="button"
        onclick={handleDisconnect}
        disabled={isLoading}
        class="inline-flex items-center px-10 py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-all duration-200 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl hover:scale-105 transform disabled:transform-none"
      >
        {#if isLoading}
          <LoadingSpinner size="small" color="white" />
          <span class="ml-4">Desconectando...</span>
        {:else}
          <span class="mr-3 text-2xl">🔌</span>
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