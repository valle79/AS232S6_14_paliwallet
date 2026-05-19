/**
 * Sistema de notificaciones global usando Svelte stores
 */

import { writable } from 'svelte/store';

// Store para las notificaciones activas
export const notifications = writable([]);

let notificationId = 0;

/**
 * Muestra una notificación
 * @param {string} message Mensaje a mostrar
 * @param {string} type Tipo de notificación ('success', 'error', 'warning', 'info')
 * @param {number} duration Duración en ms (0 = no auto-cerrar)
 * @returns {number} ID de la notificación
 */
export function showNotification(message, type = 'info', duration = 3000) {
  const id = ++notificationId;
  
  const notification = {
    id,
    message,
    type,
    duration,
    timestamp: Date.now()
  };

  // Agregar la notificación al store
  notifications.update(items => [...items, notification]);

  // Auto-remover después de la duración especificada
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }

  return id;
}

/**
 * Remueve una notificación específica
 * @param {number} id ID de la notificación a remover
 */
export function removeNotification(id) {
  notifications.update(items => items.filter(item => item.id !== id));
}

/**
 * Limpia todas las notificaciones
 */
export function clearAllNotifications() {
  notifications.set([]);
}

/**
 * Funciones de conveniencia para diferentes tipos de notificaciones
 */

export function showSuccess(message, duration = 3000) {
  return showNotification(message, 'success', duration);
}

export function showError(message, duration = 5000) {
  return showNotification(message, 'error', duration);
}

export function showWarning(message, duration = 4000) {
  return showNotification(message, 'warning', duration);
}

export function showInfo(message, duration = 3000) {
  return showNotification(message, 'info', duration);
}