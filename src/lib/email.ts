import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "KolayAidat <noreply@kolayaidat.com>";

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
  await resend.emails.send({
    from: FROM,
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
                <!-- Header -->
                <tr>
                  <td style="background: #1e293b; padding: 32px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 24px;">KolayAidat</h1>
                    <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">Apartman Aidat Yönetimi</p>
                  </td>
                </tr>
                <!-- Body -->
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
                <!-- Footer -->
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

export async function sendPaymentStatusEmail({
  to,
  residentName,
  status,
  month,
  year,
  amount,
  rejectionReason,
}: {
  to: string;
  residentName: string;
  status: "APPROVED" | "REJECTED";
  month: number;
  year: number;
  amount: number;
  rejectionReason?: string;
}) {
  const MONTHS_TR = [
    "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];

  const isApproved = status === "APPROVED";
  const statusText = isApproved ? "Onaylandı" : "Reddedildi";
  const statusColor = isApproved ? "#16a34a" : "#dc2626";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Dekontunuz ${statusText} - ${MONTHS_TR[month]} ${year}`,
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
                      <strong>${amount.toLocaleString("tr-TR")} ₺</strong> tutarındaki aidat dekontunuz
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
