import { NextRequest, NextResponse } from "next/server";
import connect from "../../../lib/dbConfig";
import EmailWarmup from "../../../model/emailWarmupModel";
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

        // Check if it's time to send emails based on schedule
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        // Check if current day is in the schedule
        if (!warmup.warmupSchedule.daysOfWeek.includes(currentDay)) {
            return NextResponse.json({
                message: `Email warming is not scheduled for ${getDayName(currentDay)}`,
                data: { email: warmup.email, nextScheduledDay: getNextScheduledDay(warmup.warmupSchedule.daysOfWeek, currentDay) }
            });
        }

        // Check if current time is within the schedule
        if (currentTime < warmup.warmupSchedule.startTime || currentTime > warmup.warmupSchedule.endTime) {
            return NextResponse.json({
                message: `Email warming is only active between ${warmup.warmupSchedule.startTime} and ${warmup.warmupSchedule.endTime}`,
                data: { email: warmup.email, schedule: warmup.warmupSchedule }
            });
        }

        // Check if we've already sent emails today
        const today = new Date().toDateString();
        if (warmup.lastWarmupDate && new Date(warmup.lastWarmupDate).toDateString() === today) {
            return NextResponse.json({
                message: `Emails have already been sent today for ${warmup.email}`,
                data: { email: warmup.email, lastWarmup: warmup.lastWarmupDate }
            });
        }

        // Simulate sending emails (in a real implementation, this would send actual emails)
        const emailsToSend = Math.min(warmup.dailyMailCount, warmup.maxDailyMailCount);

        // Update the warmup with new stats
        const updatedWarmup = await EmailWarmup.findByIdAndUpdate(
            warmupId,
            {
                emailsSent: warmup.emailsSent + emailsToSend,
                lastWarmupDate: now,
                dailyMailCount: Math.min(warmup.dailyMailCount + warmup.dailyMailIncrease, warmup.maxDailyMailCount)
            },
            { new: true }
        ).select('-appPassword');

        return NextResponse.json({
            success: true,
            message: `Successfully sent ${emailsToSend} emails for ${warmup.email}`,
            data: {
                email: warmup.email,
                emailsSent: updatedWarmup?.emailsSent,
                dailyMailCount: updatedWarmup?.dailyMailCount,
                lastWarmupDate: updatedWarmup?.lastWarmupDate
            }
        });
    } catch (error) {
        console.error("Send scheduled emails error:", error);
        return NextResponse.json(
            { message: "Error sending scheduled emails" },
            { status: 500 }
        );
    }
}

// Helper functions
function getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
}

function getNextScheduledDay(scheduledDays: number[], currentDay: number): string {
    for (let i = 1; i <= 7; i++) {
        const nextDay = (currentDay + i) % 7;
        if (scheduledDays.includes(nextDay)) {
            return getDayName(nextDay);
        }
    }
    return getDayName(scheduledDays[0]);
} 