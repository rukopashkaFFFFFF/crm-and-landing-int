"use client"

/**
 * ImportCsvButton — кнопка импорта клиентов из CSV-файла через диалог.
 *
 * Страница: /dashboard/clients.
 * Позволяет загрузить CSV, просмотреть предпросмотр строк и импортировать
 * их в систему.
 *
 * @param {Object} props — нет props (самодостаточный компонент)
 *
 * Server action: importClients({ rows: PreviewRow[] }) — массовое создание.
 *
 * Состояния:
 * - preview: массив распарсенных строк CSV (пустой = режим выбора файла)
 * - importing: флаг загрузки
 * - Выбор файла через скрытый input[type=file]
 */

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, X } from "lucide-react"
import Papa from "papaparse"

import { importClients } from "@/lib/actions/clients"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { t } from "@/lib/translations"

type PreviewRow = {
  name: string
  email: string
  phone: string
  company: string
  status: string
}

/**
 * ImportCsvButton — кнопка с диалогом импорта CSV.
 *
 * Шаги:
 * 1. Нажатие на кнопку открывает Dialog.
 * 2. Пользователь кликает на dashed-область -> скрытый input.
 * 3. Файл парсится через PapaParse (header: true).
 * 4. Предпросмотр отображается в таблице (до 100+ строк).
 * 5. Кнопка "Import N clients" запускает importClients.
 * 6. При успехе: тост, закрытие диалога, сброс preview, router.refresh().
 *
 * Побочные эффекты:
 * - toast.success/error
 * - router.refresh() после импорта
 *
 * @returns JSX — Dialog с выбором файла и предпросмотром
 */
export function ImportCsvButton() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows: PreviewRow[] = results.data.map((r: any) => ({
          name: r.name || r.Name || r.NAME || "",
          email: r.email || r.Email || r.EMAIL || "",
          phone: r.phone || r.Phone || r.PHONE || "",
          company: r.company || r.Company || r.COMPANY || "",
          status: r.status || r.Status || r.STATUS || "LEAD",
        })).filter((r) => r.name)
        setPreview(rows)
      },
    })
  }

  async function handleImport() {
    setImporting(true)
    const result = await importClients({ rows: preview })
    setImporting(false)
    if (result.error) {
      toast.error(t("Import failed"))
      return
    }
    toast.success(t("Imported {n} clients", { n: result.data?.length ?? 0 }))
    setOpen(false)
    setPreview([])
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background px-4 h-9 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
        <Upload className="mr-2 h-4 w-4" /> {t("Import CSV")}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Import Clients from CSV")}</DialogTitle>
          <DialogDescription>
            {t("Upload a CSV file with columns: name, email, phone, company, status")}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFile}
        />

        {preview.length === 0 ? (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">{t("Click to select a CSV file")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t(".csv files only")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("{n} rows detected", { n: preview.length })}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreview([])}
              >
                <X className="h-4 w-4 mr-1" /> {t("Clear")}
              </Button>
            </div>
            <div className="border rounded-md max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Name")}</TableHead>
                    <TableHead>{t("Email")}</TableHead>
                    <TableHead>{t("Company")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.email || "—"}</TableCell>
                      <TableCell>{row.company || "—"}</TableCell>
                      <TableCell>{row.status || "LEAD"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {preview.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setPreview([])}>
                {t("Cancel")}
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? t("Importing...") : t("Import {n} clients", { n: preview.length })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
