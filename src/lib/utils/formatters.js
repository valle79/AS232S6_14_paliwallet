/**
 * Utilidades para formatear datos de wallet
 */

/**
 * Formatea un address de Ethereum para mostrar de forma compacta
 * @param {string} address Address completo
 * @param {number} startChars Número de caracteres al inicio (default: 6)
 * @param {number} endChars Número de caracteres al final (default: 4)
 * @returns {string} Address formateado (ej: 0x1234...5678)
 */
export function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address || typeof address !== 'string') {
    return '';
  }

  if (address.length <= startChars + endChars) {
    return address;
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Formatea un balance para mostrar con decimales apropiados
 * @param {string|number} balance Balance en formato string o number
 * @param {number} decimals Número de decimales a mostrar (default: 4)
 * @param {boolean} removeTrailingZeros Si remover ceros al final (default: true)
 * @returns {string} Balance formateado
 */
export function formatBalance(balance, decimals = 4, removeTrailingZeros = true) {
  if (!balance || isNaN(balance)) {
    return '0';
  }

  const num = parseFloat(balance);
  let formatted = num.toFixed(decimals);

  if (removeTrailingZeros) {
    formatted = parseFloat(formatted).toString();
  }

  return formatted;
}

/**
 * Formatea un balance con su símbolo de moneda
 * @param {string|number} balance Balance a formatear
 * @param {string} currency Símbolo de moneda (ej: 'ETH', 'SYS')
 * @param {number} decimals Número de decimales (default: 4)
 * @returns {string} Balance formateado con moneda (ej: "1.2345 ETH")
 */
export function formatBalanceWithCurrency(balance, currency = 'ETH', decimals = 4) {
  const formattedBalance = formatBalance(balance, decimals);
  return `${formattedBalance} ${currency}`;
}

/**
 * Valida si un string es un address de Ethereum válido
 * @param {string} address Address a validar
 * @returns {boolean} true si es válido
 */
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Verificar formato básico (0x seguido de 40 caracteres hexadecimales)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

/**
 * Copia texto al portapapeles
 * @param {string} text Texto a copiar
 * @returns {Promise<boolean>} true si se copió exitosamente
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Usar la API moderna de clipboard
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para navegadores más antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Formatea un número grande con separadores de miles
 * @param {string|number} number Número a formatear
 * @returns {string} Número formateado con comas
 */
export function formatNumberWithCommas(number) {
  if (!number || isNaN(number)) {
    return '0';
  }

  return parseFloat(number).toLocaleString();
}

/**
 * Convierte wei a ETH y formatea
 * @param {string|BigInt} weiValue Valor en wei
 * @param {number} decimals Decimales a mostrar
 * @returns {string} Valor formateado en ETH
 */
export function formatWeiToEth(weiValue, decimals = 4) {
  try {
    // Si ya tenemos ethers importado en el proyecto, podemos usarlo
    // Si no, implementamos conversión básica
    if (typeof weiValue === 'string' || typeof weiValue === 'bigint') {
      const ethValue = Number(weiValue) / Math.pow(10, 18);
      return formatBalance(ethValue, decimals);
    }
    return '0';
  } catch (error) {
    console.error('Error formatting wei to eth:', error);
    return '0';
  }
}

/**
 * Formatea un balance grande con notación científica si es necesario
 * @param {string|number} balance Balance a formatear
 * @param {number} decimals Decimales a mostrar
 * @returns {string} Balance formateado
 */
export function formatLargeBalance(balance, decimals = 4) {
  if (!balance || isNaN(balance)) {
    return '0';
  }

  const num = parseFloat(balance);
  
  // Si el número es muy grande, usar notación científica
  if (num >= 1e9) {
    return num.toExponential(decimals);
  }
  
  // Si es muy grande pero no tanto, usar K, M, B
  if (num >= 1e6) {
    return (num / 1e6).toFixed(decimals) + 'M';
  }
  
  if (num >= 1e3) {
    return (num / 1e3).toFixed(decimals) + 'K';
  }
  
  return formatBalance(num, decimals);
}

/**
 * Valida si un balance es válido
 * @param {string|number} balance Balance a validar
 * @returns {boolean} true si es válido
 */
export function isValidBalance(balance) {
  if (!balance && balance !== 0) {
    return false;
  }
  
  const num = parseFloat(balance);
  return !isNaN(num) && num >= 0;
}

/**
 * Obtiene el símbolo de moneda apropiado para una red
 * @param {string} networkName Nombre de la red
 * @param {string} chainId ID de la cadena
 * @returns {string} Símbolo de moneda
 */
export function getCurrencySymbolByNetwork(networkName, chainId) {
  const networkCurrencies = {
    // Ethereum networks
    'mainnet': 'ETH',
    'goerli': 'ETH',
    'sepolia': 'ETH',
    
    // Polygon networks
    'matic': 'MATIC',
    'polygon': 'MATIC',
    'mumbai': 'MATIC',
    
    // Syscoin networks
    'syscoin': 'SYS',
    'syscoin-testnet': 'SYS'
  };
  
  // Buscar por nombre de red primero
  const normalizedName = networkName?.toLowerCase();
  if (normalizedName && networkCurrencies[normalizedName]) {
    return networkCurrencies[normalizedName];
  }
  
  // Buscar por chainId como fallback
  const chainCurrencies = {
    '1': 'ETH',      // Ethereum Mainnet
    '5': 'ETH',      // Goerli
    '11155111': 'ETH', // Sepolia
    '137': 'MATIC',  // Polygon
    '80001': 'MATIC', // Mumbai
    '57': 'SYS',     // Syscoin Mainnet
    '5700': 'SYS'    // Syscoin Testnet
  };
  
  return chainCurrencies[chainId] || 'ETH';
}