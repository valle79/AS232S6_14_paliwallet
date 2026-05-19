<script lang="ts">
  /**
   * @component TransactionForm.svelte
   * @description Componente para realizar transacciones P2P
   * Captura hash y permite monitoreo de estado
   */

  import { transactionService } from '../services/transactionService';
  import { walletService } from '../services/walletService';
  import { showError, showSuccess, showInfo } from '../utils/notifications';
  import { copyToClipboard } from '../utils/formatters';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import { ALL_NETWORKS } from '../config/networkConfig';
  import { onMount } from 'svelte';

  /* ================================
     PROPS
  =================================*/
  let { isConnected = false } = $props();

  /* ================================
     STATE (Svelte 5 runes)
  =================================*/
  let recipientAddress = $state('');
  let amount = $state('');
  let useSmartContract = $state(false);
  let isLoading = $state(false);
  let transactionHash = $state('');
  let transactionStatus = $state('');
  let showHashDisplay = $state(false);
  let gasPrice = $state('');
  let estimatedGas = $state('');
  let totalFee = $state('');
  let recentTransactions = $state<
    Array<{ hash: string; to: string; value: string; status: string; timestamp: number; chainId?: string; networkName?: string }>
  >([]);
  let showAllNetworks = $state(false); // 🔥 NUEVO: Toggle para mostrar todas las redes

  /* ================================
     LIFECYCLE
  =================================*/
  onMount(async () => {
    // Cargar transacciones del historial
    await loadTransactions();
    
    // 🔥 Verificar estado de transacciones pendientes
    if (isConnected && recentTransactions.length > 0) {
      await updatePendingTransactions();
    }
  });

  // 🔥 NUEVO: Efecto reactivo para recargar transacciones cuando cambia el filtro o la conexión
  $effect(() => {
    if (isConnected) {
      loadTransactions();
    }
  });

  /* ================================
     FUNCTIONS
  =================================*/

  /**
   * 🔥 NUEVO: Cargar transacciones (con filtro opcional por red)
   */
  async function loadTransactions(): Promise<void> {
    const currentNetwork = walletService.currentNetwork;
    
    let history;
    if (showAllNetworks || !currentNetwork) {
      // Mostrar todas las transacciones
      history = await transactionService.getTransactionHistory();
    } else {
      // Filtrar por red actual
      history = await transactionService.getTransactionHistoryByChain(currentNetwork.chainId);
    }
    
    recentTransactions = history.map(tx => ({
      hash: tx.hash,
      to: tx.to,
      value: tx.value,
      status: tx.status || 'pending',
      timestamp: tx.timestamp || Date.now(),
      chainId: tx.chainId,
      networkName: tx.networkName
    }));
    
    console.log('📋 Transacciones cargadas:', recentTransactions.length, showAllNetworks ? '(todas las redes)' : '(red actual)');
  }

  /**
   * Actualizar estado de transacciones pendientes
   */
  async function updatePendingTransactions(): Promise<void> {
    const pendingTxs = recentTransactions.filter(tx => tx.status === 'pending');
    
    if (pendingTxs.length === 0) return;
    
    console.log('🔄 Verificando estado de', pendingTxs.length, 'transacciones pendientes...');
    
    for (const tx of pendingTxs) {
      try {
        // Actualizar estado en el servicio (esto también actualiza localStorage y DB)
        await transactionService.updateTransactionStatus(tx.hash);
      } catch (error) {
        console.warn(`⚠️ No se pudo verificar transacción ${tx.hash.substring(0, 10)}...`);
      }
    }
    
    // Recargar el historial actualizado desde DB
    await loadTransactions();
  }
  const isFormValid = $derived(
    recipientAddress.trim().length > 0 &&
    parseFloat(String(amount)) > 0 &&
    isConnected
  );

  const canEstimateGas = $derived(
    isFormValid &&
    transactionService.isValidAddress(recipientAddress) &&
    !isNaN(parseFloat(amount))
  );

  const currentCurrency = $derived(() => {
    const network = walletService.currentNetwork;
    if (!network) return 'ETH';
    return walletService.getCurrencySymbol(network.chainId);
  });

  /* ================================
     FUNCTIONS
  =================================*/

  function resetForm(): void {
    recipientAddress = '';
    amount = '';
    useSmartContract = false;
    gasPrice = '';
    estimatedGas = '';
    totalFee = '';
  }

  async function estimateTransaction(): Promise<void> {
    if (!canEstimateGas) return;

    // Validar que el monto sea válido
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Ingresa un monto válido mayor a 0');
      return;
    }

    try {
      isLoading = true;

      // Convertir amount a string para asegurar compatibilidad
      const amountStr = String(amount);
      
      console.log('📊 Estimando gas para:', { to: recipientAddress, value: amountStr });

      const currentGasPrice = await transactionService.getGasPrice();
      gasPrice = currentGasPrice;

      const estimated = await transactionService.estimateGas({
        to: recipientAddress,
        value: amountStr
      });

      estimatedGas = estimated;

      const estimatedInWei = BigInt(estimated);
      const gasPriceInWei = BigInt(Math.floor(parseFloat(currentGasPrice) * 1e9)); // Convert Gwei to Wei
      const feeInWei = estimatedInWei * gasPriceInWei;
      totalFee = transactionService.fromWei(feeInWei);

      showSuccess(`✅ Gas estimado: ${estimated} unidades — Fee: ~${parseFloat(totalFee).toFixed(6)} ${currentCurrency()}`);
    } catch (error: any) {
      console.warn('⚠️ Estimación de gas falló, pero puedes enviar la transacción igual');
      
      // No mostrar error crítico, solo advertencia
      showInfo('⚠️ No se pudo estimar el gas, pero puedes intentar enviar la transacción');
    } finally {
      isLoading = false;
    }
  }

  async function handleSendTransaction(): Promise<void> {
    if (!isFormValid) {
      showError('Por favor completa todos los campos');
      return;
    }

    if (!transactionService.isValidAddress(recipientAddress)) {
      showError('Dirección inválida');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showError('Monto debe ser un número positivo');
      return;
    }

    isLoading = true;
    showHashDisplay = false;

    try {
      showInfo('Enviando transacción...');

      if (useSmartContract) {
        showInfo('Preparando interacción con Smart Contract (Opcional)...');
      }

      // Convertir amount a string para asegurar compatibilidad
      const amountStr = String(amount);

      const hash = await transactionService.sendTransaction({
        to: recipientAddress,
        value: amountStr
      });

      transactionHash = hash;
      transactionStatus = 'pending';
      showHashDisplay = true;

      // 🔥 Recargar transacciones desde DB inmediatamente
      await loadTransactions();

      showSuccess(`Transacción enviada: ${hash.substring(0, 10)}...`);
      resetForm();

      monitorTransaction(hash);
    } catch (error: any) {
      console.error('Transaction error:', error);

      const errorMessages: Record<string, string> = {
        INVALID_RECIPIENT_ADDRESS: 'Dirección de destinatario inválida',
        INVALID_AMOUNT: 'Debes ingresar un monto válido mayor a 0',
        INSUFFICIENT_FUNDS: `❌ No tienes suficientes fondos. Necesitas ${currentCurrency()} para pagar el gas + la transacción. Obtén tokens de prueba desde un faucet.`,
        TRANSACTION_REJECTED: 'Transacción rechazada por el usuario',
        GAS_ESTIMATION_FAILED: `No se pudo estimar el gas. Verifica que tengas fondos nativos (${currentCurrency()}) en tu wallet.`,
        TRANSACTION_FAILED: 'La transacción falló',
        SIGNER_NOT_INITIALIZED: 'Conecta tu wallet primero'
      };

      const message = errorMessages[error.message] || error.message;
      showError(message);
    } finally {
      isLoading = false;
    }
  }

  async function monitorTransaction(hash: string): Promise<void> {
    try {
      const receipt = await transactionService.waitForTransaction(hash, 1);

      if (receipt) {
        transactionStatus = receipt.status === 1 ? 'success' : 'failed';

        // 🔥 Recargar desde DB para obtener el estado actualizado
        await loadTransactions();

        if (transactionStatus === 'success') {
          showSuccess('✅ Transacción confirmada exitosamente');
        } else {
          showError('❌ Transacción falló');
        }
      }
    } catch (error) {
      console.error('Monitor error:', error);
    }
  }

  function getBlockExplorerUrl(hash: string): string | null {
    const network = walletService.currentNetwork;
    if (!network) return null;

    // Match by chainId from our config
    const chainIdStr = network.chainId.toString();
    const matchedNetwork = Object.values(ALL_NETWORKS).find(
      n => n.chainId.toString() === chainIdStr
    );

    if (matchedNetwork?.blockExplorerUrl) {
      return `${matchedNetwork.blockExplorerUrl}/tx/${hash}`;
    }

    // Fallback map for common chains
    const explorers: Record<string, string> = {
      '1': 'https://etherscan.io',
      '11155111': 'https://sepolia.etherscan.io',
      '17000': 'https://holesky.etherscan.io',
      '137': 'https://polygonscan.com',
      '80002': 'https://amoy.polygonscan.com',
      '8453': 'https://basescan.org',
      '84532': 'https://sepolia.basescan.org',
      '42161': 'https://arbiscan.io',
      '421614': 'https://sepolia.arbiscan.io'
    };

    const explorerUrl = explorers[chainIdStr];
    return explorerUrl ? `${explorerUrl}/tx/${hash}` : null;
  }

  function openBlockExplorer(hash: string): void {
    const url = getBlockExplorerUrl(hash);
    if (url) {
      window.open(url, '_blank');
    } else {
      showError('No se encontró un explorer para esta red');
    }
  }

  function truncateHash(hash: string): string {
    return hash.substring(0, 10) + '...' + hash.substring(hash.length - 6);
  }
