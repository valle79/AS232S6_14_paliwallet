<script>
  /**
   * ErrorMessage - Componente para mostrar mensajes de error, advertencia e información
   * 
   * Props:
   * - message: string - Mensaje a mostrar
   * - type: 'error' | 'warning' | 'info' (default: 'error')
   * - dismissible: boolean - Si se puede cerrar el mensaje (default: false)
   * 
   * Events:
   * - dismiss: Se dispara cuando el usuario cierra el mensaje
   */
  
  import { createEventDispatcher, onMount } from 'svelte';
  
  let { 
    message = '',
    type = 'error',
    dismissible = false
  } = $props();

  const dispatch = createEventDispatcher();

  // Mapeo de tipos a estilos
  const typeStyles = {
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: '❌',
      iconColor: 'text-red-500'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: '⚠️',
      iconColor: 'text-yellow-500'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'ℹ️',
      iconColor: 'text-blue-500'
    }
  };

  let currentStyle = typeStyles.error;
  
  // Función para actualizar el estilo
  function updateCurrentStyle() {
    currentStyle = typeStyles[type] || typeStyles.error;
  }
  
  // Actualizar al montar
  onMount(() => {
    updateCurrentStyle();
  });
  
  // Verificar cambios de tipo
  let previousType = type;
  function checkTypeChange() {
    if (type !== previousType) {
      previousType = type;
      updateCurrentStyle();
    }
  }
  
  setInterval(checkTypeChange, 100);

  function handleDismiss() {
    dispatch('dismiss');
  }

  // Mapear códigos de error a mensajes amigables
  function getFriendlyMessage(message) {
    const errorMessages = {
      'WALLET_NOT_INSTALLED': 'Pali Wallet no está instalada. Por favor, instálala desde la Chrome Web Store.',
      'CONNECTION_REJECTED': 'Conexión rechazada. Por favor, acepta la conexión en Pali Wallet.',
      'CONNECTION_PENDING': 'Ya hay una solicitud de conexión pendiente. Revisa Pali Wallet.',
      'CONNECTION_ERROR': 'Error al conectar con la wallet. Inténtalo de nuevo.',
      'WALLET_NOT_CONNECTED': 'Wallet no conectada. Por favor, conecta tu wallet primero.',
      'BALANCE_FETCH_ERROR': 'Error al obtener el saldo. Verifica tu conexión a internet.',
      'ADDRESS_FETCH_ERROR': 'Error al obtener la dirección de la wallet.',
      'NETWORK_ERROR': 'Error de red. Verifica tu conexión a internet.',
      'PROVIDER_INITIALIZATION_ERROR': 'Error al inicializar la conexión con la wallet.'
    };

    return errorMessages[message] || message;
  }

  let friendlyMessage = '';
  
  // Función para actualizar el mensaje
  function updateFriendlyMessage() {
    friendlyMessage = getFriendlyMessage(message);
  }
  
  // Actualizar al montar
  onMount(() => {
    updateFriendlyMessage();
  });
  
  // Verificar cambios de mensaje
  let previousMessage = message;
  function checkMessageChange() {
    if (message !== previousMessage) {
      previousMessage = message;
      updateFriendlyMessage();
    }
  }
  
  setInterval(checkMessageChange, 100);
</script>

{#if message}
  <div 
    class="border rounded-lg p-4 flex items-start space-x-3 {currentStyle.container}"
    role="alert"
    aria-live="polite"
  >
    <!-- Icono -->
    <div class="flex-shrink-0">
      <span class="text-lg" aria-hidden="true">
        {currentStyle.icon}
      </span>
    </div>

    <!-- Contenido del mensaje -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium">
        {friendlyMessage}
      </p>
    </div>

    <!-- Botón de cerrar (si es dismissible) -->
    {#if dismissible}
      <div class="flex-shrink-0">
        <button
          type="button"
          class="inline-flex rounded-md p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          onclick={handleDismiss}
          aria-label="Cerrar mensaje"
        >
          <span class="text-lg" aria-hidden="true">✕</span>
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Estilos adicionales si es necesario */
</style>