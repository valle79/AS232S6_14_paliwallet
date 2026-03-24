/**
 * Utilidades para manejo de errores de wallet
 */

/**
 * Mapea códigos de error a mensajes amigables para el usuario
 * @param {Error|string} error Error o código de error
 * @returns {Object} Objeto con mensaje amigable y tipo de error
 */
export function mapWalletError(error) {
  const errorCode = typeof error === 'string' ? error : error.message || error.code;
  
  const errorMappings = {
    // Errores de instalación
    'WALLET_NOT_INSTALLED': {
      message: 'Pali Wallet no está instalada. Por favor, instálala desde la Chrome Web Store.',
      type: 'warning',
      action: 'install'
    },
    
    // Errores de conexión
    'CONNECTION_REJECTED': {
      message: 'Conexión rechazada por el usuario. Por favor, acepta la conexión en Pali Wallet.',
      type: 'warning',
      action: 'retry'
    },
    
    'CONNECTION_PENDING': {
      message: 'Ya hay una solicitud de conexión pendiente. Revisa tu wallet.',
      type: 'info',
      action: 'wait'
    },
    
    'CONNECTION_ERROR': {
      message: 'Error al conectar con la wallet. Verifica que Pali Wallet esté funcionando correctamente.',
      type: 'error',
      action: 'retry'
    },
    
    // Errores de estado
    'WALLET_NOT_CONNECTED': {
      message: 'Wallet no conectada. Por favor, conecta tu wallet primero.',
      type: 'warning',
      action: 'connect'
    },
    
    // Errores de datos
    'BALANCE_FETCH_ERROR': {
      message: 'Error al obtener el saldo. Verifica tu conexión a internet y la red blockchain.',
      type: 'error',
      action: 'retry'
    },
    
    'ADDRESS_FETCH_ERROR': {
      message: 'Error al obtener la dirección de la wallet. Intenta reconectar.',
      type: 'error',
      action: 'reconnect'
    },
    
    // Errores de red
    'NETWORK_ERROR': {
      message: 'Error de red. Verifica tu conexión a internet.',
      type: 'error',
      action: 'retry'
    },
    
    'PROVIDER_INITIALIZATION_ERROR': {
      message: 'Error al inicializar la conexión. Recarga la página e intenta de nuevo.',
      type: 'error',
      action: 'reload'
    },
    
    // Errores específicos de Ethereum
    'INSUFFICIENT_FUNDS': {
      message: 'Fondos insuficientes para realizar la transacción.',
      type: 'warning',
      action: 'none'
    },
    
    'TRANSACTION_REJECTED': {
      message: 'Transacción rechazada por el usuario.',
      type: 'info',
      action: 'none'
    },
    
    'NETWORK_CHANGED': {
      message: 'La red ha cambiado. La aplicación se actualizará automáticamente.',
      type: 'info',
      action: 'none'
    }
  };
  
  // Buscar mapeo específico
  if (errorMappings[errorCode]) {
    return errorMappings[errorCode];
  }
  
  // Mapeos por patrones comunes
  if (errorCode && typeof errorCode === 'string') {
    if (errorCode.includes('User rejected') || errorCode.includes('user rejected')) {
      return errorMappings['CONNECTION_REJECTED'];
    }
    
    if (errorCode.includes('network') || errorCode.includes('Network')) {
      return errorMappings['NETWORK_ERROR'];
    }
    
    if (errorCode.includes('insufficient') || errorCode.includes('Insufficient')) {
      return errorMappings['INSUFFICIENT_FUNDS'];
    }
  }
  
  // Error genérico
  return {
    message: 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.',
    type: 'error',
    action: 'retry'
  };
}

/**
 * Determina si un error es recuperable automáticamente
 * @param {string} errorCode Código del error
 * @returns {boolean} true si es recuperable
 */
export function isRecoverableError(errorCode) {
  const recoverableErrors = [
    'NETWORK_ERROR',
    'BALANCE_FETCH_ERROR',
    'CONNECTION_ERROR',
    'PROVIDER_INITIALIZATION_ERROR'
  ];
  
  return recoverableErrors.includes(errorCode);
}

/**
 * Determina si un error requiere acción del usuario
 * @param {string} errorCode Código del error
 * @returns {boolean} true si requiere acción del usuario
 */
export function requiresUserAction(errorCode) {
  const userActionErrors = [
    'WALLET_NOT_INSTALLED',
    'CONNECTION_REJECTED',
    'WALLET_NOT_CONNECTED',
    'INSUFFICIENT_FUNDS'
  ];
  
  return userActionErrors.includes(errorCode);
}

/**
 * Obtiene sugerencias de acción para un error
 * @param {string} errorCode Código del error
 * @returns {Array<string>} Lista de sugerencias
 */
export function getErrorSuggestions(errorCode) {
  const suggestions = {
    'WALLET_NOT_INSTALLED': [
      'Instala Pali Wallet desde la Chrome Web Store',
      'Recarga la página después de la instalación'
    ],
    
    'CONNECTION_REJECTED': [
      'Haz clic en "Conectar" nuevamente',
      'Acepta la conexión en el popup de Pali Wallet'
    ],
    
    'CONNECTION_ERROR': [
      'Verifica que Pali Wallet esté desbloqueada',
      'Intenta cerrar y abrir Pali Wallet',
      'Recarga la página'
    ],
    
    'BALANCE_FETCH_ERROR': [
      'Verifica tu conexión a internet',
      'Intenta cambiar de red en Pali Wallet',
      'Espera unos momentos y vuelve a intentar'
    ],
    
    'NETWORK_ERROR': [
      'Verifica tu conexión a internet',
      'Intenta cambiar de red WiFi',
      'Espera unos momentos y vuelve a intentar'
    ]
  };
  
  return suggestions[errorCode] || [
    'Recarga la página',
    'Verifica tu conexión a internet',
    'Intenta de nuevo en unos momentos'
  ];
}

/**
 * Clase para manejar reintentos automáticos
 */
export class RetryHandler {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }
  
  /**
   * Ejecuta una función con reintentos automáticos
   * @param {Function} fn Función a ejecutar
   * @param {string} errorContext Contexto del error para logging
   * @returns {Promise} Resultado de la función
   */
  async executeWithRetry(fn, errorContext = 'operation') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        console.warn(`${errorContext} failed (attempt ${attempt}/${this.maxRetries}):`, error);
        
        // Si es el último intento, lanzar el error
        if (attempt === this.maxRetries) {
          break;
        }
        
        // Si no es un error recuperable, no reintentar
        const errorCode = error.message || error.code;
        if (!isRecoverableError(errorCode)) {
          break;
        }
        
        // Esperar antes del siguiente intento (exponential backoff)
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}