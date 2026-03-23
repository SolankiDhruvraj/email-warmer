import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const getUserIdFromToken = async (request: NextRequest) => {
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
