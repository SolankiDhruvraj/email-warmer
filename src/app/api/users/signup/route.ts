import { NextRequest, NextResponse } from "next/server";
import connect from "@/lib/dbConfig";
import Usr from "@/lib/model/userLoginModel";
import bcryptjs from "bcryptjs";

export async function POST(request: NextRequest) {
    try {
        // Validate request body
        const body = await request.json();
        const { username, email, password } = body;

        // Input validation
        if (!username || !email || !password) {
            return NextResponse.json(
                { message: "Username, email, and password are required" },
                { status: 400 }
            );
        }

        if (username.length < 3) {
            return NextResponse.json(
                { message: "Username must be at least 3 characters long" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { message: "Password must be at least 6 characters long" },
                { status: 400 }
            );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { message: "Please provide a valid email address" },
                { status: 400 }
            );
        }

        // Connect to database
        await connect();

        // Check if user already exists
        const existingUser = await Usr.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { message: "User with this email already exists" },
                { status: 409 }
            );
        }

        // Hash password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        // Create new user
        const newUser = new Usr({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
        });

        await newUser.save();

        return NextResponse.json(
            { message: "User created successfully" },
            { status: 201 }
        );
    } catch (error) {
        console.error("Signup error:", error);

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