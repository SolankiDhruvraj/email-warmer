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
            console.log("No token found in cookies");
            return null;
        }

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET || "fallback-secret") as any;
        console.log("Token decoded:", decoded);
        return decoded.id;
    } catch (error) {
        console.error("Token verification error:", error);
        return null;
    }
};

// GET - Get all email warmups for the user
export async function GET(request: NextRequest) {
    try {
        await connect();
        const userId = await getUserIdFromToken(request);

        if (!userId) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const emailWarmups = await EmailWarmup.find({ userId }).select('-appPassword');

        return NextResponse.json({
            success: true,
            data: emailWarmups
        });
    } catch (error) {
        console.error("Get email warmups error:", error);
        return NextResponse.json(
            { message: "Error fetching email warmups" },
            { status: 500 }
        );
    }
}

// POST - Add a new email warmup
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
        const { email, appPassword, dailyMailCount, dailyMailIncrease, maxDailyMailCount, warmupSchedule, reputationHistory } = body;

        if (!email || !appPassword) {
            return NextResponse.json(
                { message: "Email and app password are required" },
                { status: 400 }
            );
        }

        // Check if email already exists for this user
        const existingWarmup = await EmailWarmup.findOne({ userId, email });
        if (existingWarmup) {
            return NextResponse.json(
                { message: "Email already exists for this user" },
                { status: 400 }
            );
        }

        // Create new email warmup
        const newWarmup = new EmailWarmup({
            userId,
            email,
            appPassword,
            dailyMailCount: dailyMailCount || 3,
            dailyMailIncrease: dailyMailIncrease || 2,
            maxDailyMailCount: maxDailyMailCount || 5,
            warmupSchedule: warmupSchedule || {
                startTime: "10:00",
                endTime: "17:00",
                daysOfWeek: [1, 2, 3, 4, 5]
            },
            reputationHistory: reputationHistory || []
        });

        await newWarmup.save();

        // Return without app password
        const { appPassword: _, ...warmupData } = newWarmup.toObject();

        return NextResponse.json({
            success: true,
            message: "Email warmup added successfully",
            data: warmupData
        });
    } catch (error) {
        console.error("Add email warmup error:", error);
        return NextResponse.json(
            { message: "Error adding email warmup" },
            { status: 500 }
        );
    }
}

// PUT - Update an email warmup
export async function PUT(request: NextRequest) {
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
        const { warmupId, email, appPassword, isActive, dailyMailCount, dailyMailIncrease, maxDailyMailCount, warmupSchedule, reputationHistory } = body;

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

        // Update fields
        const updateData: any = {};
        if (email !== undefined) updateData.email = email;
        if (appPassword !== undefined) updateData.appPassword = appPassword;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (dailyMailCount !== undefined) updateData.dailyMailCount = dailyMailCount;
        if (dailyMailIncrease !== undefined) updateData.dailyMailIncrease = dailyMailIncrease;
        if (maxDailyMailCount !== undefined) updateData.maxDailyMailCount = maxDailyMailCount;
        if (warmupSchedule !== undefined) updateData.warmupSchedule = warmupSchedule;
        if (reputationHistory !== undefined) updateData.reputationHistory = reputationHistory;

        const updatedWarmup = await EmailWarmup.findByIdAndUpdate(
            warmupId,
            updateData,
            { new: true }
        ).select('-appPassword');

        return NextResponse.json({
            success: true,
            message: "Email warmup updated successfully",
            data: updatedWarmup
        });
    } catch (error) {
        console.error("Update email warmup error:", error);
        return NextResponse.json(
            { message: "Error updating email warmup" },
            { status: 500 }
        );
    }
}

// DELETE - Delete an email warmup
export async function DELETE(request: NextRequest) {
    try {
        await connect();
        const userId = await getUserIdFromToken(request);

        if (!userId) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const warmupId = searchParams.get('id');

        if (!warmupId) {
            return NextResponse.json(
                { message: "Warmup ID is required" },
                { status: 400 }
            );
        }

        // Find and delete the warmup, ensuring it belongs to the user
        const deletedWarmup = await EmailWarmup.findOneAndDelete({ _id: warmupId, userId });

        if (!deletedWarmup) {
            return NextResponse.json(
                { message: "Email warmup not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Email warmup deleted successfully"
        });
    } catch (error) {
        console.error("Delete email warmup error:", error);
        return NextResponse.json(
            { message: "Error deleting email warmup" },
            { status: 500 }
        );
    }
} 