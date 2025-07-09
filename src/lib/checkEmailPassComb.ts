import nodemailer from "nodemailer";

const checkEmailPassComb = async (email: string, appPass: string) => {
    if (!email || !appPass) {
        throw new Error("Email and app password are required");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error("Please provide a valid email address");
    }

    const mailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: email,
            pass: appPass,
        },
    });

    try {
        await mailTransporter.verify();
    } catch (error) {
        throw new Error("Invalid email and app password combination");
    }
};

export default checkEmailPassComb; 