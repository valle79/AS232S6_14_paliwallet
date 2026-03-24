# Pali Wallet Demo

Demo de integración con Pali Wallet usando Svelte, Vite, Ethers.js y Tailwind CSS.

## ✅ Estado del Proyecto

El proyecto ha sido implementado exitosamente con las siguientes características:

### Funcionalidades Implementadas

- ✅ **Detección automática de Pali Wallet**
- ✅ **Conexión/desconexión de wallet**
- ✅ **Display de dirección de wallet con formateo**
- ✅ **Display de saldo en tiempo real**
- ✅ **Manejo robusto de errores**
- ✅ **Diseño responsivo y profesional**
- ✅ **Sistema de notificaciones**
- ✅ **Auto-reconexión**
- ✅ **Event listeners para cambios de cuenta/red**

### Componentes Creados

**Servicios:**
- `WalletService` - Servicio principal para integración con Pali Wallet
- Sistema de notificaciones global
- Utilidades de formateo y manejo de errores

**Componentes UI:**
- `WalletConnection` - Conexión/desconexión de wallet
- `WalletInfo` - Información de address con copy-to-clipboard
- `BalanceDisplay` - Display de saldo con refresh
- `LoadingSpinner` - Indicador de carga reutilizable
- `ErrorMessage` - Mensajes de error amigables
- `Toast` - Notificaciones temporales

## Tecnologías

- **Svelte 5** - Framework frontend
- **SvelteKit** - Framework de aplicación
- **Vite** - Build tool y dev server
- **TypeScript** - Tipado estático
- **Ethers.js v6** - Librería para interacción con blockchain
- **Tailwind CSS v4** - Framework de CSS
- **PostCSS** - Procesador de CSS

## Estructura del Proyecto

```
src/
├── lib/
│   ├── components/     # Componentes Svelte reutilizables
│   │   ├── WalletConnection.svelte
│   │   ├── WalletInfo.svelte
│   │   ├── BalanceDisplay.svelte
│   │   ├── LoadingSpinner.svelte
│   │   ├── ErrorMessage.svelte
│   │   └── Toast.svelte
│   ├── services/       # Servicios (WalletService, etc.)
│   │   └── walletService.ts
│   └── utils/          # Funciones utilitarias
│       ├── formatters.js
│       ├── errorHandler.js
│       └── notifications.js
├── routes/
│   ├── +layout.svelte  # Layout principal
│   └── +page.svelte    # Página principal con integración
├── app.css            # Estilos globales con Tailwind
└── app.html           # Template HTML base
```

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run check` - Ejecuta verificaciones de TypeScript y Svelte

## Desarrollo

Para iniciar el desarrollo:

```bash
cd pali-wallet-demo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Características Técnicas

### Manejo de Errores
- Mapeo de códigos de error a mensajes amigables
- Reintentos automáticos para errores de red
- Feedback visual para el usuario

### Diseño Responsivo
- Mobile-first design
- Breakpoints optimizados para móvil, tablet y desktop
- Botones touch-friendly
- Animaciones suaves

### Accesibilidad
- Roles ARIA apropiados
- Focus management
- Screen reader support
- Keyboard navigation

### Seguridad
- Validación de inputs
- Manejo seguro de errores
- Timeouts para conexiones
- Sanitización de datos

## Próximos Pasos

El proyecto está listo para:
1. Pruebas con Pali Wallet real
2. Implementación de funcionalidades adicionales
3. Despliegue a producción
4. Integración con contratos inteligentes

## Notas de Desarrollo

- El proyecto usa Svelte 5 con runes mode
- Algunos warnings de TypeScript son esperados debido a la naturaleza experimental de Svelte 5
- La aplicación funciona correctamente a pesar de los warnings de compilación
- Se recomienda usar la versión estable de Svelte 4 para producción