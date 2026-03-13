import cron, { ScheduledTask } from "node-cron";
import nodemailer from "nodemailer";
import connect from "./dbConfig";
import EmailWarmup from "../model/emailWarmupModel";
import callOpenAI from "./openai";

type WarmupJobs = {
    scheduledMinute: number;
    sendTask: ScheduledTask;
    resetTask: ScheduledTask;
};

type WarmupRunResult = {
    success: boolean;
    skipped: boolean;
    message: string;
    recipientEmail?: string;
    nextWarmupTime: Date | null;
};

type SchedulerStartResult = {
    scheduledMinute: number;
    nextWarmupTime: Date | null;
};

const globalWarmupRegistry = globalThis as typeof globalThis & {
    __emailWarmupJobs?: Map<string, WarmupJobs>;
};

const warmupJobs =
    globalWarmupRegistry.__emailWarmupJobs ?? new Map<string, WarmupJobs>();

globalWarmupRegistry.__emailWarmupJobs = warmupJobs;

const MIN_ACTIVE_POOL_RECIPIENTS = 2;
const RECENT_RECIPIENT_HISTORY_LIMIT = 5;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeAppPassword = (appPassword: string) =>
    appPassword.replace(/\s+/g, "");

const getHour = (time: string) => {
    const [hour] = time.split(":").map(Number);
    if (Number.isNaN(hour)) {
        throw new Error("Warmup schedule time is invalid");
    }

    return hour;
};

const isWithinSchedule = (warmup: any, at = new Date()) => {
    const currentDay = at.getDay();
    const currentTime = at.toTimeString().slice(0, 5);

    return (
        warmup.warmupSchedule.daysOfWeek.includes(currentDay) &&
        currentTime >= warmup.warmupSchedule.startTime &&
        currentTime <= warmup.warmupSchedule.endTime
    );
};

const getCronExpression = (warmup: any, minute: number) => {
    const days = [...warmup.warmupSchedule.daysOfWeek].sort((a, b) => a - b);
    const startHour = getHour(warmup.warmupSchedule.startTime);
    const endHour = getHour(warmup.warmupSchedule.endTime);

    if (days.length === 0) {
        throw new Error("Select at least one day for the warmup schedule");
    }

    if (endHour < startHour) {
        throw new Error("Warmup end time must be after the start time");
    }

    const hours = startHour === endHour ? `${startHour}` : `${startHour}-${endHour}`;

    return `${minute} ${hours} * * ${days.join(",")}`;
};

const calculateNextWarmupTime = (
    warmup: any,
    scheduledMinute: number,
    fromDate = new Date()
) => {
    const startHour = getHour(warmup.warmupSchedule.startTime);
    const endHour = getHour(warmup.warmupSchedule.endTime);
    const scheduledDays = [...warmup.warmupSchedule.daysOfWeek].sort((a, b) => a - b);

    for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
        const candidateDay = new Date(fromDate);
        candidateDay.setHours(0, 0, 0, 0);
        candidateDay.setDate(candidateDay.getDate() + dayOffset);

        if (!scheduledDays.includes(candidateDay.getDay())) {
            continue;
        }

        for (let hour = startHour; hour <= endHour; hour += 1) {
            const candidate = new Date(candidateDay);
            candidate.setHours(hour, scheduledMinute, 0, 0);

            if (candidate <= fromDate) {
                continue;
            }

            if (isWithinSchedule(warmup, candidate)) {
                return candidate;
            }
        }
    }

    return null;
};

const buildFallbackEmail = (senderEmail: string, recipientEmail: string) => ({
    subject: "Quick follow-up",
    text: `Hi,

Just checking in to keep our email conversation active between ${senderEmail} and ${recipientEmail}.

Best,
${senderEmail}`,
});

const buildWarmupEmail = async (senderEmail: string, recipientEmail: string) => {
    const fallback = buildFallbackEmail(senderEmail, recipientEmail);

    try {
        const generatedEmail = await callOpenAI(
            `Write a short natural business email from ${senderEmail} to ${recipientEmail}. Include a subject line that starts with "Subject:" and avoid spammy wording.`
        );

        const subjectMatch = generatedEmail.match(/Subject:\s*(.*?)(?=\n|$)/i);
        const subject = subjectMatch?.[1]?.trim() || fallback.subject;
        const text = generatedEmail
            .replace(/Subject:\s*(.*?)(?=\n|$)/i, "")
            .trim();

        return {
            subject,
            text: text || fallback.text,
        };
    } catch (error) {
        return fallback;
    }
};

