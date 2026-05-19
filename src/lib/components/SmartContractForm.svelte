<script lang="ts">
  /**
   * @component SmartContractForm.svelte
   * @description Componente para interactuar con Smart Contracts
   * Permite llamar funciones de contratos y capturar el hash de transacción
   */

  import { ethers } from 'ethers';
  import { walletService } from '../services/walletService';
  import { showError, showSuccess, showInfo } from '../utils/notifications';
  import { copyToClipboard } from '../utils/formatters';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import { ALL_NETWORKS } from '../config/networkConfig';

  /* ================================
     PROPS
  =================================*/
  let { isConnected = false } = $props();

  /* ================================
     STATE (Svelte 5 runes)
  =================================*/
  let contractAddress = $state('');
  let contractABI = $state('');
  let selectedFunction = $state('');
  let functionParams = $state<string[]>([]);
  let isLoading = $state(false);
  let transactionHash = $state('');
  let showHashDisplay = $state(false);
  let parsedABI = $state<any[]>([]);
  let availableFunctions = $state<any[]>([]);

  /* ================================
     DERIVED VALUES
  =================================*/
  const isFormValid = $derived(
    contractAddress.trim().length > 0 &&
    contractABI.trim().length > 0 &&
    isConnected
  );

  const currentCurrency = $derived(() => {
    const network = walletService.currentNetwork;
    if (!network) return 'ETH';
    return walletService.getCurrencySymbol(network.chainId);
  });

  /* ================================
     FUNCTIONS
  =================================*/

  /**
   * Parsear ABI y extraer funciones disponibles
   */
  function parseABI(): void {
    try {
      const abi = JSON.parse(contractABI);
      parsedABI = abi;
      
      // Filtrar solo funciones (no eventos ni constructores)
      availableFunctions = abi.filter((item: any) => 
        item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure'
      );
      
      if (availableFunctions.length === 0) {
        showError('No se encontraron funciones ejecutables en el ABI');
        return;
      }
      
      showSuccess(`✅ ABI parseado: ${availableFunctions.length} funciones disponibles`);
      
      // Seleccionar la primera función por defecto
      if (availableFunctions.length > 0) {
        selectedFunction = availableFunctions[0].name;
        updateFunctionParams();
      }
    } catch (error) {
      showError('ABI inválido. Debe ser un JSON válido');
      parsedABI = [];
      availableFunctions = [];
    }
  }

  /**
   * Actualizar parámetros cuando cambia la función seleccionada
   */
  function updateFunctionParams(): void {
    const func = availableFunctions.find(f => f.name === selectedFunction);
    if (func && func.inputs) {
      functionParams = new Array(func.inputs.length).fill('');
    } else {
      functionParams = [];
    }
  }

  /**
   * Ejecutar función del contrato
   */
  async function executeContractFunction(): Promise<void> {
    if (!isFormValid) {
      showError('Por favor completa todos los campos');
      return;
    }

    if (!ethers.isAddress(contractAddress)) {
      showError('Dirección de contrato inválida');
      return;
    }

    const func = availableFunctions.find(f => f.name === selectedFunction);
    if (!func) {
      showError('Función no encontrada');
      return;
    }

    // Validar que todos los parámetros estén completos
    if (func.inputs && func.inputs.length > 0) {
      const emptyParams = functionParams.some(p => p.trim() === '');
      if (emptyParams) {
        showError('Por favor completa todos los parámetros de la función');
        return;
      }
    }

    isLoading = true;
    showHashDisplay = false;

    try {
      showInfo('Ejecutando función del contrato...');

      const signer = walletService.getSigner();
      if (!signer) {
        throw new Error('SIGNER_NOT_INITIALIZED');
      }

      // Crear instancia del contrato
      const contract = new ethers.Contract(contractAddress, parsedABI, signer);

      // Preparar parámetros (convertir tipos si es necesario)
      const processedParams = functionParams.map((param, index) => {
        const inputType = func.inputs[index].type;
        
        // Convertir según el tipo
        if (inputType.startsWith('uint') || inputType.startsWith('int')) {
          return BigInt(param);
        } else if (inputType === 'bool') {
          return param.toLowerCase() === 'true';
        } else if (inputType.startsWith('bytes')) {
          return param;
        } else if (inputType === 'address') {
          if (!ethers.isAddress(param)) {
            throw new Error(`Parámetro ${index + 1} no es una dirección válida`);
          }
          return param;
        }
        
        return param;
      });

      // Ejecutar función
      const tx = await contract[selectedFunction](...processedParams);
      
      transactionHash = tx.hash;
      showHashDisplay = true;

      showSuccess(`Transacción enviada: ${tx.hash.substring(0, 10)}...`);

      // Esperar confirmación
      monitorTransaction(tx.hash);
    } catch (error: any) {
      console.error('Contract execution error:', error);

      const errorMessages: Record<string, string> = {
        SIGNER_NOT_INITIALIZED: 'Conecta tu wallet primero',
        INSUFFICIENT_FUNDS: `❌ No tienes suficientes fondos para pagar el gas. Obtén ${currentCurrency()} de prueba desde un faucet.`,
        ACTION_REJECTED: 'Transacción rechazada por el usuario',
        CALL_EXCEPTION: 'Error al ejecutar la función del contrato. Verifica los parámetros.'
      };

      const message = errorMessages[error.code] || errorMessages[error.message] || error.message || 'Error al ejecutar función';
      showError(message);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Monitorear transacción
   */
  async function monitorTransaction(hash: string): Promise<void> {
    try {
      const provider = walletService.getProvider();
      if (!provider) return;

      showInfo('⏳ Esperando confirmación...');
      
      const receipt = await provider.waitForTransaction(hash, 1);

      if (receipt) {
        if (receipt.status === 1) {
          showSuccess('✅ Transacción confirmada exitosamente');
        } else {
          showError('❌ Transacción falló');
        }
      }
    } catch (error) {
      console.error('Monitor error:', error);
    }
  }

  /**
   * Obtener URL del block explorer
   */
  function getBlockExplorerUrl(hash: string): string | null {
    const network = walletService.currentNetwork;
    if (!network) return null;

    const chainIdStr = network.chainId.toString();
    const matchedNetwork = Object.values(ALL_NETWORKS).find(
      n => n.chainId.toString() === chainIdStr
    );

    if (matchedNetwork?.blockExplorerUrl) {
      return `${matchedNetwork.blockExplorerUrl}/tx/${hash}`;
    }

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

  /**
   * Abrir block explorer
   */
  function openBlockExplorer(hash: string): void {
    const url = getBlockExplorerUrl(hash);
    if (url) {
      window.open(url, '_blank');
    } else {
      showError('No se encontró un explorer para esta red');
    }
  }

  /**
   * Resetear formulario
   */
  function resetForm(): void {
    contractAddress = '';
    contractABI = '';
    selectedFunction = '';
    functionParams = [];
    parsedABI = [];
    availableFunctions = [];
    showHashDisplay = false;
    transactionHash = '';
  }
</script>

<div class="w-full">
  <!-- Card Principal -->
  <div class="glass-card p-8">
    <!-- Header -->
    <div class="mb-8">
      <h2 class="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <span>🤖</span> Interacción con Smart Contract
      </h2>
      <p class="text-sm text-slate-400">
        Ejecuta funciones de contratos inteligentes en la blockchain
      </p>
    </div>

    {#if !isConnected}
      <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
        <p class="text-amber-300 text-sm">
          ⚠️ Debes conectar tu wallet para interactuar con contratos
        </p>
      </div>
    {:else}
      <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
        <p class="text-blue-300 text-sm font-semibold mb-2">
          💡 Cómo usar
        </p>
        <ul class="text-blue-200 text-xs leading-relaxed space-y-1">
          <li>1. Ingresa la dirección del contrato</li>
          <li>2. Pega el ABI del contrato (formato JSON)</li>
          <li>3. Selecciona la función que deseas ejecutar</li>
          <li>4. Completa los parámetros requeridos</li>
          <li>5. Ejecuta y captura el hash de la transacción</li>
        </ul>
      </div>
    {/if}

    <!-- Form -->
    <form onsubmit={(e) => { e.preventDefault(); executeContractFunction(); }} class="space-y-5">
      <!-- Contract Address -->
      <div>
        <label for="contract-address" class="block text-sm font-semibold text-slate-300 mb-2">
          📍 Dirección del Contrato
        </label>
        <div class="relative">
          <input
            id="contract-address"
            bind:value={contractAddress}
            type="text"
            placeholder="0x..."
            disabled={isLoading || !isConnected}
            class="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-40 font-mono text-sm"
          />
          {#if contractAddress && ethers.isAddress(contractAddress)}
            <span class="absolute right-3 top-3 text-emerald-400 text-lg">✓</span>
          {/if}
        </div>
        {#if contractAddress && !ethers.isAddress(contractAddress)}
          <p class="text-xs text-red-400 mt-1.5">⚠️ Dirección inválida</p>
        {/if}
      </div>

      <!-- Contract ABI -->
      <div>
        <label for="contract-abi" class="block text-sm font-semibold text-slate-300 mb-2">
          📄 ABI del Contrato (JSON)
        </label>
        <textarea
          id="contract-abi"
          bind:value={contractABI}
          placeholder="Pega aquí el ABI del contrato en formato JSON"
          disabled={isLoading || !isConnected}
          rows="6"
          class="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-40 font-mono text-xs resize-none"
        ></textarea>
        <button
          type="button"
          onclick={parseABI}
          disabled={!contractABI || isLoading || !isConnected}
          class="mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🔍 Parsear ABI
        </button>
      </div>

      {#if availableFunctions.length > 0}
        <!-- Function Selector -->
        <div>
          <label for="function-select" class="block text-sm font-semibold text-slate-300 mb-2">
            ⚙️ Función a Ejecutar
          </label>
          <select
            id="function-select"
            bind:value={selectedFunction}
            onchange={updateFunctionParams}
            disabled={isLoading}
            class="w-full px-4 py-3 border border-slate-700/50 rounded-xl bg-slate-800/40 text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-40 text-sm"
          >
            {#each availableFunctions as func}
              <option value={func.name}>
                {func.name}({func.inputs?.map((i: any) => i.type).join(', ') || ''})
              </option>
            {/each}
          </select>
        </div>

        <!-- Function Parameters -->
        {#if functionParams.length > 0}
          <div class="space-y-3">
            <p class="text-sm font-semibold text-slate-300">📝 Parámetros de la Función</p>
            {#each functionParams as param, index}
              {@const func = availableFunctions.find(f => f.name === selectedFunction)}
              {@const input = func?.inputs[index]}
              <div>
                <label for="param-{index}" class="block text-xs text-slate-400 mb-1.5">
                  {input?.name || `Parámetro ${index + 1}`} ({input?.type})
                </label>
                <input
                  id="param-{index}"
                  bind:value={functionParams[index]}
                  type="text"
                  placeholder={`Ingresa ${input?.type}`}
                  disabled={isLoading}
                  class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-40 text-sm"
                />
              </div>
            {/each}
          </div>
        {/if}

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isLoading || !isFormValid || availableFunctions.length === 0}
          class="w-full px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm"
        >
          {#if isLoading}
            <LoadingSpinner size="small" color="white" />
            Ejecutando...
          {:else}
            🚀 Ejecutar Función
          {/if}
        </button>
      {/if}
    </form>

    <!-- Hash Display -->
    {#if showHashDisplay && transactionHash}
      <div class="mt-8 p-5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
        <h3 class="font-bold mb-4 text-sm text-emerald-400">
          ✅ Transacción Enviada
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

    <!-- Reset Button -->
    {#if parsedABI.length > 0}
      <button
        type="button"
        onclick={resetForm}
        class="mt-4 w-full px-4 py-2.5 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-xl font-semibold transition text-sm"
      >
        🔄 Resetear Formulario
      </button>
    {/if}
  </div>
</div>
