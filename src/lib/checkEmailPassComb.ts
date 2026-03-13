import nodemailer from "nodemailer";

const checkEmailPassComb = async (email: string, appPass: string) => {
    if (!email || !appPass) {
        throw new Error("Email and app password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedAppPass = appPass.replace(/\s+/g, "");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
        throw new Error("Please provide a valid email address");
    }

    const mailTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: normalizedEmail,
            pass: normalizedAppPass,
        },
    });

    try {
        await mailTransporter.verify();
    } catch (error: any) {
        const errorText = [
            error?.code,
            error?.response,
            error?.responseCode,
            error?.command,
        ]
            .filter(Boolean)
            .join(" ");

        if (
            errorText.includes("535") ||
            errorText.includes("534") ||
            errorText.toLowerCase().includes("application-specific password") ||
            errorText.toLowerCase().includes("username and password not accepted")
        ) {
            throw new Error(
                "Gmail rejected the login. Use a Gmail App Password, not your normal Google password, and paste it without spaces. If this is a Google Workspace account, app passwords may not be allowed."
            );
        }

        throw new Error("Unable to verify Gmail credentials right now. Please try again.");
    }
};

export default checkEmailPassComb; 
