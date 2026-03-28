<script>
  /**
   * LoadingSpinner - Componente de spinner de carga reutilizable
   */
  
  let { 
    size = 'medium',
    color = 'blue'
  } = $props();

  // Mapeo de tamaños a clases CSS
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  };

  // Mapeo de colores a clases CSS
  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white',
    green: 'border-green-600',
    red: 'border-red-600'
  };

  // ✅ Forma correcta en Svelte 5
  const spinnerClasses = $derived(
    `${sizeClasses[size] || sizeClasses.medium} 
     ${colorClasses[color] || colorClasses.blue} 
     border-2 border-t-transparent rounded-full animate-spin`
  );
</script>

<div 
  class={spinnerClasses}
  role="status"
  aria-label="Cargando..."
>
  <span class="sr-only">Cargando...</span>
</div>

<style>
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>