<script>
  import { removeNotification } from '../utils/notifications';

  let { 
    id = 0,
    message = '',
    type = 'info',
    duration = 3000
  } = $props();

  let visible = $state(true);

  const typeStyles = {
    success: {
      bg: 'bg-emerald-600/90 border-emerald-500/30',
      icon: '✅'
    },
    error: {
      bg: 'bg-red-600/90 border-red-500/30',
      icon: '❌'
    },
    warning: {
      bg: 'bg-amber-600/90 border-amber-500/30',
      icon: '⚠️'
    },
    info: {
      bg: 'bg-blue-600/90 border-blue-500/30',
      icon: 'ℹ️'
    }
  };

  const currentStyle = $derived(typeStyles[type] || typeStyles.info);

  $effect(() => {
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timeoutId);
    }
  });

  function handleClose() {
    visible = false;
    removeNotification(id);
  }
</script>

{#if visible && message}
  <div 
    class="fixed top-4 right-4 z-[100] transform transition-all duration-300 ease-out fade-in"
  >
    <div class="flex items-center {currentStyle.bg} backdrop-blur-xl text-white px-4 py-3 rounded-xl shadow-2xl max-w-sm border">
      <span class="mr-3 text-base" aria-hidden="true">
        {currentStyle.icon}
      </span>
      
      <p class="flex-1 text-sm font-medium">
        {message}
      </p>
      
      <button
        type="button"
        onclick={handleClose}
        class="ml-3 text-white/70 hover:text-white transition-colors rounded-lg p-1"
        aria-label="Cerrar notificación"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
{/if}