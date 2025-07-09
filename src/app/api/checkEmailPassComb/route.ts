import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, appPass } = body;

        if (!email || !appPass) {
            return NextResponse.json(
                { message: "Email and app password are required" },
                { status: 400 }
            );
        }

        await checkEmailPassComb(email, appPass);
        return NextResponse.json({
            message: "Email and app password combination is valid"
        });
    } catch (error) {
        console.error("Email validation error:", error);

        if (error instanceof Error) {
            return NextResponse.json(
                { message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: "Email validation failed" },
            { status: 500 }
        );
    }
} 