<script>
  /**
   * WalletInfo - Componente para mostrar información de la wallet conectada
   * 
   * Props:
   * - address: string - Address de la wallet
   * - isVisible: boolean - Si el componente debe mostrarse
   * 
   * Events:
   * - copyAddress: Se dispara cuando se copia el address
   */
  
  import { createEventDispatcher, onMount } from 'svelte';
  import { formatAddress, copyToClipboard } from '../utils/formatters.js';
  import { showSuccess, showError } from '../utils/notifications.js';
  
  let { 
    address = '',
    isVisible = false
  } = $props();

  const dispatch = createEventDispatcher();

  // Estado local para el feedback de copiado
  let copyFeedback = '';
  let copyTimeout = null;

  // Address formateado para mostrar
  let formattedAddress = '';
  let fullAddress = '';
  
  // Función para actualizar addresses
  function updateAddresses() {
    formattedAddress = formatAddress(address, 6, 4);
    fullAddress = address;
  }
  
  // Actualizar cuando cambie la prop address
  onMount(() => {
    updateAddresses();
  });
  
  // Actualizar cuando cambie address - usando efecto simple
  let previousAddress = '';
  
  // Verificar cambios manualmente
  function checkAddressChange() {
    if (address !== previousAddress) {
      previousAddress = address;
      updateAddresses();
    }
  }
  
  // Llamar periódicamente para detectar cambios
  setInterval(checkAddressChange, 100);

  async function handleCopyAddress() {
    if (!address) return;

    try {
      const success = await copyToClipboard(address);
      
      if (success) {
        copyFeedback = '¡Copiado!';
        showSuccess('Dirección copiada al portapapeles');
        dispatch('copyAddress', { address });
        
        // Limpiar el feedback después de 2 segundos
        if (copyTimeout) clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
          copyFeedback = '';
        }, 2000);
      } else {
        copyFeedback = 'Error al copiar';
        showError('No se pudo copiar la dirección');
        setTimeout(() => {
          copyFeedback = '';
        }, 2000);
      }
    } catch (error) {
      console.error('Error copying address:', error);
      copyFeedback = 'Error al copiar';
      showError('Error al copiar la dirección');
      setTimeout(() => {
        copyFeedback = '';
      }, 2000);
    }
  }

  // Limpiar timeout al destruir el componente
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    if (copyTimeout) clearTimeout(copyTimeout);
  });
</script>

{#if isVisible && address}
  <div class="wallet-info-container">
    <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center">
          <span class="mr-2 text-xl">👤</span>
          Información de Wallet
        </h3>
      </div>

      <!-- Address Section -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Dirección de Wallet
          </label>
          
          <!-- Address Display -->
          <div class="relative">
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors">
              <!-- Address completo (oculto en móvil, visible en desktop) -->
              <div class="hidden sm:block">
                <code class="text-sm font-mono text-gray-800 break-all">
                  {fullAddress}
                </code>
              </div>
              
              <!-- Address formateado (visible en móvil) -->
              <div class="sm:hidden">
                <code class="text-sm font-mono text-gray-800">
                  {formattedAddress}
                </code>
              </div>
              
              <!-- Botón de copiar -->
              <button
                type="button"
                onclick={handleCopyAddress}
                class="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                title="Copiar dirección"
                aria-label="Copiar dirección de wallet"
              >
                {#if copyFeedback}
                  <span class="text-xs font-medium text-green-600">
                    {copyFeedback}
                  </span>
                {:else}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                {/if}
              </button>
            </div>
          </div>
          
          <!-- Botón de copiar alternativo para móvil -->
          <div class="mt-3 sm:hidden">
            <button
              type="button"
              onclick={handleCopyAddress}
              class="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {#if copyFeedback}
                <span class="mr-2">✅</span>
                {copyFeedback}
              {:else}
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Copiar Dirección Completa
              {/if}
            </button>
          </div>
        </div>

        <!-- Info adicional -->
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <span class="text-blue-500 text-lg">ℹ️</span>
            </div>
            <div class="ml-3">
              <p class="text-sm text-blue-800">
                Esta es tu dirección pública de wallet. Puedes compartirla de forma segura para recibir pagos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .wallet-info-container {
    max-width: 600px;
    margin: 0 auto;
  }

  /* Mejoras para dispositivos móviles */
  @media (max-width: 640px) {
    .wallet-info-container {
      padding: 0 0.5rem;
    }
  }

  /* Animación suave para el feedback de copiado */
  button:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Estilo para el código */
  code {
    word-break: break-all;
    line-height: 1.5;
  }
</style>