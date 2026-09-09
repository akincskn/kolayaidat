import nodemailer from "nodemailer";
import { MONTHS_TR } from "@/lib/constants";

/**
 * SMTP ayarları eksikse nodemailer sessizce "auth yok" sayıp bağlantıyı
 * reddediyor ve hata mesajı anlaşılmaz oluyor. Bu yüzden gönderim öncesi
 * açıkça kontrol edip okunabilir bir hata fırlatıyoruz.
 */
export class EmailNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(
      `E-posta gönderilemedi: SMTP ayarları eksik (${missing.join(", ")}). ` +
        `Ortam değişkenlerini (.env / Vercel Environment Variables) tanımlayın.`
    );
    this.name = "EmailNotConfiguredError";
  }
}

/**
 * Ortam değişkenlerini temizler. Panoya kopyalanan değerlerin sonuna
 * kaçış dizisi olarak `\n` yapışabiliyor; bu durumda SMTP_PORT sayıya
 * çevrilemiyor ve kullanıcı adı/şifre doğrulaması sessizce başarısız oluyor.
 */
function env(key: string): string | undefined {
  const raw = process.env[key];
  if (raw === undefined) return undefined;
  const cleaned = raw.replace(/\\[rn]/g, "").trim();
  return cleaned || undefined;
}

export function getSmtpConfigError(): EmailNotConfiguredError | null {
  const missing = ["SMTP_USER", "SMTP_PASS"].filter((key) => !env(key));
  return missing.length ? new EmailNotConfiguredError(missing) : null;
}

// Transporter lazy oluşturuluyor: modül import edildiğinde env henüz
// yüklenmemiş olabilir ve eksik ayarla oluşan transporter cache'lenir.
let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const configError = getSmtpConfigError();
  if (configError) throw configError;

  if (!cachedTransporter) {
    const port = Number(env("SMTP_PORT") ?? 587) || 587;
    cachedTransporter = nodemailer.createTransport({
      host: env("SMTP_HOST") ?? "smtp.gmail.com",
      port,
      secure: port === 465, // 465 -> implicit TLS, 587 -> STARTTLS
      auth: {
        user: env("SMTP_USER"),
        pass: env("SMTP_PASS"),
      },
    });
  }
  return cachedTransporter;
}

function sendMail(options: nodemailer.SendMailOptions) {
  return getTransporter().sendMail({
    from: `KolayAidat <${env("SMTP_FROM") ?? env("SMTP_USER")}>`,
    ...options,
  });
}

export async function sendInviteEmail({
  to,
  inviteUrl,
  apartmentName,
  unitNumber,
  invitedBy,
}: {
  to: string;
  inviteUrl: string;
  apartmentName: string;
  unitNumber: string;
  invitedBy: string;
}) {
  await sendMail({
    to,
    subject: `${apartmentName} - Apartman Sistemi Davetiyesi`,
    html: `
      <!DOCTYPE html>
      <html lang="tr">
      <head><meta charset="UTF-8" /></head>
      <body style="font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: #1e293b; padding: 32px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 24px;">KolayAidat</h1>
                    <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">Apartman Aidat Yönetimi</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px;">Apartman sistemine davet edildiniz</h2>
                    <p style="color: #475569; line-height: 1.6; margin: 0 0 12px;">
                      <strong>${invitedBy}</strong> tarafından <strong>${apartmentName}</strong> apartmanının
                      <strong>Daire ${unitNumber}</strong> için sisteme davet edildiniz.
                    </p>
                    <p style="color: #475569; line-height: 1.6; margin: 0 0 32px;">
                      Aşağıdaki butona tıklayarak şifrenizi belirleyin ve hesabınızı oluşturun.
                      Bu bağlantı <strong>48 saat</strong> geçerlidir.
                    </p>
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="${inviteUrl}"
                        style="background: #1e293b; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                        Hesabımı Oluştur
                      </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      Butona tıklayamıyorsanız bu bağlantıyı tarayıcınıza yapıştırın:<br/>
                      <a href="${inviteUrl}" style="color: #3b82f6; word-break: break-all;">${inviteUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      Bu e-postayı beklemediyseniz görmezden gelebilirsiniz.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  await sendMail({
    to,
    subject: "KolayAidat - Şifre Sıfırlama",
    html: `
      <!DOCTYPE html>
      <html lang="tr">
      <head><meta charset="UTF-8" /></head>
      <body style="font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: #1e293b; padding: 32px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 24px;">KolayAidat</h1>
                    <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">Apartman Aidat Yönetimi</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px;">Şifrenizi Sıfırlayın</h2>
                    <p style="color: #475569; line-height: 1.6; margin: 0 0 12px;">
                      Hesabınız için şifre sıfırlama talebinde bulundunuz.
                    </p>
                    <p style="color: #475569; line-height: 1.6; margin: 0 0 32px;">
                      Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.
                      Bu bağlantı <strong>1 saat</strong> geçerlidir.
                    </p>
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="${resetUrl}"
                        style="background: #1e293b; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                        Şifremi Sıfırla
                      </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      Butona tıklayamıyorsanız bu bağlantıyı tarayıcınıza yapıştırın:<br/>
                      <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      Bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz. Şifreniz değişmeyecektir.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

/**
 * Dekont onay/red bildirimi. Aidat ve kira aynı şablonu paylaşır; yalnızca
 * borç türünü belirten metin (`type`) değişir. Varsayılan AIDAT olduğu için
 * bu parametreyi geçmeyen eski çağrılar aynı şekilde çalışmaya devam eder.
 */
export async function sendPaymentStatusEmail({
  to,
  residentName,
  status,
  type = "AIDAT",
  month,
  year,
  amount,
  rejectionReason,
}: {
  to: string;
  residentName: string;
  status: "APPROVED" | "REJECTED";
  type?: "AIDAT" | "KIRA";
  month: number;
  year: number;
  amount: number;
  rejectionReason?: string;
}) {
  const isApproved = status === "APPROVED";
  const statusText = isApproved ? "Onaylandı" : "Reddedildi";
  const statusColor = isApproved ? "#16a34a" : "#dc2626";
  const typeLabel = type === "KIRA" ? "kira" : "aidat";

  await sendMail({
    to,
    subject: `${type === "KIRA" ? "Kira" : "Aidat"} dekontunuz ${statusText} - ${MONTHS_TR[month]} ${year}`,
    html: `
      <!DOCTYPE html>
      <html lang="tr">
      <head><meta charset="UTF-8" /></head>
      <body style="font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: #1e293b; padding: 32px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 24px;">KolayAidat</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="color: ${statusColor}; margin: 0 0 16px;">Dekontunuz ${statusText}</h2>
                    <p style="color: #475569; margin: 0 0 8px;">Merhaba <strong>${residentName}</strong>,</p>
                    <p style="color: #475569; margin: 0 0 20px;">
                      <strong>${MONTHS_TR[month]} ${year}</strong> ayına ait
                      <strong>${amount.toLocaleString("tr-TR")} ₺</strong> tutarındaki ${typeLabel} dekontunuz
                      <strong style="color: ${statusColor};">${statusText.toLowerCase()}</strong>.
                    </p>
                    ${!isApproved && rejectionReason ? `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                      <p style="color: #dc2626; margin: 0; font-size: 14px;"><strong>Red sebebi:</strong> ${rejectionReason}</p>
                    </div>
                    <p style="color: #475569; font-size: 14px;">Lütfen dekontunuzu tekrar yükleyin.</p>
                    ` : ""}
                  </td>
                </tr>
                <tr>
                  <td style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">KolayAidat - Apartman Aidat Yönetimi</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
