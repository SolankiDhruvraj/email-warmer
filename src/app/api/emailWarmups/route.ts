import { NextRequest, NextResponse } from "next/server";
import connect from "../../../lib/dbConfig";
import EmailWarmup from "../../../model/emailWarmupModel";
import checkEmailPassComb from "../../../lib/checkEmailPassComb";
import { stopWarmupScheduler, startWarmupScheduler } from "../../../lib/emailWarmupScheduler";
import { getUserIdFromToken } from "../../../lib/auth";
import { z } from "zod";

const warmupScheduleSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid time format"),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1),
}).optional();

const postWarmupSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  appPassword: z.string().trim().min(1),
  dailyMailCount: z.number().positive().optional(),
  dailyMailIncrease: z.number().positive().optional(),
  maxDailyMailCount: z.number().positive().optional(),
  warmupSchedule: warmupScheduleSchema,
  canReceiveWarmups: z.boolean().optional(),
  reputationHistory: z.array(z.any()).optional()
});

const putWarmupSchema = z.object({
  warmupId: z.string().min(1),
  email: z.string().email().trim().toLowerCase().optional(),
  appPassword: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  dailyMailCount: z.number().positive().optional(),
  dailyMailIncrease: z.number().positive().optional(),
  maxDailyMailCount: z.number().positive().optional(),
  warmupSchedule: warmupScheduleSchema,
  canReceiveWarmups: z.boolean().optional(),
  reputationHistory: z.array(z.any()).optional()
});

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
        const parsedBody = postWarmupSchema.safeParse(body);
        
        if (!parsedBody.success) {
            return NextResponse.json(
                { message: "Invalid input", errors: parsedBody.error.flatten() },
                { status: 400 }
            );
        }

        const {
            email: normalizedEmail,
            appPassword: rawAppPassword,
            dailyMailCount,
            dailyMailIncrease,
            maxDailyMailCount,
            warmupSchedule,
            reputationHistory,
            canReceiveWarmups,
        } = parsedBody.data;
        
        const normalizedAppPassword = rawAppPassword.replace(/\s+/g, "");

        await checkEmailPassComb(normalizedEmail, normalizedAppPassword);

        // Check if email already exists for this user
        const existingWarmup = await EmailWarmup.findOne({ userId, email: normalizedEmail });
        if (existingWarmup) {
            return NextResponse.json(
                { message: "Email already exists for this user" },
                { status: 400 }
            );
        }

        // Create new email warmup
        const newWarmup = new EmailWarmup({
            userId,
            email: normalizedEmail,
            appPassword: normalizedAppPassword,
            dailyMailCount: dailyMailCount || 3,
            dailyMailIncrease: dailyMailIncrease || 2,
            maxDailyMailCount: maxDailyMailCount || 5,
            canReceiveWarmups: canReceiveWarmups ?? true,
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

        if (error instanceof Error) {
            return NextResponse.json(
                { message: error.message },
                { status: 400 }
            );
        }

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
        const parsedBody = putWarmupSchema.safeParse(body);
        
        if (!parsedBody.success) {
            return NextResponse.json(
                { message: "Invalid input", errors: parsedBody.error.flatten() },
                { status: 400 }
            );
        }

        const {
            warmupId,
            email: normalizedEmail,
            appPassword: rawAppPassword,
            isActive,
            dailyMailCount,
            dailyMailIncrease,
            maxDailyMailCount,
            warmupSchedule,
            reputationHistory,
            canReceiveWarmups,
        } = parsedBody.data;
        
        const normalizedAppPassword = rawAppPassword ? rawAppPassword.replace(/\s+/g, "") : undefined;

        // Find the warmup and ensure it belongs to the user
        const warmup = await EmailWarmup.findOne({ _id: warmupId, userId });
        if (!warmup) {
            return NextResponse.json(
                { message: "Email warmup not found" },
                { status: 404 }
            );
        }

        const nextEmail = normalizedEmail ?? warmup.email;
        const nextAppPassword = normalizedAppPassword ?? warmup.appPassword;

        if (normalizedEmail !== undefined && normalizedEmail !== warmup.email) {
            const duplicateCheck = await EmailWarmup.findOne({ userId, email: normalizedEmail });
            if (duplicateCheck) {
                return NextResponse.json(
                    { message: "Email already exists for this user" },
                    { status: 400 }
                );
            }
        }

        if (normalizedEmail !== undefined || normalizedAppPassword !== undefined) {
            await checkEmailPassComb(nextEmail, nextAppPassword);
        }

        // Update fields
        const updateData: any = {};
        if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
        if (normalizedAppPassword !== undefined) updateData.appPassword = normalizedAppPassword;
        if (isActive !== undefined) {
            updateData.isActive = isActive;

            if (!isActive) {
                stopWarmupScheduler(warmupId);
                updateData.nextWarmupTime = null;
            } else {
                try {
                    await startWarmupScheduler(warmupId);
                } catch (e) {
                    console.error("Failed to re-start scheduler:", e);
                }
            }
        }
        if (canReceiveWarmups !== undefined) {
            updateData.canReceiveWarmups = canReceiveWarmups;
        }
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

        if (error instanceof Error) {
            return NextResponse.json(
                { message: error.message },
                { status: 400 }
            );
        }

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

        stopWarmupScheduler(warmupId);

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
