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
  let ethValue = $state(''); // 🔥 Valor en ETH para depositar
  let isLoading = $state(false);
  let transactionHash = $state('');
  let showHashDisplay = $state(false);
  let parsedABI = $state<any[]>([]);
  let availableFunctions = $state<any[]>([]);
  let contractBalance = $state<string | null>(null); // 🔥 Balance del contrato
  let isLoadingBalance = $state(false);

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

    // 🔥 VALIDACIÓN CRÍTICA: Verificar fondos del contrato para sendTo
    if (func.name === 'sendTo' && contractBalance !== null) {
      const amountIndex = func.inputs.findIndex((inp: any) => inp.name === '_amount');
      if (amountIndex >= 0 && functionParams[amountIndex]) {
        const requestedAmount = parseFloat(functionParams[amountIndex]);
        const availableBalance = parseFloat(contractBalance);
        
        if (availableBalance < requestedAmount) {
          showError(`❌ El contrato solo tiene ${contractBalance} ${currentCurrency()}, necesitas ${functionParams[amountIndex]} ${currentCurrency()}. Deposita más fondos primero.`);
          return;
        }
        
        console.log('✅ Verificación de balance:', {
          disponible: availableBalance,
          requerido: requestedAmount,
          suficiente: availableBalance >= requestedAmount
        });
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
        const inputName = func.inputs[index].name;
        
        console.log(`📝 Procesando parámetro ${index}:`, {
          name: inputName,
          type: inputType,
          value: param
        });
        
        // Convertir según el tipo
        if (inputType.startsWith('uint') || inputType.startsWith('int')) {
          if (param.includes('.')) {
            const amount = ethers.parseUnits(param, 18);
            console.log(`💰 Convirtiendo ${inputName}: ${param} → ${amount.toString()} Wei`);
            return amount;
          }
          return BigInt(param);
        } else if (inputType === 'bool') {
          return param.toLowerCase() === 'true';
        } else if (inputType.startsWith('bytes')) {
          return param;
        } else if (inputType === 'address') {
          if (!ethers.isAddress(param)) {
            throw new Error(`Parámetro ${index + 1} no es una dirección válida`);
          }
          console.log(`📍 Dirección validada: ${param}`);
          return param;
        }
        
        return param;
      });

      console.log('🚀 Llamando función del contrato:', {
        function: selectedFunction,
        contract: contractAddress,
        params: processedParams.map((p, i) => ({
          name: func.inputs[i].name,
          value: typeof p === 'bigint' ? p.toString() : p
        }))
      });

      // 🔥 NUEVO: Estimar gas primero para detectar reverts ANTES de enviar
      try {
        showInfo('🧪 Simulando transacción...');
        const estimatedGas = await contract[selectedFunction].estimateGas(...processedParams);
        console.log('✅ Gas estimado:', estimatedGas.toString());
        
        // 🔥 LLAMAR LA FUNCIÓN CON GAS LÍMITE
        const tx = await contract[selectedFunction](...processedParams, {
          gasLimit: estimatedGas * BigInt(120) / BigInt(100) // +20% margen
        });
        
        transactionHash = tx.hash;
        showHashDisplay = true;

        showSuccess(`✅ Transacción enviada: ${tx.hash.substring(0, 10)}...`);
        showInfo('⏳ Esperando confirmación en blockchain...');

        // Esperar confirmación y verificar status
        const receipt = await tx.wait();
        
        if (receipt && receipt.status === 1) {
          showSuccess('✅ Transacción confirmada exitosamente');
          console.log('📊 Receipt:', receipt);
          
          // Si es sendTo, actualizar balance del contrato
          if (func.name === 'sendTo') {
            setTimeout(() => getContractBalance(), 2000);
          }
        } else if (receipt && receipt.status === 0) {
          showError('❌ La transacción fue confirmada pero FALLÓ en la EVM (revert)');
          console.error('❌ Transaction reverted:', receipt);
        }
        
      } catch (estimateError: any) {
        // 🔥 Error en estimateGas = la transacción REVERTIRÁ
        console.error('❌ estimateGas falló (la tx revertirá):', estimateError);
        
        if (estimateError.message?.includes('insufficient funds')) {
          throw new Error('INSUFFICIENT_CONTRACT_FUNDS');
        }
        
        throw estimateError;
      }

    } catch (error: any) {
      console.error('Contract execution error:', error);

      const errorMessages: Record<string, string> = {
        SIGNER_NOT_INITIALIZED: 'Conecta tu wallet primero',
        INSUFFICIENT_FUNDS: `❌ No tienes suficientes fondos para pagar el gas. Obtén ${currentCurrency()} de prueba desde un faucet.`,
        INSUFFICIENT_CONTRACT_FUNDS: `❌ El contrato no tiene fondos suficientes. Deposita primero usando el botón "💰 Depositar".`,
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
   * 🔥 NUEVO: Depositar fondos al contrato
   */
  async function depositToContract(): Promise<void> {
    if (!ethers.isAddress(contractAddress)) {
      showError('Ingresa una dirección de contrato válida');
      return;
    }

    if (!ethValue || parseFloat(ethValue) <= 0) {
      showError('Ingresa una cantidad válida de ETH');
      return;
    }

    isLoading = true;

    try {
      showInfo('Depositando fondos al contrato...');

      const signer = walletService.getSigner();
      if (!signer) {
        throw new Error('SIGNER_NOT_INITIALIZED');
      }

      // Enviar ETH directamente al contrato (activará la función receive())
      const tx = await signer.sendTransaction({
        to: contractAddress,
        value: ethers.parseEther(ethValue)
      });

      transactionHash = tx.hash;
      showHashDisplay = true;

      showSuccess(`✅ Depósito enviado: ${tx.hash.substring(0, 10)}...`);
      showInfo('⏳ Esperando confirmación...');

      // Esperar confirmación
      await monitorTransaction(tx.hash);

      // Actualizar balance del contrato
      await getContractBalance();

    } catch (error: any) {
      console.error('Deposit error:', error);

      const errorMessages: Record<string, string> = {
        SIGNER_NOT_INITIALIZED: 'Conecta tu wallet primero',
        INSUFFICIENT_FUNDS: `❌ No tienes suficientes fondos`,
        ACTION_REJECTED: 'Transacción rechazada por el usuario'
      };

      const message = errorMessages[error.code] || errorMessages[error.message] || error.message || 'Error al depositar';
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
    ethValue = '';
    parsedABI = [];
    availableFunctions = [];
    showHashDisplay = false;
    transactionHash = '';
  }

  /**
   * 🔥 NUEVO: Cargar contrato de ejemplo (TransferContract)
   */
  function loadExampleContract(): void {
    contractAddress = '0x998C166a8d7A9c808b0bFbB517B1359661E2038A';
    contractABI = '[{"inputs":[{"internalType":"address payable","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"sendTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Sent","type":"event"},{"stateMutability":"payable","type":"receive"},{"inputs":[],"name":"getBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]';
    
    parseABI();
    showSuccess('✅ Contrato actualizado: 0x998C...038A');
  }

  /**
   * 🔥 NUEVO: Consultar balance del contrato
   */
  async function getContractBalance(): Promise<void> {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      showError('Ingresa una dirección de contrato válida');
      return;
    }

    isLoadingBalance = true;
    contractBalance = null;

    try {
      const provider = walletService.getProvider();
      if (!provider) {
        throw new Error('PROVIDER_NOT_INITIALIZED');
      }

      // Primero intentar obtener el balance nativo del contrato (más confiable)
      const balance = await provider.getBalance(contractAddress);
      contractBalance = ethers.formatEther(balance);
      
      console.log('💰 Balance del contrato:', contractBalance, currentCurrency());
      showSuccess(`Balance: ${contractBalance} ${currentCurrency()}`);

    } catch (error: any) {
      console.error('Error al consultar balance:', error);
      showError('No se pudo consultar el balance del contrato');
      contractBalance = '0';
    } finally {
      isLoadingBalance = false;
    }
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
      <!-- 🔥 NUEVO: Botón de ejemplo rápido -->
      <div class="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <p class="text-purple-300 text-sm font-semibold mb-2">
              🚀 Prueba rápida con TransferContract
            </p>
            <p class="text-purple-200 text-xs leading-relaxed">
              Carga automáticamente tu contrato desplegado en Remix para enviar ETH desde el contrato a cualquier cuenta.
            </p>
          </div>
          <button
            type="button"
            onclick={loadExampleContract}
            disabled={isLoading}
            class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            ⚡ Cargar Ejemplo
          </button>
        </div>
      </div>

      <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
        <p class="text-blue-300 text-sm font-semibold mb-2">
          💡 Cómo funciona TransferContract
        </p>
        <ul class="text-blue-200 text-xs leading-relaxed space-y-1">
          <li>1. Click en "⚡ Cargar Ejemplo"</li>
          <li>2. <strong>Deposita fondos al contrato</strong> (ej: 0.1 {currentCurrency()})</li>
          <li>3. Selecciona la función "sendTo"</li>
          <li>4. Ingresa <strong>_to</strong>: dirección del destinatario</li>
          <li>5. Ingresa <strong>_amount</strong>: monto a enviar (ej: 0.01)</li>
          <li>6. El contrato enviará ese monto al destinatario</li>
          <li>7. Puedes enviar múltiples transacciones del mismo contrato</li>
        </ul>
        <div class="mt-3 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg space-y-2">
          <p class="text-emerald-300 text-[11px] font-semibold">
            ✅ Para que funcione correctamente:
          </p>
          <ul class="text-emerald-200 text-[10px] space-y-1">
            <li>• <strong>Paso 1 (Depósito):</strong> Tu cuenta → Contrato (0.1 TSYS)</li>
            <li>• <strong>Paso 2 (sendTo):</strong> Contrato → Destinatario (0.01 TSYS)</li>
            <li>• <strong>Paso 3 (sendTo):</strong> Contrato → Otro destinatario (0.02 TSYS)</li>
            <li>• Puedes hacer múltiples envíos hasta agotar el balance</li>
          </ul>
        </div>
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
        <div class="flex gap-2 mt-2">
          <button
            type="button"
            onclick={parseABI}
            disabled={!contractABI || isLoading || !isConnected}
            class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🔍 Parsear ABI
          </button>
          <button
            type="button"
            onclick={getContractBalance}
            disabled={!contractAddress || !ethers.isAddress(contractAddress) || isLoadingBalance || !isConnected}
            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoadingBalance ? '⏳' : '💰'} Ver Balance
          </button>
        </div>
        
        <!-- 🔥 Mostrar balance del contrato -->
        {#if contractBalance !== null}
          <div class="mt-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-emerald-400 font-semibold mb-1">💰 Balance del Contrato</p>
                <p class="text-2xl font-bold text-emerald-300">{contractBalance} {currentCurrency()}</p>
              </div>
              {#if parseFloat(contractBalance) === 0}
                <span class="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                  Sin fondos
                </span>
              {:else}
                <span class="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                  ✓ Con fondos
                </span>
              {/if}
            </div>
            {#if parseFloat(contractBalance) === 0}
              <p class="text-xs text-amber-300/70 mt-2">
                ⚠️ El contrato no tiene fondos. Deposita ETH usando el botón de abajo.
              </p>
            {/if}
          </div>
        {/if}
      </div>

      <!-- 🔥 NUEVO: Sección de depósito -->
      <div class="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-5">
        <h3 class="text-sm font-bold text-yellow-300 mb-3 flex items-center gap-2">
          <span>💰</span> Depositar Fondos al Contrato
        </h3>
        <p class="text-xs text-yellow-200/70 mb-4">
          Para que el contrato pueda enviar ETH, primero debes depositar fondos en él.
        </p>
        
        <div class="space-y-3">
          <div>
            <label for="eth-value" class="block text-xs text-yellow-300 font-semibold mb-2">
              Cantidad a depositar ({currentCurrency()})
            </label>
            <input
              id="eth-value"
              bind:value={ethValue}
              type="text"
              placeholder="0.01"
              disabled={isLoading || !isConnected}
              class="w-full px-4 py-2.5 border border-yellow-700/50 rounded-lg bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 disabled:opacity-40 text-sm"
            />
            <p class="text-[10px] text-yellow-200/50 mt-1.5">
              Ejemplo: 0.01 para enviar 0.01 {currentCurrency()}
            </p>
          </div>

          <button
            type="button"
            onclick={depositToContract}
            disabled={isLoading || !isConnected || !contractAddress || !ethers.isAddress(contractAddress) || !ethValue}
            class="w-full px-4 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-yellow-600/20 flex items-center justify-center gap-2 text-sm"
          >
            {#if isLoading}
              <LoadingSpinner size="small" color="white" />
              Depositando...
            {:else}
              💰 Depositar al Contrato
            {/if}
          </button>
        </div>
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
                  {#if func?.name === 'sendTo' && input?.name === '_amount'}
                    <span class="text-emerald-400 font-semibold">← Ingresa en {currentCurrency()} (ej: 0.01)</span>
                  {/if}
                </label>
                <input
                  id="param-{index}"
                  bind:value={functionParams[index]}
                  type="text"
                  placeholder={func?.name === 'sendTo' && input?.name === '_amount' ? '0.01' : `Ingresa ${input?.type}`}
                  disabled={isLoading}
                  class="w-full px-4 py-2.5 border border-slate-700/50 rounded-lg bg-slate-800/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-40 text-sm"
                />
                {#if func?.name === 'sendTo' && input?.name === '_amount'}
                  <p class="text-[10px] text-slate-500 mt-1">
                    💡 El contrato debe tener al menos este monto en su balance
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- 🔥 Información sobre la función sendTo -->
        {#if selectedFunction}
          {@const func = availableFunctions.find(f => f.name === selectedFunction)}
          {#if func?.name === 'sendTo'}
            <div class="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <p class="text-sm font-semibold text-purple-300 mb-2">
                🎯 Vista previa de la transacción:
              </p>
              <ul class="space-y-2 text-xs text-purple-200">
                <li class="flex items-start gap-2">
                  <span class="shrink-0">📤</span>
                  <span><strong>From:</strong> {contractAddress} (Contrato)</span>
                </li>
                {#if functionParams.length > 0 && functionParams[0]}
                  <li class="flex items-start gap-2">
                    <span class="shrink-0">📥</span>
                    <span><strong>To:</strong> {functionParams[0]}</span>
                  </li>
                {/if}
                {#if functionParams.length > 1 && functionParams[1]}
                  <li class="flex items-start gap-2">
                    <span class="shrink-0">💰</span>
                    <span><strong>Amount:</strong> {functionParams[1]} {currentCurrency()}</span>
                  </li>
                {/if}
              </ul>
              {#if contractBalance !== null}
                <div class="mt-3 p-2 bg-slate-800/60 rounded-lg">
                  <p class="text-[10px] text-slate-400">
                    Balance del contrato: <span class="text-emerald-400 font-bold">{contractBalance} {currentCurrency()}</span>
                  </p>
                  {#if functionParams.length > 1 && functionParams[1] && parseFloat(contractBalance) < parseFloat(functionParams[1])}
                    <p class="text-[10px] text-red-400 mt-1">
                      ⚠️ El contrato no tiene fondos suficientes
                    </p>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
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
