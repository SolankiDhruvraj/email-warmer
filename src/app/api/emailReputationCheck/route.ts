import { NextRequest, NextResponse } from "next/server";

// Function to check email reputation using Abstract API
const checkEmailReputation = async (email: string) => {
    try {
        // Using Abstract API's email validation service (free tier available)
        const apiKey = process.env.ABSTRACT_API_KEY || 'demo'; // You can get a free API key from https://www.abstractapi.com/email-verification-validation-api
        const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`API Error: ${data.message || 'Unknown error'}`);
        }

        // Calculate reputation score based on API response
        let score = 50; // Base score
        let status = "fair";
        let result = "risky";

        // Check if email is valid
        if (data.is_valid_format?.value === false) {
            score = 0;
            status = "invalid";
            result = "invalid";
        } else {
            // Check deliverability
            if (data.deliverability === "DELIVERABLE") {
                score += 30;
                result = "deliverable";
            } else if (data.deliverability === "UNDELIVERABLE") {
                score -= 30;
                result = "undeliverable";
            }

            // Check disposable email
            if (data.is_disposable_email?.value === true) {
                score -= 25;
            } else {
                score += 10;
            }

            // Check free email
            if (data.is_free_email?.value === true) {
                score += 5;
            } else {
                score += 15; // Business emails get higher score
            }

            // Check role account
            if (data.is_role?.value === true) {
                score -= 10; // Role accounts are less personal
            }

            // Check catch-all domain
            if (data.is_catch_all?.value === true) {
                score -= 15;
            }

            // Check valid MX records
            if (data.has_mx_record?.value === true) {
                score += 10;
            } else {
                score -= 20;
            }

            // Check valid SMTP server
            if (data.smtp_check?.value === true) {
                score += 15;
            } else {
                score -= 15;
            }

            // Normalize score to 0-100 range
            score = Math.max(0, Math.min(100, score));

            // Determine status based on score
            if (score < 30) status = "poor";
            else if (score < 60) status = "fair";
            else if (score < 80) status = "good";
            else status = "excellent";
        }

        return {
            valid: data.is_valid_format?.value !== false,
            score,
            status,
            result,
            details: {
                deliverability: data.deliverability,
                isDisposable: data.is_disposable_email?.value,
                isFreeEmail: data.is_free_email?.value,
                isRole: data.is_role?.value,
                isCatchAll: data.is_catch_all?.value,
                hasMxRecord: data.has_mx_record?.value,
                smtpCheck: data.smtp_check?.value,
                domain: data.domain,
                username: data.username
            }
        };
    } catch (error) {
        console.error("External API error:", error);

        // Fallback to basic validation if API fails
        return fallbackEmailValidation(email);
    }
};

// Fallback validation function
const fallbackEmailValidation = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            valid: false,
            score: 0,
            status: "invalid",
            result: "invalid",
            details: null
        };
    }

    let score = 50;
    const domain = email.split('@')[1]?.toLowerCase();

    // Check for common disposable email domains
    const disposableDomains = [
        'tempmail.org', 'guerrillamail.com', '10minutemail.com',
        'mailinator.com', 'yopmail.com', 'throwaway.email', 'temp-mail.org'
    ];

    if (disposableDomains.some(d => domain?.includes(d))) {
        score -= 30;
    }

    // Check for common business domains
    const businessDomains = [
        'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
        'icloud.com', 'protonmail.com', 'zoho.com'
    ];

    if (businessDomains.includes(domain || '')) {
        score += 20;
    }

    // Check for suspicious patterns
    if (email.includes('test') || email.includes('temp') || email.includes('fake')) {
        score -= 15;
    }

    score = Math.max(0, Math.min(100, score));

    let status = "good";
    if (score < 30) status = "poor";
    else if (score < 60) status = "fair";
    else if (score < 80) status = "good";
    else status = "excellent";

    return {
        valid: true,
        score,
        status,
        result: score >= 60 ? "deliverable" : "risky",
        details: {
            deliverability: score >= 60 ? "DELIVERABLE" : "RISKY",
            isDisposable: disposableDomains.some(d => domain?.includes(d)),
            isFreeEmail: businessDomains.includes(domain || ''),
            isRole: false,
            isCatchAll: false,
            hasMxRecord: true,
            smtpCheck: true,
            domain: domain,
            username: email.split('@')[0]
        }
    };
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { message: "Email is required" },
                { status: 400 }
            );
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { message: "Please provide a valid email address" },
                { status: 400 }
            );
        }

        // Check email reputation using external API
        const result = await checkEmailReputation(email);

        return NextResponse.json({
            email,
            status: result.status,
            score: result.score,
            result: result.result,
            valid: result.valid,
            details: result.details,
            message: `Email reputation: ${result.status} (${result.score}/100)`
        });
    } catch (error) {
        console.error("Email reputation check error:", error);

        return NextResponse.json(
            { message: "Error checking email reputation" },
            { status: 500 }
        );
    }
} 