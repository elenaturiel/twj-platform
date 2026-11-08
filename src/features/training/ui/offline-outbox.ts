"use client";

import { createStore, del, entries, get, set } from "idb-keyval";
import type { WorkoutLogInput } from "../schemas";

/**
 * Almacenamiento local del móvil (IndexedDB):
 * - borradores de la sesión en curso (para no perder nada si se cierra la app);
 * - cola de entrenos terminados sin conexión, que se envían al volver la red.
 * No se guarda nada en el service worker.
 */
const store = typeof indexedDB !== "undefined" ? createStore("twj", "workouts") : undefined;

const draftKey = (sessionId: string) => `draft:${sessionId}`;
const outboxKey = (logId: string) => `outbox:${logId}`;

export async function loadDraft<T>(sessionId: string): Promise<T | undefined> {
  if (!store) return undefined;
  try {
    return await get<T>(draftKey(sessionId), store);
  } catch {
    return undefined;
  }
}

export async function saveDraft<T>(sessionId: string, draft: T) {
  if (!store) return;
  try {
    await set(draftKey(sessionId), draft, store);
  } catch {
    // Sin almacenamiento (modo privado): seguimos sin autoguardado
  }
}

export async function clearDraft(sessionId: string) {
  if (!store) return;
  try {
    await del(draftKey(sessionId), store);
  } catch {}
}

export async function queueLog(log: WorkoutLogInput) {
  if (!store) return;
  await set(outboxKey(log.id), log, store);
}

export async function pendingLogs(): Promise<WorkoutLogInput[]> {
  if (!store) return [];
  try {
    return (await entries<string, WorkoutLogInput>(store))
      .filter(([k]) => String(k).startsWith("outbox:"))
      .map(([, v]) => v);
  } catch {
    return [];
  }
}

export async function removeQueued(logId: string) {
  if (!store) return;
  await del(outboxKey(logId), store);
}
