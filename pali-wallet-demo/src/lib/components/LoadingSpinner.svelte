<script>
  import { onMount } from 'svelte';

  /**
   * LoadingSpinner - Componente de spinner de carga reutilizable
   * 
   * Props:
   * - size: 'small' | 'medium' | 'large' (default: 'medium')
   * - color: Color del spinner (default: 'blue')
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

  // Clases CSS dinámicas
  let spinnerClasses = '';
  
  // Función para actualizar las clases
  function updateClasses() {
    const sizeClass = sizeClasses[size] || sizeClasses.medium;
    const colorClass = colorClasses[color] || colorClasses.blue;
    spinnerClasses = `${sizeClass} ${colorClass} border-2 border-t-transparent rounded-full animate-spin`;
  }
  
  // Inicializar clases al montar
  onMount(() => {
    updateClasses();
  });
</script>

<div 
  class={spinnerClasses}
  role="status"
  aria-label="Cargando..."
>
  <span class="sr-only">Cargando...</span>
</div>

<style>
  /* Animación personalizada para el spinner si Tailwind no está disponible */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>