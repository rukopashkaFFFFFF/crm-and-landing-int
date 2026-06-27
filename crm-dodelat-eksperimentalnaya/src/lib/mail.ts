/**
 * mail.ts
 *
 * Сервис отправки email-уведомлений через Resend.
 * Содержит набор функций для отправки типовых писем CRM:
 * приглашения, счета, назначения задач, упоминания,
 * изменения статуса проекта, доступ к порталу клиента
 * и подтверждения оплаты.
 *
 * Каждое письмо оборачивается в единый HTML-шаблон (layout)
 * с логотипом агентства и футером.
 */

import { Resend } from "resend"
import { t } from "@/lib/translations"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = "CRM <noreply@yourdomain.com>"
const AGENCY_NAME = t("Agency Name")

/**
 * Оборачивает HTML-контент в общий шаблон письма с шапкой и футером.
 *
 * @param content - Внутренний HTML-код письма
 * @returns Полный HTML-документ письма
 */
function layout(content: string) {
  return `<!DOCTYPE html>
<html><body style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #fff;">
<div style="border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px;">
<h1 style="font-size: 22px; margin: 0;">${AGENCY_NAME}</h1>
<p style="color: #666; margin: 4px 0 0;">${t("Web Development Agency")}</p>
</div>
${content}
<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
<p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} ${AGENCY_NAME}. ${t("All rights reserved.")}</p>
</body></html>`
}

/**
 * Отправляет приглашение новому участнику команды.
 *
 * @param email - Email приглашаемого
 * @param inviteLink - Ссылка для принятия приглашения
 * @param invitedByName - Имя отправителя приглашения
 */
export async function sendInviteEmail(email: string, inviteLink: string, invitedByName: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: t("You've been invited to join {agency} CRM", { agency: AGENCY_NAME }),
      html: layout(`
        <h2 style="font-size: 20px;">${t("You're Invited!")}</h2>
        <p style="color: #555;">${t("{name} has invited you to join the agency CRM.", { name: invitedByName })}</p>
        <p style="color: #555;">${t("Click the link below to create your account:")}</p>
        <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">${t("Accept Invitation")}</a>
        <p style="color: #999; font-size: 14px;">${t("This link expires in 7 days.")}</p>
      `),
    })
  } catch (error) { console.error("Failed to send invite email:", error) }
}

/**
 * Отправляет счёт клиенту на email.
 * Включает таблицу с позициями, количество, цены и итоговую сумму.
 *
 * @param email - Email клиента
 * @param invoice - Объект счёта (с полями number, lineItems, total, dueDate, client.name, client.email)
 */
export async function sendInvoiceEmail(email: string, invoice: any) {
  try {
    const itemsHtml = (invoice.lineItems || []).map((item: any) => `
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.quantity * item.unitPrice).toFixed(2)}</td></tr>
    `).join("")

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: t("Invoice {number} from {agency}", { number: invoice.number, agency: AGENCY_NAME }),
      html: layout(`
        <h2 style="font-size: 20px;">${t("Invoice {number}", { number: invoice.number })}</h2>
        <p style="color: #555;">${t("Dear {name},", { name: invoice.client?.name || t("Client") })}</p>
        <p style="color: #555;">${t("Please find your invoice below. Payment is due by {date}.", { date: `<strong>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : t("N/A")}</strong>` })}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <thead><tr style="background: #f5f5f5;">
            <th style="padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666;">${t("Description")}</th>
            <th style="padding: 10px; text-align: center; font-size: 12px; text-transform: uppercase; color: #666;">${t("Qty")}</th>
            <th style="padding: 10px; text-align: right; font-size: 12px; text-transform: uppercase; color: #666;">${t("Unit Price")}</th>
            <th style="padding: 10px; text-align: right; font-size: 12px; text-transform: uppercase; color: #666;">${t("Total")}</th>
          </tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="border-top: 2px solid #000; padding-top: 16px; text-align: right; font-size: 18px;"><strong>${t("Total: {amount}", { amount: `$${Number(invoice.total).toFixed(2)}` })}</strong></div>
        <h3 style="font-size: 14px; color: #333; margin-top: 24px;">${t("Payment Instructions")}</h3>
        <p style="color: #555; font-size: 13px;">${t("Bank Transfer — Account: XXXX-XXXX-XXXX-XXXX")}<br/>${t("Routing: XXXXXXXX")}</p>
      `),
    })
  } catch (error) { console.error("Failed to send invoice email:", error) }
}

