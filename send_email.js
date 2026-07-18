const nodemailer = require('nodemailer');

async function sendEmail() {
    const args = process.argv.slice(2);
    const toEmail = args[0];
    const otpCode = args[1];
    
    const smtpHost = args[2];
    const smtpPort = args[3];
    const smtpUser = args[4];
    const smtpPassword = args[5];
    const smtpTls = args[6];

    const customSubject = args[7];
    const customBody = args[8];

    if (!toEmail || !otpCode) {
        console.error("Missing arguments: node send_email.js <email> <otp>");
        process.exit(1);
    }

    let transporter;

    if (smtpUser && smtpUser.trim() !== '') {
        console.log(`Sending email using SMTP host: ${smtpHost} with user: ${smtpUser}`);
        transporter = nodemailer.createTransport({
            host: smtpHost || 'smtp.gmail.com',
            port: parseInt(smtpPort || '587'),
            secure: smtpTls === 'false' ? false : true, // secure if TLS is set
            auth: {
                user: smtpUser,
                pass: smtpPassword || '',
            },
        });
    } else {
        console.log("No SMTP credentials provided. Creating test Ethereal account...");
        try {
            let testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
        } catch (err) {
            console.error("Failed to create Ethereal test account:", err);
            process.exit(1);
        }
    }

    const isCustom = customSubject && customSubject.trim() !== '';
    const mailOptions = {
        from: (smtpUser && smtpUser.trim() !== '') ? smtpUser : '"Carpool Org" <noreply@carpool.org>',
        to: toEmail,
        subject: isCustom ? customSubject : 'Your Carpool Account Reset Password OTP Code',
        text: isCustom ? customBody : `Hello,\n\nYour OTP code for resetting your password is: ${otpCode}\n\nThis code is valid for 10 minutes. If you did not request this, please ignore this email.\n\nBest regards,\nCarpool Team`,
        html: isCustom ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">${customBody.replace(/\n/g, '<br>')}</div>` : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #4f46e5; text-align: center;">Reset Your Password</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. Use the verification code below to proceed:</p>
                <div style="font-size: 24px; font-weight: bold; text-align: center; padding: 15px; background-color: #f3f4f6; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; color: #111827;">
                    ${otpCode}
                </div>
                <p style="font-size: 12px; color: #6b7280; text-align: center;">This code is valid for 10 minutes. If you did not make this request, you can safely ignore this email.</p>
            </div>
        `
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("\n" + "="*55);
        console.log(`[Nodemailer] Email sent successfully: ${info.messageId}`);
        if (!smtpUser || smtpUser.trim() === '') {
            console.log(`[Nodemailer Preview URL] ${nodemailer.getTestMessageUrl(info)}`);
        }
        console.log("="*55 + "\n");
    } catch (error) {
        console.error("Error sending email:", error);
        process.exit(1);
    }
}

sendEmail();
