import { NextRequest, NextResponse } from "next/server";

type ReputationSource = "provider" | "heuristic";
type ReputationProvider = "hunter" | "abstract" | "local";

type ReputationDetails = {
    deliverability: string;
    isDisposable: boolean;
    isFreeEmail: boolean;
    isRole: boolean;
    isCatchAll: boolean;
    hasMxRecord: boolean;
    smtpCheck: boolean;
    domain: string;
    username: string;
};

type ReputationCheckResult = {
    valid: boolean;
    score: number;
    status: string;
    result: string;
    source: ReputationSource;
    provider: ReputationProvider;
    warning?: string;
    details: ReputationDetails | null;
};

type ProviderData = {
    valid: boolean;
    deliverability: "DELIVERABLE" | "RISKY" | "UNDELIVERABLE" | "UNKNOWN";
    isDisposable: boolean;
    isFreeEmail: boolean;
    isRole: boolean;
    isCatchAll: boolean;
    hasMxRecord: boolean;
    smtpCheck: boolean;
    domain: string;
    username: string;
    provider: Exclude<ReputationProvider, "local">;
    providerScore?: number;
};

const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

const getStatusFromScore = (score: number) => {
    if (score < 25) return "poor";
    if (score < 50) return "fair";
    if (score < 75) return "good";
    return "excellent";
};

const getUsernameQualityAdjustment = (username: string) => {
    if (!username) {
        return -4;
    }

    let score = 4;

    if (username.length < 4) {
        score -= 2;
    }

    if (/[0-9]{4,}/.test(username)) {
        score -= 2;
    }

    if (/(test|temp|fake|demo|sample|trial|spam)/i.test(username)) {
        score -= 4;
    }

    if (/(admin|info|sales|support|contact|hello|team|noreply|no-reply)/i.test(username)) {
        score -= 3;
    }

    if (/[^a-z0-9._-]/i.test(username)) {
        score -= 1;
    }

    if (username.length >= 6 && /^[a-z0-9._-]+$/i.test(username)) {
        score += 2;
    }

    return score;
};

const getDeterministicOffset = (seed: string) => {
    let hash = 0;

    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
    }

    return (hash % 11) - 5;
};

const getDomainAdjustment = (domain: string) => {
    let score = 0;
    const normalizedDomain = domain.toLowerCase();

    if (/\.(edu|gov)$/i.test(normalizedDomain)) {
        score += 7;
    } else if (/\.(org|io|ai|co|net)$/i.test(normalizedDomain)) {
        score += 4;
    } else if (/\.(xyz|top|click|site|shop)$/i.test(normalizedDomain)) {
        score -= 6;
    } else if (/\.(info|biz)$/i.test(normalizedDomain)) {
        score -= 3;
    } else if (/\.(com)$/i.test(normalizedDomain)) {
        score += 2;
    }

    if ((normalizedDomain.match(/\./g) || []).length > 1) {
        score -= 1;
    }

    if (/-/.test(normalizedDomain)) {
        score -= 1;
    }

    if (/\d/.test(normalizedDomain)) {
        score -= 2;
    }

    return score;
};

const buildHeuristicDetails = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const username = normalizedEmail.split("@")[0] || "";
    const domain = normalizedEmail.split("@")[1] || "";

    const disposableDomains = [
        "tempmail.org",
        "guerrillamail.com",
        "10minutemail.com",
        "mailinator.com",
        "yopmail.com",
        "throwaway.email",
        "temp-mail.org",
    ];

    const freeEmailDomains = [
        "gmail.com",
        "outlook.com",
        "yahoo.com",
        "hotmail.com",
        "icloud.com",
        "protonmail.com",
        "zoho.com",
    ];

    return {
        username,
        domain,
        isDisposable: disposableDomains.some((entry) => domain.includes(entry)),
        isFreeEmail: freeEmailDomains.includes(domain),
        isRole: /(admin|info|sales|support|contact|hello|team|noreply|no-reply)/i.test(
            username
        ),
        hasSuspiciousTerms: /(test|temp|fake|demo|sample|trial|spam)/i.test(
            normalizedEmail
        ),
    };
};