const refreshDailyStateIfNeeded = async (warmup: any) => {
    const now = new Date();
    const lastWarmupDate = warmup.lastWarmupDate
        ? new Date(warmup.lastWarmupDate)
        : null;

    if (!lastWarmupDate || lastWarmupDate.toDateString() === now.toDateString()) {
        return;
    }

    if (getDailyEmailsSent(warmup) === 0) {
        return;
    }

    warmup.dailyEmailsSent = 0;
    warmup.dailyMailCount = Math.min(
        warmup.dailyMailCount + warmup.dailyMailIncrease,
        warmup.maxDailyMailCount
    );
    await warmup.save();
};

const createTransporter = (email: string, appPassword: string) =>
    nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: normalizeEmail(email),
            pass: normalizeAppPassword(appPassword),
        },
    });

const buildPoolRequirementMessage = () =>
    "Add at least 3 active warmup inboxes, including 2 recipient-enabled pool members.";

const getDailyEmailsSent = (warmup: any) =>
    typeof warmup.dailyEmailsSent === "number" ? warmup.dailyEmailsSent : 0;

const getCurrentEmailIndex = (warmup: any) =>
    typeof warmup.currentEmailIndex === "number" ? warmup.currentEmailIndex : 0;

const pickRecipient = (warmup: any, recipientWarmups: any[]) => {
    const recentRecipientEmails = Array.isArray(warmup.recentRecipientEmails)
        ? warmup.recentRecipientEmails.filter(Boolean)
        : [];

    let candidateRecipients = recipientWarmups.filter(
        (recipient) => !recentRecipientEmails.includes(recipient.email)
    );

    if (candidateRecipients.length === 0) {
        candidateRecipients = recipientWarmups;
        warmup.recentRecipientEmails = [];
    }

    if (warmup.lastRecipientEmail) {
        const recipientsExcludingLast = candidateRecipients.filter(
            (recipient) => recipient.email !== warmup.lastRecipientEmail
        );

        if (recipientsExcludingLast.length > 0) {
            candidateRecipients = recipientsExcludingLast;
        }
    }

    return candidateRecipients[
        getCurrentEmailIndex(warmup) % candidateRecipients.length
    ];
};

const sendWarmupEmail = async (
    warmupId: string,
    options?: { respectSchedule?: boolean; scheduledMinute?: number }
): Promise<WarmupRunResult> => {
    await connect();

    const warmup: any = await EmailWarmup.findById(warmupId);
    if (!warmup) {
        throw new Error("Email warmup not found");
    }

    if (!warmup.isActive) {
        return {
            success: false,
            skipped: true,
            message: "Email warmup is not active",
            nextWarmupTime: null,
        };
    }

    await refreshDailyStateIfNeeded(warmup);

    const scheduledMinute =
        options?.scheduledMinute ??
        warmupJobs.get(warmupId)?.scheduledMinute ??
        Math.floor(Math.random() * 60);

    if (options?.respectSchedule && !isWithinSchedule(warmup)) {
        const nextWarmupTime = calculateNextWarmupTime(warmup, scheduledMinute);
        warmup.nextWarmupTime = nextWarmupTime;
        await warmup.save();

        return {
            success: false,
            skipped: true,
            message: `Warmup for ${warmup.email} is outside the scheduled window`,
            nextWarmupTime,
        };
    }

    if (getDailyEmailsSent(warmup) >= warmup.dailyMailCount) {
        const nextWarmupTime = calculateNextWarmupTime(warmup, scheduledMinute);
        warmup.nextWarmupTime = nextWarmupTime;
        await warmup.save();

        return {
            success: false,
            skipped: true,
            message: `Daily warmup limit reached for ${warmup.email}`,
            nextWarmupTime,
        };
    }

    const recipientWarmups: any[] = await EmailWarmup.find({
        _id: { $ne: warmup._id },
        isActive: true,
        canReceiveWarmups: true,
    }).sort({ createdAt: 1 });

    if (recipientWarmups.length < MIN_ACTIVE_POOL_RECIPIENTS) {
        const nextWarmupTime = calculateNextWarmupTime(warmup, scheduledMinute);
        warmup.nextWarmupTime = nextWarmupTime;
        await warmup.save();

        return {
            success: false,
            skipped: true,
            message: buildPoolRequirementMessage(),
            nextWarmupTime,
        };
    }

    const recipient = pickRecipient(warmup, recipientWarmups);
    const transporter = createTransporter(warmup.email, warmup.appPassword);
    const emailContent = await buildWarmupEmail(warmup.email, recipient.email);
    const sentAt = new Date();

    await transporter.sendMail({
        from: warmup.email,
        to: recipient.email,
        subject: emailContent.subject,
        text: emailContent.text,
    });

    warmup.currentEmailIndex =
        (getCurrentEmailIndex(warmup) + 1) % recipientWarmups.length;
    warmup.dailyEmailsSent = getDailyEmailsSent(warmup) + 1;
    warmup.emailsSent = (warmup.emailsSent ?? 0) + 1;
    warmup.lastWarmupDate = sentAt;
    warmup.lastRecipientEmail = recipient.email;
    warmup.lastRecipientAt = sentAt;
    warmup.recentRecipientEmails = [
        ...(Array.isArray(warmup.recentRecipientEmails)
            ? warmup.recentRecipientEmails.filter(
                (email: string) => email && email !== recipient.email
            )
            : []),
        recipient.email,
    ].slice(-Math.min(RECENT_RECIPIENT_HISTORY_LIMIT, recipientWarmups.length));
    warmup.nextWarmupTime = calculateNextWarmupTime(
        warmup,
        scheduledMinute,
        warmup.lastWarmupDate
    );

    recipient.emailsReceived = (recipient.emailsReceived ?? 0) + 1;
    recipient.lastSenderEmail = warmup.email;
    recipient.lastReceivedAt = sentAt;

    await Promise.all([warmup.save(), recipient.save()]);

    return {
        success: true,
        skipped: false,
        message: `Warmup email sent to ${recipient.email}`,
        recipientEmail: recipient.email,
        nextWarmupTime: warmup.nextWarmupTime,
    };
};

