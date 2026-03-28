<script>
  import { createEventDispatcher } from 'svelte';

  let { 
    message = '',
    type = 'info',
    duration = 3000,
    visible = false
  } = $props();

  const dispatch = createEventDispatcher();

  // ✅ Estado reactivo
  let currentStyle = $state({
    bg: 'bg-blue-500',
    icon: 'ℹ️',
    textColor: 'text-white'
  });

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

  // ✅ Reactividad automática cuando cambia type
  $effect(() => {
    currentStyle = typeStyles[type] || typeStyles.info;
  });

  // ✅ Auto-close reactivo (sin setInterval)
  $effect(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (visible && duration > 0) {
      const currentDuration = duration;

      timeoutId = setTimeout(() => {
        handleClose();
      }, currentDuration);
    }
  });

  function handleClose() {
    visible = false;
    dispatch('close');
  }
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