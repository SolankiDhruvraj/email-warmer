import { NextRequest, NextResponse } from "next/server";
import connect from "../../../lib/dbConfig";
import EmailWarmup from "../../../model/emailWarmupModel";
import { runScheduledWarmup } from "../../../lib/emailWarmupScheduler";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const getUserIdFromToken = async (request: NextRequest) => {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return null;
        }

        const decoded = jwt.verify(
            token,
            process.env.TOKEN_SECRET || "fallback-secret"
        ) as any;
        return decoded.id;
    } catch (error) {
        return null;
    }
};

export async function POST(request: NextRequest) {
    try {
        await connect();
        const userId = await getUserIdFromToken(request);

        if (!userId) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { warmupId } = body;

        if (!warmupId) {
            return NextResponse.json(
                { message: "Warmup ID is required" },
                { status: 400 }
            );
        }

        const warmup = await EmailWarmup.findOne({ _id: warmupId, userId });
        if (!warmup) {
            return NextResponse.json(
                { message: "Email warmup not found" },
                { status: 404 }
            );
        }

        const result = await runScheduledWarmup(warmupId);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                message: result.message,
                data: {
                    email: warmup.email,
                    nextWarmupTime: result.nextWarmupTime,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: result.message,
            data: {
                email: warmup.email,
                recipientEmail: result.recipientEmail,
                nextWarmupTime: result.nextWarmupTime,
            },
        });
    } catch (error) {
        console.error("Send scheduled emails error:", error);
        return NextResponse.json(
            { message: "Error sending scheduled emails" },
            { status: 500 }
        );
    }
}