const scoreProviderResult = (data: ProviderData): ReputationCheckResult => {
    if (!data.valid) {
        return {
            valid: false,
            score: 0,
            status: "invalid",
            result: "invalid",
            source: "provider",
            provider: data.provider,
            details: null,
        };
    }

    let score = data.providerScore ?? 34;

    switch (data.deliverability) {
        case "DELIVERABLE":
            score = Math.max(score, data.isFreeEmail ? 64 : 70);
            break;
        case "RISKY":
            score = Math.max(score, 42);
            score = Math.min(score, 72);
            break;
        case "UNDELIVERABLE":
            score = Math.min(score, 20);
            break;
        default:
            score = Math.max(score, 36);
            break;
    }

    score += data.smtpCheck ? 8 : -8;
    score += data.hasMxRecord ? 6 : -12;
    score += data.isDisposable ? -28 : 6;
    score += data.isFreeEmail ? 1 : 5;
    score += data.isRole ? -6 : 2;
    score += data.isCatchAll ? -10 : 0;
    score += getUsernameQualityAdjustment(data.username);
    score += getDomainAdjustment(data.domain);

    score = clampScore(score);

    return {
        valid: true,
        score,
        status: getStatusFromScore(score),
        result:
            data.deliverability === "DELIVERABLE"
                ? "deliverable"
                : data.deliverability === "UNDELIVERABLE"
                    ? "undeliverable"
                    : "risky",
        source: "provider",
        provider: data.provider,
        details: {
            deliverability: data.deliverability,
            isDisposable: data.isDisposable,
            isFreeEmail: data.isFreeEmail,
            isRole: data.isRole,
            isCatchAll: data.isCatchAll,
            hasMxRecord: data.hasMxRecord,
            smtpCheck: data.smtpCheck,
            domain: data.domain,
            username: data.username,
        },
    };
};

const fallbackEmailValidation = (
    email: string,
    warning: string
): ReputationCheckResult => {
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
        return {
            valid: false,
            score: 0,
            status: "invalid",
            result: "invalid",
            source: "heuristic",
            provider: "local",
            warning,
            details: null,
        };
    }

    const details = buildHeuristicDetails(normalizedEmail);
    const score = clampScore(
        26 +
            (details.isDisposable ? -30 : 8) +
            (details.isFreeEmail ? 0 : 6) +
            (details.isRole ? -8 : 4) +
            (details.hasSuspiciousTerms ? -14 : 5) +
            getUsernameQualityAdjustment(details.username) +
            getDomainAdjustment(details.domain) +
            getDeterministicOffset(normalizedEmail)
    );

    return {
        valid: true,
        score,
        status: getStatusFromScore(score),
        result: score >= 68 ? "deliverable" : score >= 42 ? "risky" : "undeliverable",
        source: "heuristic",
        provider: "local",
        warning,
        details: {
            deliverability:
                score >= 68 ? "DELIVERABLE" : score >= 42 ? "RISKY" : "UNDELIVERABLE",
            isDisposable: details.isDisposable,
            isFreeEmail: details.isFreeEmail,
            isRole: details.isRole,
            isCatchAll: false,
            hasMxRecord: true,
            smtpCheck: false,
            domain: details.domain,
            username: details.username,
        },
    };
};

