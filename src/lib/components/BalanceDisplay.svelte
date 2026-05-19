<script>
  /**
   * BalanceDisplay - Componente para mostrar el saldo de la wallet
   * 
   * Props:
   * - balance: string - Saldo de la wallet
   * - currency: string - Símbolo de la moneda (default: 'ETH')
   * - isLoading: boolean - Si está cargando el saldo
   * - error: string - Mensaje de error si existe
   * 
   * Events:
   * - refresh: Se dispara cuando el usuario solicita actualizar el saldo
   */
  
  import { createEventDispatcher, onMount } from 'svelte';
  import { formatBalance, formatBalanceWithCurrency } from '../utils/formatters.js';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import ErrorMessage from './ErrorMessage.svelte';
  
  let { 
    balance = '0',
    currency = 'ETH',
    isLoading = false,
    error = ''
  } = $props();

  const dispatch = createEventDispatcher();

  // Formatear el balance para mostrar
  let formattedBalance = '0';
  let balanceWithCurrency = '0 ETH';
  let isZeroBalance = true;
  let displayBalance = { main: '0', decimal: '0000' };
  
  // Función para actualizar los valores formateados
  function updateFormattedValues() {
    formattedBalance = formatBalance(balance, 4);
    balanceWithCurrency = formatBalanceWithCurrency(balance, currency, 4);
    isZeroBalance = parseFloat(balance) === 0;
    
    displayBalance = {
      main: formattedBalance.split('.')[0] || '0',
      decimal: formattedBalance.includes('.') ? formattedBalance.split('.')[1] : '0000'
    };
  }
  
  // Actualizar al montar
  onMount(() => {
    updateFormattedValues();
  });
  
  // Verificar cambios manualmente
  let previousBalance = '';
  let previousCurrency = '';
  
  function checkForChanges() {
    if (balance !== previousBalance || currency !== previousCurrency) {
      previousBalance = balance;
      previousCurrency = currency;
      updateFormattedValues();
    }
  }
  
  // Verificar cambios periódicamente
  setInterval(checkForChanges, 100);

  function handleRefresh() {
    if (isLoading) return;
    dispatch('refresh');
  }

  function handleErrorDismiss() {
    dispatch('errorDismiss');
  }
</script>

<div class="balance-display-container">
  <!-- Mensaje de error si existe -->
  {#if error}
    <div class="mb-4">
      <ErrorMessage 
        message={error} 
        type="error" 
        dismissible={true}
        on:dismiss={handleErrorDismiss}
      />
    </div>
  {/if}

  <!-- Contenedor principal -->
  <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
    <!-- Header con botón de refresh -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center">
        <span class="mr-2 text-xl">💰</span>
        Saldo de Wallet
      </h3>
      
      <button
        type="button"
        onclick={handleRefresh}
        disabled={isLoading}
        class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Actualizar saldo"
        aria-label="Actualizar saldo"
      >
        {#if isLoading}
          <LoadingSpinner size="small" color="gray" />
        {:else}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        {/if}
      </button>
    </div>

    <!-- Display del balance -->
    <div class="text-center">
      {#if isLoading && !balance}
        <!-- Estado de carga inicial -->
        <div class="flex flex-col items-center justify-center py-8">
          <LoadingSpinner size="large" color="blue" />
          <p class="mt-4 text-gray-600">Obteniendo saldo...</p>
        </div>
      {:else}
        <!-- Balance display -->
        <div class="mb-4">
          <div class="flex items-baseline justify-center space-x-1">
            <!-- Parte entera del balance -->
            <span class="text-4xl sm:text-5xl font-bold text-gray-900">
              {displayBalance.main}
            </span>
            
            <!-- Punto decimal y decimales -->
            <span class="text-2xl sm:text-3xl font-semibold text-gray-600">
              .{displayBalance.decimal.substring(0, 4)}
            </span>
            
            <!-- Símbolo de moneda -->
            <span class="text-xl sm:text-2xl font-medium text-gray-700 ml-2">
              {currency}
            </span>
          </div>
          
          <!-- Balance completo en texto pequeño -->
          <p class="text-sm text-gray-500 mt-2">
            {balanceWithCurrency}
          </p>
        </div>

        <!-- Estado del balance -->
        {#if isZeroBalance}
          <div class="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div class="flex items-center justify-center">
              <span class="text-yellow-500 text-lg mr-2">⚠️</span>
              <p class="text-sm text-yellow-800">
                Tu wallet no tiene saldo disponible
              </p>
            </div>
          </div>
        {:else}
          <div class="bg-green-50 rounded-lg p-4 border border-green-200">
            <div class="flex items-center justify-center">
              <span class="text-green-500 text-lg mr-2">✅</span>
              <p class="text-sm text-green-800">
                Saldo disponible para transacciones
              </p>
            </div>
          </div>
        {/if}

        <!-- Información adicional -->
        <div class="mt-6 pt-4 border-t border-gray-200">
          <div class="flex items-center justify-between text-sm text-gray-600">
            <span>Red:</span>
            <span class="font-medium">{currency === 'ETH' ? 'Ethereum' : currency === 'SYS' ? 'Syscoin' : 'Desconocida'}</span>
          </div>
          
          <div class="flex items-center justify-between text-sm text-gray-600 mt-2">
            <span>Última actualización:</span>
            <span class="font-medium">
              {new Date().toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .balance-display-container {
    max-width: 500px;
    margin: 0 auto;
  }

  /* Mejoras para dispositivos móviles */
  @media (max-width: 640px) {
    .balance-display-container {
      padding: 0 0.5rem;
    }
  }

  /* Animación para el botón de refresh */
  button:not(:disabled):hover svg {
    transform: rotate(180deg);
    transition: transform 0.3s ease;
  }

  /* Mejora de accesibilidad */
  button:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
</style>