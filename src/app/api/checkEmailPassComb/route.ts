import { NextRequest, NextResponse } from "next/server";
import checkEmailPassComb from "../../../lib/checkEmailPassComb";

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