/**
 * Отправляет уведомление о назначении новой задачи.
 *
 * @param email - Email исполнителя
 * @param userName - Имя исполнителя
 * @param taskTitle - Название задачи
 * @param projectName - Название проекта
 * @param link - Ссылка на задачу
 */
export async function sendTaskAssignedEmail(email: string, userName: string, taskTitle: string, projectName: string, link: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: email,
      subject: t("New task assigned: {title}", { title: taskTitle }),
      html: layout(`<h2>${t("Task Assigned")}</h2><p style="color:#555;">${t("Hi {name},", { name: userName })}</p><p style="color:#555;">${t("You've been assigned a new task in <strong>{project}</strong>:", { project: projectName })}</p><p style="background:#f5f5f5;padding:12px;border-radius:6px;margin:16px 0;"><strong>${taskTitle}</strong></p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">${t("View Task")}</a>`),
    })
  } catch (error) { console.error("Failed to send task assigned email:", error) }
}

/**
 * Отправляет уведомление об упоминании пользователя в комментарии.
 *
 * @param email - Email упомянутого пользователя
 * @param mentionedByName - Имя автора комментария
 * @param commentContent - Текст комментария (первые 200 символов)
 * @param link - Ссылка на комментарий
 */
export async function sendMentionEmail(email: string, mentionedByName: string, commentContent: string, link: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: email,
      subject: t("{name} mentioned you in a comment", { name: mentionedByName }),
      html: layout(`<h2>${t("You were mentioned")}</h2><p style="color:#555;">${t("{name} mentioned you in a comment:", { name: mentionedByName })}</p><p style="background:#f5f5f5;padding:12px;border-radius:6px;margin:16px 0;">${commentContent.slice(0, 200)}</p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">${t("View Comment")}</a>`),
    })
  } catch (error) { console.error("Failed to send mention email:", error) }
}

/**
 * Отправляет уведомление об изменении статуса проекта.
 *
 * @param email - Email получателя (обычно Project Manager)
 * @param userName - Имя получателя
 * @param projectName - Название проекта
 * @param newStatus - Новый статус (например, "IN_PROGRESS")
 * @param link - Ссылка на проект
 */
export async function sendProjectStatusEmail(email: string, userName: string, projectName: string, newStatus: string, link: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: email,
      subject: t("Project \"{name}\" status changed to {status}", { name: projectName, status: newStatus.replace("_", " ") }),
      html: layout(`<h2>${t("Project Update")}</h2><p style="color:#555;">${t("Hi {name},", { name: userName })}</p><p style="color:#555;">${t("The project <strong>{name}</strong> has been updated to <strong>{status}</strong>.", { name: projectName, status: newStatus.replace("_", " ") })}</p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">${t("View Project")}</a>`),
    })
  } catch (error) { console.error("Failed to send status email:", error) }
}

/**
 * Отправляет клиенту ссылку для доступа к порталу проекта.
 *
 * @param email - Email клиента
 * @param clientName - Имя клиента
 * @param portalUrl - URL портала
 * @param projectName - Название проекта
 */
export async function sendPortalLinkEmail(email: string, clientName: string, portalUrl: string, projectName: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: email,
      subject: t("Access your project portal: {name}", { name: projectName }),
      html: layout(`<h2>${t("Client Portal Access")}</h2><p style="color:#555;">${t("Dear {name},", { name: clientName })}</p><p style="color:#555;">${t("You now have access to the client portal for <strong>{name}</strong>.", { name: projectName })}</p><p style="color:#555;">${t("Click the link below to view your project status, tasks, invoices, and more:")}</p><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">${t("Access Portal")}</a><p style="color:#999;font-size:13px;">${t("This link expires in 90 days.")}</p>`),
    })
  } catch (error) { console.error("Failed to send portal link email:", error) }
}

/**
 * Отправляет подтверждение о получении платежа.
 *
 * @param email - Email клиента
 * @param invoiceNumber - Номер счёта
 * @param amount - Сумма платежа
 */
export async function sendPaymentReceivedEmail(email: string, invoiceNumber: string, amount: number) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: email,
      subject: t("Payment received for {number}", { number: invoiceNumber }),
      html: layout(`<h2>${t("Payment Received")}</h2><p style="color:#555;">${t("We've received a payment of <strong>{amount}</strong> for invoice <strong>{number}</strong>.", { amount: `$${amount.toFixed(2)}`, number: invoiceNumber })}</p><p style="color:#555;">${t("Thank you for your payment!")}</p>`),
    })
  } catch (error) { console.error("Failed to send payment email:", error) }
}