const resetDailyWarmupState = async (warmupId: string) => {
    await connect();

    const warmup: any = await EmailWarmup.findById(warmupId);
    if (!warmup || !warmup.isActive) {
        return;
    }

    const scheduledMinute =
        warmupJobs.get(warmupId)?.scheduledMinute ?? Math.floor(Math.random() * 60);

    warmup.dailyEmailsSent = 0;
    warmup.dailyMailCount = Math.min(
        warmup.dailyMailCount + warmup.dailyMailIncrease,
        warmup.maxDailyMailCount
    );
    warmup.recentRecipientEmails = [];
    warmup.nextWarmupTime = calculateNextWarmupTime(warmup, scheduledMinute);

    await warmup.save();
};

export const stopWarmupScheduler = (warmupId: string) => {
    const runningJobs = warmupJobs.get(warmupId);
    if (!runningJobs) {
        return;
    }

    runningJobs.sendTask.stop();
    runningJobs.resetTask.stop();
    warmupJobs.delete(warmupId);
};

export const startWarmupScheduler = async (
    warmupId: string
): Promise<SchedulerStartResult> => {
    await connect();

    const warmup: any = await EmailWarmup.findById(warmupId);
    if (!warmup) {
        throw new Error("Email warmup not found");
    }

    if (!warmup.isActive) {
        throw new Error("Email warmup is not active");
    }

    stopWarmupScheduler(warmupId);

    const scheduledMinute = Math.floor(Math.random() * 60);
    const cronExpression = getCronExpression(warmup, scheduledMinute);

    const sendTask = cron.schedule(cronExpression, async () => {
        try {
            await sendWarmupEmail(warmupId, {
                respectSchedule: true,
                scheduledMinute,
            });
        } catch (error) {
            console.error(`Scheduled warmup failed for ${warmupId}:`, error);
        }
    });

    const resetTask = cron.schedule("0 0 * * *", async () => {
        try {
            await resetDailyWarmupState(warmupId);
        } catch (error) {
            console.error(`Warmup reset failed for ${warmupId}:`, error);
        }
    });

    warmupJobs.set(warmupId, {
        scheduledMinute,
        sendTask,
        resetTask,
    });

    const nextWarmupTime = calculateNextWarmupTime(warmup, scheduledMinute);
    warmup.nextWarmupTime = nextWarmupTime;
    await warmup.save();

    return {
        scheduledMinute,
        nextWarmupTime,
    };
};

export const startWarmupNow = async (
    warmupId: string,
    scheduledMinute?: number
) =>
    sendWarmupEmail(warmupId, {
        respectSchedule: false,
        scheduledMinute,
    });

export const runScheduledWarmup = async (warmupId: string) =>
    sendWarmupEmail(warmupId, {
        respectSchedule: true,
    });
