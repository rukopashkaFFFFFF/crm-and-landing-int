/**
 * @file API-маршрут для загрузки файлов (UploadThing).
 *
 * @description Экспортирует обработчики GET и POST для маршрутов UploadThing.
 * Использует конфигурацию роутера из `@/lib/uploadthing`.
 * Позволяет клиентам загружать файлы (аватар, вложения к задачам и т.д.).
 *
 * @route /api/uploadthing
 * @exports GET — обработчик GET (проверка).
 * @exports POST — обработчик POST (загрузка файла).
 */

import { createRouteHandler } from "uploadthing/next"

import { uploadRouter } from "@/lib/uploadthing"

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
})
