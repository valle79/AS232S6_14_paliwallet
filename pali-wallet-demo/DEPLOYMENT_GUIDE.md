# 🚀 Guía de Deployment a Vercel

## ✅ Archivos Preparados

Tu proyecto ya tiene todos los archivos necesarios:

- ✅ `vercel.json` - Configuración de Vercel
- ✅ `.vercelignore` - Archivos que Vercel debe ignorar
- ✅ `svelte.config.js` - Configurado con adapter-vercel
- ✅ `.gitignore` - Actualizado para Vercel
- ✅ `.env.example` - Ejemplo de variables de entorno
- ✅ Build probado localmente - Todo funciona ✅

---

## 📋 PASO A PASO: Deploy a Vercel

### OPCIÓN 1: Deploy desde GitHub (Recomendado) 🌟

#### Paso 1: Subir código a GitHub

```bash
# Inicializar git (si no lo has hecho)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Ready for Vercel deployment"

# Crear repositorio en GitHub y conectarlo
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git

# Subir código
git push -u origin main
```

#### Paso 2: Conectar con Vercel

1. **Ve a [vercel.com](https://vercel.com)**
2. Click en **"Sign Up"** o **"Login"**
3. Selecciona **"Continue with GitHub"**
4. Autoriza a Vercel para acceder a tus repositorios

#### Paso 3: Importar Proyecto

1. Click en **"Add New..."** → **"Project"**
2. Busca tu repositorio: `pali-wallet-demo`
3. Click en **"Import"**

#### Paso 4: Configurar Proyecto

Vercel detectará automáticamente que es SvelteKit. Verifica:

- **Framework Preset:** SvelteKit ✅
- **Build Command:** `npm run build` ✅
- **Output Directory:** `.svelte-kit` ✅
- **Install Command:** `npm install` ✅

#### Paso 5: Agregar Variables de Entorno 🔑

**MUY IMPORTANTE:** Click en **"Environment Variables"** y agrega:

| Name | Value |
|------|-------|
| `VITE_DATABASE_URL` | `postgresql://neondb_owner:npg_bsxA49qzvnPj@ep-muddy-math-aq9mmvnh-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `VITE_USE_DATABASE` | `true` |

**Nota:** Asegúrate de seleccionar **"Production"**, **"Preview"**, y **"Development"** para cada variable.

#### Paso 6: Deploy 🚀

1. Click en **"Deploy"**
2. Espera 2-3 minutos mientras Vercel:
   - Instala dependencias
   - Ejecuta el build
   - Despliega tu aplicación
3. ¡Listo! Tu app estará en: `https://tu-proyecto.vercel.app`

---

### OPCIÓN 2: Deploy desde CLI (Más Rápido) ⚡

#### Paso 1: Instalar Vercel CLI

```bash
npm i -g vercel
```

#### Paso 2: Login

```bash
vercel login
```

Sigue las instrucciones en el navegador.

#### Paso 3: Deploy

```bash
# Desde la raíz del proyecto
vercel
```

Responde las preguntas:
- **Set up and deploy?** → Yes
- **Which scope?** → Tu cuenta
- **Link to existing project?** → No
- **Project name?** → pali-wallet-demo (o el que prefieras)
- **Directory?** → ./ (presiona Enter)
- **Override settings?** → No

#### Paso 4: Agregar Variables de Entorno

```bash
# Agregar DATABASE_URL
vercel env add VITE_DATABASE_URL

# Cuando pregunte el valor, pega:
postgresql://neondb_owner:npg_bsxA49qzvnPj@ep-muddy-math-aq9mmvnh-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require

# Selecciona: Production, Preview, Development (todas)

# Agregar USE_DATABASE
vercel env add VITE_USE_DATABASE

# Valor: true
# Selecciona: Production, Preview, Development (todas)
```

#### Paso 5: Deploy a Producción

```bash
vercel --prod
```

¡Listo! Tu app estará en: `https://tu-proyecto.vercel.app`

---

## 🔍 Verificar Deployment

### 1. Abrir tu aplicación

```
https://tu-proyecto.vercel.app
```

### 2. Verificar que funciona:

- ✅ La página carga correctamente
- ✅ Puedes conectar PaliWallet
- ✅ Las transacciones se guardan en Neon DB
- ✅ El historial de transacciones funciona
- ✅ Smart Contracts funcionan
- ✅ Gestión de redes funciona

### 3. Ver logs (si hay problemas)

En el dashboard de Vercel:
1. Ve a tu proyecto
2. Click en la pestaña **"Deployments"**
3. Click en el deployment más reciente
4. Ve a **"Functions"** → **"Logs"**

---

## 🔄 Actualizaciones Futuras

### Deploy Automático

Cada vez que hagas `git push` a GitHub, Vercel automáticamente:
1. Detecta el cambio
2. Ejecuta el build
3. Despliega la nueva versión
4. Te notifica por email

### Deploy Manual

```bash
# Hacer cambios en el código
git add .
git commit -m "Descripción de cambios"
git push

# Vercel deployará automáticamente
```

O con CLI:

```bash
vercel --prod
```

---

## 🌐 Dominio Personalizado (Opcional)

### Agregar tu propio dominio:

1. Ve al dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a **"Settings"** → **"Domains"**
4. Click en **"Add"**
5. Ingresa tu dominio: `tudominio.com`
6. Sigue las instrucciones para configurar DNS

Vercel te dará:
- SSL automático (HTTPS) ✅
- CDN global ✅
- Certificado renovado automáticamente ✅

---

## 🐛 Troubleshooting

### Problema: Build falla

**Solución:**
```bash
# Probar build localmente
npm run build

# Si falla, revisar errores y corregir
# Luego hacer commit y push
```

### Problema: Variables de entorno no funcionan

**Solución:**
1. Ve a Vercel Dashboard
2. Settings → Environment Variables
3. Verifica que las variables estén configuradas
4. Asegúrate de que tengan el prefijo `VITE_`
5. Redeploy: Deployments → ... → Redeploy

### Problema: Base de datos no conecta

**Solución:**
1. Verifica que `VITE_DATABASE_URL` esté correcta
2. Verifica que `VITE_USE_DATABASE=true`
3. Verifica que Neon DB esté activo
4. Revisa los logs en Vercel

### Problema: PaliWallet no conecta

**Solución:**
- Esto es normal, PaliWallet solo funciona en el navegador del usuario
- Verifica que la extensión esté instalada
- Verifica que estés en una red EVM (no UTXO)

---

## 📊 Monitoreo

### Ver Analytics

1. Ve a tu proyecto en Vercel
2. Click en **"Analytics"**
3. Verás:
   - Visitas
   - Performance
   - Errores
   - Países de origen

### Ver Logs en Tiempo Real

```bash
vercel logs
```

---

## 💰 Límites del Plan Gratis

- ✅ **Bandwidth:** 100GB/mes (suficiente para miles de usuarios)
- ✅ **Builds:** Ilimitados
- ✅ **Deployments:** Ilimitados
- ✅ **Dominios:** Ilimitados
- ✅ **SSL:** Gratis
- ✅ **Preview Deployments:** Ilimitados

**Si superas los límites:**
- Vercel te notificará
- Puedes upgradear a Pro ($20/mes)
- O optimizar tu app

---

## 🎉 ¡Listo!

Tu Pali Wallet DApp está ahora en producción en Vercel.

**URL de tu app:** `https://tu-proyecto.vercel.app`

**Próximos pasos:**
1. Comparte el link con tu equipo
2. Prueba todas las funcionalidades
3. Configura un dominio personalizado (opcional)
4. Monitorea el uso y performance

---

## 📞 Soporte

- **Documentación Vercel:** https://vercel.com/docs
- **Documentación SvelteKit:** https://kit.svelte.dev/docs
- **Neon DB Docs:** https://neon.tech/docs

---

**¡Felicidades por tu deployment! 🎊**