</script>

<div class="w-full">
  <!-- Card Principal -->
  <div class="glass-card p-8">
    <!-- Header -->
    <div class="mb-8">
      <h2 class="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <span>⚡</span> Enviar Transacción
      </h2>
      <p class="text-sm text-slate-400">
        Transfiere tokens nativos de tu wallet a otra cuenta
      </p>
    </div>

    {#if !isConnected}
      <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
        <p class="text-amber-300 text-sm">
          ⚠️ Debes conectar tu wallet para enviar transacciones
        </p>
      </div>
    {:else}
      <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
        <p class="text-blue-300 text-sm font-semibold mb-2">
          💡 Necesitas fondos de prueba
        </p>
        <p class="text-blue-200 text-xs leading-relaxed">
          Para enviar transacciones en zkSYS Testnet, necesitas tokens TSYS de prueba. Obtén fondos gratis desde el faucet oficial de Syscoin.
        </p>
      </div>
    {/if}

    <!-- Form -->
    <form onsubmit={(e) => { e.preventDefault(); handleSendTransaction(); }} class="space-y-5">
      <!-- Recipient Address -->
      <div>
        <label for="recipient" class="block text-sm font-semibold text-slate-300 mb-2">
          📍 Dirección Destinataria
        </label>
        <div class="relative">
          <input
            id="recipient"
            bind:value={recipientAddress}
            type="text"
            placeholder="0x..."
            disabled={isLoading || !isConnected}
            class="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-40 font-mono text-sm"
          />
          {#if recipientAddress && transactionService.isValidAddress(recipientAddress)}
            <span class="absolute right-3 top-3 text-emerald-400 text-lg">✓</span>
          {/if}
        </div>
        {#if recipientAddress && !transactionService.isValidAddress(recipientAddress)}
          <p class="text-xs text-red-400 mt-1.5">⚠️ Dirección inválida</p>
        {/if}
      </div>

      <!-- Amount -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="amount" class="block text-sm font-semibold text-slate-300 mb-2">
            💰 Monto a Enviar
          </label>
          <div class="relative">
            <input
              id="amount"
              bind:value={amount}
              type="number"
              step="0.0001"
              min="0"
              placeholder="0.0"
              disabled={isLoading || !isConnected}
              class="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-40 text-sm"
            />
            <span class="absolute right-3 top-3 text-slate-500 font-semibold text-sm">
              ETH
            </span>
          </div>
        </div>

        <!-- Smart Contract checkbox -->
        <div class="flex items-end">
          <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 w-full">
            <input
              type="checkbox"
              bind:checked={useSmartContract}
              disabled={isLoading || !isConnected}
              class="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500/50 disabled:opacity-40 accent-blue-600"
            />
            <span class="text-sm text-slate-300">
              🤖 Smart Contract (opcional)
            </span>
          </label>
        </div>
      </div>

      <!-- Gas Estimation -->
      {#if canEstimateGas && !showHashDisplay}
        <button
          type="button"
          onclick={estimateTransaction}
          disabled={isLoading}
          class="w-full px-4 py-2.5 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/10 font-semibold transition text-sm disabled:opacity-40"
        >
          ⚡ Estimar Gas
        </button>

        {#if gasPrice && estimatedGas && totalFee}
          <div class="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-400">Precio Gas:</span>
              <span class="font-mono font-semibold text-white text-xs">
                {parseFloat(gasPrice).toFixed(9)} Gwei
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-400">Gas Estimado:</span>
              <span class="font-mono font-semibold text-white text-xs">
                {estimatedGas}
              </span>
            </div>
            <div class="flex justify-between text-sm pt-2 border-t border-blue-500/15">
              <span class="text-slate-300 font-semibold">Fee Total:</span>
              <span class="font-mono font-bold text-white text-xs">
                ~{parseFloat(totalFee).toFixed(6)} ETH
              </span>
            </div>
          </div>
        {/if}
      {/if}

      <!-- Submit Button -->
      <button
        type="submit"
        disabled={isLoading || !isFormValid}
        class="w-full px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-sm"
      >
        {#if isLoading}
          <LoadingSpinner size="small" color="white" />
          Procesando...
        {:else}
          ✉️ Enviar Transacción
        {/if}
      </button>
    </form>

    <!-- Hash Display -->
    {#if showHashDisplay && transactionHash}
      <div class="mt-8 p-5 rounded-xl border {transactionStatus === 'success' 
        ? 'bg-emerald-500/5 border-emerald-500/20' 
        : transactionStatus === 'failed' 
          ? 'bg-red-500/5 border-red-500/20' 
          : 'bg-amber-500/5 border-amber-500/20'}">
        
        <h3 class="font-bold mb-4 text-sm {transactionStatus === 'success' 
          ? 'text-emerald-400' 
          : transactionStatus === 'failed' 
            ? 'text-red-400' 
            : 'text-amber-400'}">
          {transactionStatus === 'pending'
            ? '⏳ Transacción Pendiente'
            : transactionStatus === 'success'
              ? '✅ Transacción Confirmada'
              : '❌ Transacción Fallida'}
        </h3>

        <div class="space-y-3">
          <div>
            <span class="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
              Transaction Hash
            </span>
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2.5 bg-slate-800/60 rounded-lg border border-slate-700/30 text-xs font-mono text-slate-200 break-all">
                {transactionHash}
              </code>
              <button
                type="button"
                onclick={() => {
                  copyToClipboard(transactionHash);
                  showSuccess('Hash copiado al portapapeles');
                }}
                class="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition text-sm shrink-0"
                title="Copiar hash"
              >
                📋
              </button>
            </div>
          </div>

          <button
            type="button"
            onclick={() => openBlockExplorer(transactionHash)}
            class="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition text-sm"
          >
            🔗 Ver en Block Explorer
          </button>
        </div>
      </div>
    {/if}

    <!-- Recent Transactions -->
    {#if recentTransactions.length > 0}
      <div class="mt-8 pt-6 border-t border-slate-700/30">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-white text-sm">📋 Historial de Transacciones</h3>
          
          <div class="flex gap-2">
            <!-- 🔥 NUEVO: Botón para actualizar estados -->
            <button
              type="button"
              onclick={async () => await updatePendingTransactions()}
              class="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              title="Actualizar estados de transacciones pendientes"
            >
              🔄 Actualizar
            </button>
            
            <!-- 🔥 Toggle para filtrar por red -->
            <button
              type="button"
              onclick={async () => { showAllNetworks = !showAllNetworks; await loadTransactions(); }}
              class="text-xs px-3 py-1.5 rounded-lg {showAllNetworks ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'} hover:opacity-80 transition-opacity"
            >
              {showAllNetworks ? '🌐 Todas las redes' : '🔗 Red actual'}
            </button>
          </div>
        </div>
        
        <div class="space-y-2 max-h-48 overflow-y-auto">
          {#each recentTransactions as tx (tx.hash)}
            <div class="p-3 bg-slate-800/30 rounded-xl border border-slate-700/20 text-sm">
              <div class="flex justify-between items-center mb-1">
                <button 
                  type="button"
                  onclick={() => openBlockExplorer(tx.hash)}
                  class="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  title="Ver en Block Explorer"
                >
                  {truncateHash(tx.hash)}
                </button>
                <span class="text-xs font-semibold {tx.status === 'success'
                  ? 'text-emerald-400'
                  : tx.status === 'failed'
                    ? 'text-red-400'
                    : 'text-amber-400'}">
                  {tx.status === 'success'
                    ? '✅ Confirmada'
                    : tx.status === 'failed'
                      ? '❌ Fallida'
                      : '⏳ Pendiente'}
                </span>
              </div>
              <div class="text-xs text-slate-500 mb-1">
                {tx.value} {currentCurrency()} → {tx.to.substring(0, 8)}...{tx.to.substring(tx.to.length - 4)}
              </div>
              <!-- 🔥 NUEVO: Mostrar red si está en modo "todas las redes" -->
              {#if showAllNetworks && tx.networkName}
                <div class="text-xs text-slate-600 flex items-center gap-1">
                  <span>🌐</span>
                  <span>{tx.networkName}</span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
