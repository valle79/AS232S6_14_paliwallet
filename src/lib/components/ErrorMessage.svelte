<script>
  /**
   * ErrorMessage - Componente para mostrar mensajes de error, advertencia e información
   */
  
  let { 
    message = '',
    type = 'error',
    dismissible = false,
    ondismiss = () => {}
  } = $props();

  // Mapeo de tipos a estilos (dark theme)
  const typeStyles = {
    error: {
      container: 'bg-red-500/10 border-red-500/20 text-red-300',
      icon: '❌'
    },
    warning: {
      container: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
      icon: '⚠️'
    },
    info: {
      container: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
      icon: 'ℹ️'
    }
  };

  const currentStyle = $derived(typeStyles[type] || typeStyles.error);

  // Mapear códigos de error a mensajes amigables
  const friendlyMessage = $derived.by(() => {
    const errorMessages = {
      'WALLET_NOT_INSTALLED': 'Pali Wallet no está instalada. Por favor, instálala desde la Chrome Web Store.',
      'WALLET_IN_UTXO_MODE': '⚠️ PaliWallet está en modo UTXO (Syscoin/Bitcoin). Por favor, cambia a una red EVM (Ethereum, Polygon, Arbitrum, Base, etc.) desde la extensión de PaliWallet y recarga esta página.',
      'CONNECTION_REJECTED': 'Conexión rechazada. Por favor, acepta la conexión en Pali Wallet.',
      'CONNECTION_PENDING': 'Ya hay una solicitud de conexión pendiente. Revisa Pali Wallet.',
      'CONNECTION_TIMEOUT': 'La conexión tardó demasiado. Asegúrate de que Pali Wallet esté activo.',
      'CONNECTION_ERROR': 'Error al conectar con la wallet. Inténtalo de nuevo.',
      'WALLET_NOT_CONNECTED': 'Wallet no conectada. Por favor, conecta tu wallet primero.',
      'BALANCE_FETCH_ERROR': 'Error al obtener el saldo. Verifica tu conexión a internet.',
      'ADDRESS_FETCH_ERROR': 'Error al obtener la dirección de la wallet.',
      'NETWORK_ERROR': 'Error de red. Verifica tu conexión a internet.',
      'PROVIDER_INITIALIZATION_ERROR': 'Error al inicializar la conexión con la wallet.'
    };

    return errorMessages[message] || message;
  });
</script>

{#if message}
  <div 
    class="border rounded-xl p-4 flex items-start gap-3 {currentStyle.container}"
    role="alert"
    aria-live="polite"
  >
    <div class="flex-shrink-0">
      <span class="text-lg" aria-hidden="true">
        {currentStyle.icon}
      </span>
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium">
        {friendlyMessage}
      </p>
    </div>

    {#if dismissible}
      <div class="flex-shrink-0">
        <button
          type="button"
          class="inline-flex rounded-lg p-1.5 hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
          onclick={ondismiss}
          aria-label="Cerrar mensaje"
        >
          <span class="text-sm" aria-hidden="true">✕</span>
        </button>
      </div>
    {/if}
  </div>
{/if}