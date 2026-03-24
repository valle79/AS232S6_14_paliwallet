<script>
  /**
   * Toast - Componente de notificación temporal
   * 
   * Props:
   * - message: string - Mensaje a mostrar
   * - type: 'success' | 'error' | 'info' | 'warning' (default: 'info')
   * - duration: number - Duración en ms (default: 3000)
   * - visible: boolean - Si el toast está visible
   * 
   * Events:
   * - close: Se dispara cuando el toast se cierra
   */
  
  import { createEventDispatcher, onMount } from 'svelte';
  
  let { 
    message = '',
    type = 'info',
    duration = 3000,
    visible = false
  } = $props();

  const dispatch = createEventDispatcher();

  let timeoutId = null;

  // Estilos por tipo
  const typeStyles = {
    success: {
      bg: 'bg-green-500',
      icon: '✅',
      textColor: 'text-white'
    },
    error: {
      bg: 'bg-red-500',
      icon: '❌',
      textColor: 'text-white'
    },
    warning: {
      bg: 'bg-yellow-500',
      icon: '⚠️',
      textColor: 'text-white'
    },
    info: {
      bg: 'bg-blue-500',
      icon: 'ℹ️',
      textColor: 'text-white'
    }
  };

  let currentStyle = typeStyles.info;

  // Función para actualizar el estilo
  function updateStyle() {
    currentStyle = typeStyles[type] || typeStyles.info;
  }
  
  // Actualizar estilo al montar
  onMount(() => {
    updateStyle();
  });
  
  // Verificar cambios de tipo
  let previousType = type;
  function checkTypeChange() {
    if (type !== previousType) {
      previousType = type;
      updateStyle();
    }
  }
  
  setInterval(checkTypeChange, 100);

  // Auto-cerrar después de la duración especificada
  let previousVisible = visible;
  let previousDuration = duration;
  
  function checkAutoClose() {
    if (visible && duration > 0 && (visible !== previousVisible || duration !== previousDuration)) {
      previousVisible = visible;
      previousDuration = duration;
      
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleClose();
      }, duration);
    }
  }
  
  setInterval(checkAutoClose, 100);

  function handleClose() {
    visible = false;
    dispatch('close');
  }

  // Limpiar timeout al destruir
  onMount(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  });
</script>

{#if visible && message}
  <div 
    class="fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out"
    class:translate-x-0={visible}
    class:translate-x-full={!visible}
  >
    <div class="flex items-center {currentStyle.bg} {currentStyle.textColor} px-4 py-3 rounded-lg shadow-lg max-w-sm">
      <span class="mr-3 text-lg" aria-hidden="true">
        {currentStyle.icon}
      </span>
      
      <p class="flex-1 text-sm font-medium">
        {message}
      </p>
      
      <button
        type="button"
        onclick={handleClose}
        class="ml-3 text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded"
        aria-label="Cerrar notificación"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  /* Animaciones adicionales si es necesario */
</style>