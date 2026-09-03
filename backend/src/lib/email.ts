import nodemailer from 'nodemailer';
import { Resend } from 'resend';

let etherealTransporter: nodemailer.Transporter | null = null;
const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789');

const getEtherealTransporter = async () => {
    if (etherealTransporter) return etherealTransporter;

    // Generate a test account dynamically
    const testAccount = await nodemailer.createTestAccount();
    
    etherealTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });

    console.log(`[Email] Created Ethereal test account: ${testAccount.user}`);
    return etherealTransporter;
};

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            await resend.emails.send({
                from: 'Acme Store <onboarding@resend.dev>',
                to,
                subject,
                html
            });
            console.log(`[Email] Sent production email to ${to} via Resend.`);
        } else {
            const transporter = await getEtherealTransporter();
            const info = await transporter.sendMail({
                from: '"Acme Store Dev" <dev@acmestore.local>',
                to,
                subject,
                html,
            });

            console.log(`[Email] Sent dev email to ${to}. MessageId: ${info.messageId}`);
            console.log(`[Email] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
    } catch (error) {
        console.error('[Email] Failed to send email:', error);
    }
};
