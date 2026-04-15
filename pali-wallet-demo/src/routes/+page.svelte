<script lang="ts">
  import { onMount } from 'svelte';
  
  let isVisible = $state(false);
  let activeFeature = $state(0);

  onMount(() => {
    setTimeout(() => { isVisible = true; }, 100);
    
    // Auto-rotate features
    const interval = setInterval(() => {
      activeFeature = (activeFeature + 1) % 3;
    }, 4000);
    return () => clearInterval(interval);
  });

  const stats = [
    { value: 'Multi-Chain', label: 'Soporte de Redes' },
    { value: 'P2P', label: 'Transacciones' },
    { value: 'Real-Time', label: 'Hash Tracking' },
    { value: '100%', label: 'Non-Custodial' }
  ];
</script>

<svelte:head>
  <title>Pali Wallet | Introducción al Proyecto</title>
  <meta name="description" content="Pali Wallet DApp — Gestión segura de activos digitales con soporte multi-cadena, transacciones P2P y cambio dinámico de redes blockchain." />
</svelte:head>

<div class="min-h-screen bg-[#080c16] text-slate-200 relative overflow-hidden">
  
  <!-- Animated background orbs -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden">
    <div class="absolute -top-48 -left-48 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] animate-float"></div>
    <div class="absolute top-1/3 -right-24 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[130px]" style="animation: float 5s ease-in-out infinite 1s;"></div>
    <div class="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[120px]" style="animation: float 6s ease-in-out infinite 2s;"></div>
  </div>

  <!-- Navbar -->
  <nav class="relative z-20 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between transition-all duration-700 {isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}">
    <div class="flex items-center gap-3">
      <div class="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
        <span class="text-white font-bold text-lg">PW</span>
      </div>
      <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Pali Wallet</span>
    </div>
    <a
      href="/app"
      class="px-5 py-2.5 font-semibold text-sm text-white rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 transition-all duration-300 hover:scale-105 hover:shadow-blue-500/30"
    >
      🚀 Launch App
    </a>
  </nav>

  <main class="relative z-10 max-w-7xl mx-auto px-6">
    
    <!-- ==============================
         1) DESCRIPCIÓN — Hero Section
    =============================== -->
    <section id="hero" class="pt-16 pb-24 text-center max-w-4xl mx-auto transition-all duration-700 delay-100 {isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}">
      <div class="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 tracking-wide">
        ⛓️ DApp de Gestión Blockchain
      </div>
      
      <h1 class="text-5xl sm:text-6xl lg:text-7xl font-black mb-8 leading-[1.1] tracking-tight">
        Transacciones seguras<br/>
        <span class="text-gradient">multi-cadena</span>
      </h1>
      
      <p class="text-lg sm:text-xl text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto">
        Una billetera descentralizada construida con <strong class="text-slate-200">Svelte 5</strong> y <strong class="text-slate-200">Ethers.js</strong>, 
        diseñada para ofrecer transferencias P2P con captura de hash en tiempo real y soporte para redes UTXO y EVM.
      </p>

      <div class="flex flex-col sm:flex-row justify-center gap-4 mb-20">
        <a href="/app" class="px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-all shadow-xl hover:shadow-white/15 hover:-translate-y-0.5 text-base">
          Empezar a Usar →
        </a>
        <a href="#objetivos" class="px-8 py-4 bg-slate-800/60 text-slate-200 font-semibold rounded-xl border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600/50 transition-all text-base">
          Conocer más
        </a>
      </div>

      <!-- Stats bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        {#each stats as stat}
          <div class="glass-card p-5 text-center">
            <p class="text-xl font-bold text-white mb-1">{stat.value}</p>
            <p class="text-xs text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- ==============================
         2) OBJETIVOS
    =============================== -->
    <section id="objetivos" class="py-20 transition-all duration-700 delay-200 {isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}">
      <div class="text-center mb-14">
        <span class="text-blue-400 text-sm font-semibold uppercase tracking-widest">Objetivos</span>
        <h2 class="text-4xl font-bold text-white mt-3">¿Qué buscamos lograr?</h2>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-card p-8 group">
          <div class="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🔄</div>
          <h3 class="text-lg font-bold text-white mb-3">Interoperabilidad</h3>
          <p class="text-slate-400 text-sm leading-relaxed">Facilitar la transición entre redes UTXO (Bitcoin, Litecoin) y EVM (Ethereum, Polygon, Arbitrum, Base) de manera transparente e intuitiva para el usuario.</p>
        </div>
        <div class="glass-card p-8 group">
          <div class="w-14 h-14 bg-emerald-500/15 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🔐</div>
          <h3 class="text-lg font-bold text-white mb-3">Seguridad Verificable</h3>
          <p class="text-slate-400 text-sm leading-relaxed">Ofrecer un sistema de transferencias P2P que captura y muestra el Transaction Hash, permitiendo verificar cada operación en el block explorer correspondiente.</p>
        </div>
        <div class="glass-card p-8 group">
          <div class="w-14 h-14 bg-purple-500/15 text-purple-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">✨</div>
          <h3 class="text-lg font-bold text-white mb-3">Experiencia Premium</h3>
          <p class="text-slate-400 text-sm leading-relaxed">Brindar una interfaz de usuario moderna y profesional que elimine las barreras comunes del ecosistema Web3. Diseño basado en glassmorphism y micro-animaciones.</p>
        </div>
      </div>
    </section>

    <!-- ==============================
         3) BENEFICIOS
    =============================== -->
    <section id="beneficios" class="py-20 transition-all duration-700 delay-300 {isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}">
      <div class="text-center mb-14">
        <span class="text-purple-400 text-sm font-semibold uppercase tracking-widest">Beneficios</span>
        <h2 class="text-4xl font-bold text-white mt-3">¿Por qué elegir Pali Wallet?</h2>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-card p-8 flex gap-5 items-start group">
          <div class="w-12 h-12 shrink-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🔑</div>
          <div>
            <h3 class="text-lg font-bold text-white mb-2">Control Total (Non-Custodial)</h3>
            <p class="text-slate-400 text-sm leading-relaxed">Tú conservas las llaves privadas. Ningún servidor centralizado almacena tus fondos. Autenticación directa con tu proveedor de wallet (MetaMask, Pali).</p>
          </div>
        </div>
        <div class="glass-card p-8 flex gap-5 items-start group">
          <div class="w-12 h-12 shrink-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">⚡</div>
          <div>
            <h3 class="text-lg font-bold text-white mb-2">Cero Fricción</h3>
            <p class="text-slate-400 text-sm leading-relaxed">Autodetección de redes. Si una red no existe en tu wallet, la DApp solicita agregarla automáticamente con la configuración RPC completa.</p>
          </div>
        </div>
        <div class="glass-card p-8 flex gap-5 items-start group">
          <div class="w-12 h-12 shrink-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📋</div>
          <div>
            <h3 class="text-lg font-bold text-white mb-2">Trazabilidad Completa</h3>
            <p class="text-slate-400 text-sm leading-relaxed">Cada transacción genera un hash verificable. Accede al detalle completo en Etherscan, Polygonscan u otros exploradores con un solo clic.</p>
          </div>
        </div>
        <div class="glass-card p-8 flex gap-5 items-start group">
          <div class="w-12 h-12 shrink-0 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🧪</div>
          <div>
            <h3 class="text-lg font-bold text-white mb-2">Multi-Network Testing</h3>
            <p class="text-slate-400 text-sm leading-relaxed">Soporte completo para mainnets y testnets (Sepolia, Holesky, Amoy). Desarrolla y prueba sin usar fondos reales.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ==============================
         4) CARACTERÍSTICAS
    =============================== -->
    <section id="caracteristicas" class="py-20 transition-all duration-700 delay-400 {isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}">
      <div class="text-center mb-14">
        <span class="text-emerald-400 text-sm font-semibold uppercase tracking-widest">Características</span>
        <h2 class="text-4xl font-bold text-white mt-3">Funcionalidades Principales</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Feature cards with interactive state -->
        <button
          type="button"
          onclick={() => activeFeature = 0}
          class="glass-card p-8 text-left cursor-pointer transition-all duration-300 {activeFeature === 0 ? 'border-blue-500/40 glow-blue' : ''}"
        >
          <div class="text-3xl mb-5">🔗</div>
          <h3 class="text-lg font-bold text-white mb-3">Gestor de Redes Dinámico</h3>
          <p class="text-slate-400 text-sm leading-relaxed">Cambia entre redes UTXO y EVM con un selector visual. Inyección automática de RPC cuando la red no existe en tu wallet.</p>
          {#if activeFeature === 0}
            <div class="mt-4 pt-4 border-t border-slate-700/50">
              <p class="text-xs text-blue-400">✓ Bitcoin &middot; Litecoin &middot; Ethereum &middot; Polygon &middot; Arbitrum &middot; Base</p>
            </div>
          {/if}
        </button>

        <button
          type="button"
          onclick={() => activeFeature = 1}
          class="glass-card p-8 text-left cursor-pointer transition-all duration-300 {activeFeature === 1 ? 'border-indigo-500/40 glow-indigo' : ''}"
        >
          <div class="text-3xl mb-5">⚡</div>
          <h3 class="text-lg font-bold text-white mb-3">Transacciones P2P</h3>
          <p class="text-slate-400 text-sm leading-relaxed">Envía activos nativos de cuenta a cuenta. Validación de dirección, estimación de gas y confirmación en tiempo real.</p>
          {#if activeFeature === 1}
            <div class="mt-4 pt-4 border-t border-slate-700/50">
              <p class="text-xs text-indigo-400">✓ Estimación de Gas &middot; Validación Estricta &middot; Historial Local</p>
            </div>
          {/if}
        </button>

        <button
          type="button"
          onclick={() => activeFeature = 2}
          class="glass-card p-8 text-left cursor-pointer transition-all duration-300 {activeFeature === 2 ? 'border-purple-500/40 glow-indigo' : ''}"
        >
          <div class="text-3xl mb-5">🛡️</div>
          <h3 class="text-lg font-bold text-white mb-3">Hash Tracking en Vivo</h3>
          <p class="text-slate-400 text-sm leading-relaxed">Captura inmediata del Transaction Hash. Monitoreo del estado (pendiente, confirmada, fallida) con enlace directo al explorer.</p>
          {#if activeFeature === 2}
            <div class="mt-4 pt-4 border-t border-slate-700/50">
              <p class="text-xs text-purple-400">✓ Etherscan &middot; Polygonscan &middot; Arbiscan &middot; BaseScan</p>
            </div>
          {/if}
        </button>
      </div>
    </section>

    <!-- ==============================
         5) DESARROLLADOR
    =============================== -->
    <section id="desarrollador" class="py-20 pb-32 transition-all duration-700 delay-500 {isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}">
      <div class="text-center mb-14">
        <span class="text-amber-400 text-sm font-semibold uppercase tracking-widest">Equipo</span>
        <h2 class="text-4xl font-bold text-white mt-3">Desarrollador del Proyecto</h2>
      </div>

      <div class="max-w-3xl mx-auto glass-card p-10 sm:p-14">
        <div class="flex flex-col sm:flex-row gap-8 items-center">
          <!-- Photo with gradient ring -->
          <div class="relative shrink-0">
            <div class="w-40 h-40 sm:w-48 sm:h-48 rounded-full p-[3px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500">
              <img
                src="/developer_photo.jpeg"
                alt="Foto del desarrollador"
                class="w-full h-full object-cover rounded-full"
              />
            </div>
            <!-- Status badge -->
            <div class="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 rounded-full border-4 border-[#0f172a] flex items-center justify-center text-sm">
              ✓
            </div>
          </div>
          
          <!-- Info -->
          <div class="text-center sm:text-left flex-1">
            <span class="inline-block px-3 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 text-xs font-semibold mb-3 uppercase tracking-wider">Lead Developer</span>
            <h3 class="text-3xl font-bold text-white mb-2">Ing. Luis Valbitech</h3>
            <p class="text-slate-400 text-sm leading-relaxed mb-6">
              Ingeniero de Software especializado en desarrollo de aplicaciones descentralizadas (DApps). 
              Proyecto académico desarrollado como trabajo de curso, aplicando tecnologías de vanguardia: 
              <strong class="text-slate-200">SvelteKit 5 + TailwindCSS + Ethers.js.</strong>
            </p>
            
            <div class="flex flex-wrap justify-center sm:justify-start gap-2">
              <span class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">Svelte 5</span>
              <span class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">Ethers.js</span>
              <span class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">Blockchain</span>
              <span class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">Web3</span>
            </div>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- Footer -->
  <footer class="relative z-10 border-t border-slate-800 py-8">
    <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
      <p class="text-sm text-slate-500">© 2026 Pali Wallet DApp — Proyecto Académico</p>
      <a href="/app" class="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Ir a la Aplicación →</a>
    </div>
  </footer>
</div>
