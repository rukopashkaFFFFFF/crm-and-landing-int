/**
 * uploadthing.ts
 *
 * Конфигурация загрузки файлов через UploadThing.
 * Определяет роутер для загрузки изображений (до 4 МБ)
 * с коллбэком onUploadComplete, возвращающим URL загруженного файла.
 */

import { createUploadthing } from "uploadthing/next"

const f = createUploadthing()

export const uploadRouter = {
  /**
   * Загрузчик изображений: принимает изображения до 4 МБ.
   * После завершения загрузки возвращает публичный URL файла.
   *
   * @param file - Объект загруженного файла с полем url
   * @returns Объект { url: string }
   */
  imageUploader: f({ image: { maxFileSize: "4MB" } }).onUploadComplete(
    async ({ file }) => {
      return { url: file.url }
    }
  ),
}

export type OurUploadRouter = typeof uploadRouter