const tryHunterLookup = async (
    email: string,
    apiKey: string
): Promise<ReputationCheckResult> => {
    const response = await fetch(
        `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(
            email
        )}&api_key=${encodeURIComponent(apiKey)}`,
        { cache: "no-store" }
    );
    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Hunter API error: ${data.errors?.[0]?.details || data.message || "Unknown error"}`);
    }

    const payload = data.data || {};
    const username = String(payload.local_part || email.split("@")[0] || "");
    const domain = String(payload.domain || email.split("@")[1] || "").toLowerCase();
    const status = String(payload.status || "unknown").toLowerCase();

    const deliverability =
        status === "valid"
            ? "DELIVERABLE"
            : ["accept_all", "unknown", "webmail", "blocked"].includes(status)
                ? "RISKY"
                : "UNDELIVERABLE";

    return scoreProviderResult({
        valid: payload.regexp !== false && status !== "invalid",
        deliverability,
        isDisposable: Boolean(payload.disposable),
        isFreeEmail: Boolean(payload.webmail),
        isRole: /(admin|info|sales|support|contact|hello|team|noreply|no-reply)/i.test(
            username
        ),
        isCatchAll: Boolean(payload.accept_all),
        hasMxRecord: Boolean(payload.mx_records),
        smtpCheck: Boolean(payload.smtp_check),
        domain,
        username,
        provider: "hunter",
        providerScore:
            typeof payload.score === "number" ? payload.score : undefined,
    });
};

const tryAbstractLookup = async (
    email: string,
    apiKey: string
): Promise<ReputationCheckResult> => {
    const response = await fetch(
        `https://emailvalidation.abstractapi.com/v1/?api_key=${encodeURIComponent(
            apiKey
        )}&email=${encodeURIComponent(email)}`,
        { cache: "no-store" }
    );
    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Abstract API error: ${data.message || "Unknown error"}`);
    }

    return scoreProviderResult({
        valid: data.is_valid_format?.value !== false,
        deliverability:
            data.deliverability === "DELIVERABLE"
                ? "DELIVERABLE"
                : data.deliverability === "UNDELIVERABLE"
                    ? "UNDELIVERABLE"
                    : "RISKY",
        isDisposable: Boolean(data.is_disposable_email?.value),
        isFreeEmail: Boolean(data.is_free_email?.value),
        isRole: Boolean(data.is_role?.value),
        isCatchAll: Boolean(data.is_catch_all?.value),
        hasMxRecord: Boolean(data.has_mx_record?.value),
        smtpCheck: Boolean(data.smtp_check?.value),
        domain: String(data.domain || email.split("@")[1] || "").toLowerCase(),
        username: String(data.username || email.split("@")[0] || ""),
        provider: "abstract",
    });
};

const checkEmailReputation = async (email: string): Promise<ReputationCheckResult> => {
    const hunterApiKey = process.env.HUNTER_API_KEY;
    const abstractApiKey = process.env.ABSTRACT_API_KEY;
    const providerErrors: string[] = [];

    if (hunterApiKey) {
        try {
            return await tryHunterLookup(email, hunterApiKey);
        } catch (error: any) {
            console.error("Hunter API error:", error);
            providerErrors.push(
                `Hunter live lookup failed: ${error?.message || "Unknown error"}`
            );
        }
    }

    if (abstractApiKey) {
        try {
            return await tryAbstractLookup(email, abstractApiKey);
        } catch (error: any) {
            console.error("Abstract API error:", error);
            providerErrors.push(
                `Abstract live lookup failed: ${error?.message || "Unknown error"}`
            );
        }
    }

    const warning =
        providerErrors.length > 0
            ? `${providerErrors.join(". ")}. Showing a local estimate instead.`
            : "No live reputation provider is configured, so this score is a local estimate.";

    return fallbackEmailValidation(email, warning);
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email = String(body.email || "").trim().toLowerCase();

        if (!email) {
            return NextResponse.json(
                { message: "Email is required" },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { message: "Please provide a valid email address" },
                { status: 400 }
            );
        }

        const result = await checkEmailReputation(email);

        return NextResponse.json({
            email,
            status: result.status,
            score: result.score,
            result: result.result,
            valid: result.valid,
            details: result.details,
            source: result.source,
            provider: result.provider,
            warning: result.warning,
            message: `Email reputation: ${result.status} (${result.score}/100)`,
        });
    } catch (error) {
        console.error("Email reputation check error:", error);

        return NextResponse.json(
            { message: "Error checking email reputation" },
            { status: 500 }
        );
    }
}
