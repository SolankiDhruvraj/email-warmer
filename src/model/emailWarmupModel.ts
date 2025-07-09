import mongoose from "mongoose";

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
    },
    isActive: {
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt field before saving
emailWarmupSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const EmailWarmup = mongoose.models.EmailWarmup || mongoose.model("EmailWarmup", emailWarmupSchema);

export default EmailWarmup; 