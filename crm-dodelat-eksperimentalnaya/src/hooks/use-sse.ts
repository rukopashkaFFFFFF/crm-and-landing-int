/**
 * use-sse.ts
 *
 * Хук для подключения к Server-Sent Events (SSE) потоку.
 * Используется для получения real-time уведомлений от сервера.
 *
 * Автоматически подключается при монтировании компонента
 * и переподключается через 5 секунд при обрыве соединения.
 * Передаёт полученные JSON-сообщения в колбэк onMessage.
 *
 * @param url - URL SSE-эндпоинта (стрим)
 * @param onMessage - Колбэк, вызываемый при каждом сообщении.
 *                    Принимает объект SSEMessage: { type, count, notifications }
 *
 * @remarks Хранит актуальный колбэк в ref, поэтому onMessage
 *          может меняться между рендерами без переподключения.
 */

"use client"

import { useEffect, useRef, useCallback } from "react"

type SSEMessage = {
  type: string
  count: number
  notifications: any[]
}

type SSECallback = (data: SSEMessage) => void

export function useSSE(url: string, onMessage: SSECallback) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (eventSourceRef.current) return
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEMessage
        onMessageRef.current(data)
      } catch {}
    }

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      setTimeout(connect, 5000)
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [connect])
}
