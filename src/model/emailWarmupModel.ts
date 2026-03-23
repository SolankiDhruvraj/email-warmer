import mongoose from "mongoose";
import { encrypt, decrypt } from "../lib/encryption";

const emailWarmupSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    appPassword: {
        type: String,
        required: true,
        set: encrypt,
        get: decrypt,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    canReceiveWarmups: {
        type: Boolean,
        default: true,
    },
    emailsSent: {
        type: Number,
        default: 0,
    },
    emailsReceived: {
        type: Number,
        default: 0,
    },
    reputationHistory: [
        {
            score: { type: Number },
            checkedAt: { type: Date, default: Date.now },
        }
    ],
    dailyMailCount: {
        type: Number,
        default: 3,
    },
    dailyMailIncrease: {
        type: Number,
        default: 2,
    },
    maxDailyMailCount: {
        type: Number,
        default: 5,
    },
    dailyEmailsSent: {
        type: Number,
        default: 0,
    },
    currentEmailIndex: {
        type: Number,
        default: 0,
    },
    lastRecipientEmail: {
        type: String,
        default: null,
    },
    lastRecipientAt: {
        type: Date,
        default: null,
    },
    recentRecipientEmails: {
        type: [String],
        default: [],
    },
    lastSenderEmail: {
        type: String,
        default: null,
    },
    lastReceivedAt: {
        type: Date,
        default: null,
    },
    lastWarmupDate: {
        type: Date,
        default: null,
    },
    nextWarmupTime: {
        type: Date,
        default: null,
    },
    warmupSchedule: {
        startTime: {
            type: String,
            default: "10:00",
        },
        endTime: {
            type: String,
            default: "17:00",
        },
        daysOfWeek: {
            type: [Number], // 0 = Sunday, 1 = Monday, etc.
            default: [1, 2, 3, 4, 5], // Monday to Friday
        },
    },
}, { timestamps: true });

// Enforce one warmup tracking record per email account per user
emailWarmupSchema.index({ userId: 1, email: 1 }, { unique: true });

const EmailWarmup = mongoose.models.EmailWarmup || mongoose.model("EmailWarmup", emailWarmupSchema);

export default EmailWarmup; 
