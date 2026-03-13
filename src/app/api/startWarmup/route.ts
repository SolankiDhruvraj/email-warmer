import { NextRequest, NextResponse } from "next/server";
import connect from "../../../lib/dbConfig";
import EmailWarmup from "../../../model/emailWarmupModel";
import {
    startWarmupNow,
    startWarmupScheduler,
} from "../../../lib/emailWarmupScheduler";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// Helper function to get user ID from token
const getUserIdFromToken = async (request: NextRequest) => {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return null;
        }

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET || "fallback-secret") as any;
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

        // Find the warmup and ensure it belongs to the user
        const warmup = await EmailWarmup.findOne({ _id: warmupId, userId });
        if (!warmup) {
            return NextResponse.json(
                { message: "Email warmup not found" },
                { status: 404 }
            );
        }

        if (!warmup.isActive) {
            return NextResponse.json(
                { message: "Email warmup is not active" },
                { status: 400 }
            );
        }

        const { scheduledMinute, nextWarmupTime } = await startWarmupScheduler(
            warmupId
        );
        const immediateRun = await startWarmupNow(warmupId, scheduledMinute);

        const message = immediateRun.success
            ? `Email warming started for ${warmup.email}. First warmup email sent to ${immediateRun.recipientEmail}.`
            : `Email warming started for ${warmup.email}. Immediate warmup skipped: ${immediateRun.message}.`;

        return NextResponse.json({
            success: true,
            message,
            data: {
                email: warmup.email,
                immediateRun,
                nextWarmupTime: immediateRun.nextWarmupTime ?? nextWarmupTime
            }
        });
    } catch (error) {
        console.error("Start warmup error:", error);
        return NextResponse.json(
            { message: "Error starting email warmup" },
            { status: 500 }
        );
    }
} 
