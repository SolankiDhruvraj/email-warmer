import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/dbConfig";
import Usr from "@/lib/model/userLoginModel";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
    try {
        // Validate request body
        const body = await request.json();
        const { email, password } = body;

        console.log("Login attempt for email:", email);

        // Input validation
        if (!email || !password) {
            console.log("Missing email or password");
            return NextResponse.json(
                { message: "Email and password are required" },
                { status: 400 }
            );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log("Invalid email format:", email);
            return NextResponse.json(
                { message: "Please provide a valid email address" },
                { status: 400 }
            );
        }

        // Connect to database
        console.log("Connecting to database...");
        await connect();

        // Find user
        console.log("Looking for user with email:", email.toLowerCase().trim());
        const user = await Usr.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            console.log("User not found:", email);
            return NextResponse.json(
                { message: "Invalid email or password" },
                { status: 401 }
            );
        }

        console.log("User found, verifying password...");

        // Verify password
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            console.log("Password mismatch for user:", email);
            return NextResponse.json(
                { message: "Invalid email or password" },
                { status: 401 }
            );
        }

        console.log("Password verified, checking JWT secret...");

        // Check if JWT secret is configured
        const tokenSecret = process.env.TOKEN_SECRET;
        if (!tokenSecret) {
            console.error("TOKEN_SECRET environment variable is not defined");
            return NextResponse.json(
                { message: "Authentication service unavailable" },
                { status: 500 }
            );
        }

        console.log("Creating JWT token...");

        // Create token data
        const tokenData = {
            id: user._id,
            username: user.username,
            email: user.email,
        };

        // Create token
        const token = jwt.sign(tokenData, tokenSecret, {
            expiresIn: "1d",
        });

        console.log("Token created successfully, setting cookie...");

        // Create response
        const response = NextResponse.json(
            {
                message: "Login successful",
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            },
            { status: 200 }
        );

        // Set the cookie
        response.cookies.set("token", token, {
            httpOnly: true,
            path: "/",
            maxAge: 86400,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        console.log("Login successful for user:", email);
        return response;
    } catch (error) {
        console.error("Login error:", error);

        if (error instanceof Error) {
            if (error.message.includes("MONGO_URI")) {
                return NextResponse.json(
                    { message: "Database configuration error" },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
} 