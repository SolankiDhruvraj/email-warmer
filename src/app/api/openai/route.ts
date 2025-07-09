import { NextRequest, NextResponse } from "next/server";

const callOpenAiApi = async (prompt: string): Promise<string> => {
    if (!prompt || prompt.trim().length === 0) {
        throw new Error("Prompt is required");
    }

    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) {
        throw new Error("OpenAI API key not configured");
    }

    const apiBody = {
        model: "gpt-3.5-turbo-0125",
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant.",
            },
            {
                role: "user",
                content: prompt.trim(),
            },
        ],
        temperature: 0,
        max_tokens: 20,
        top_p: 1.0,
        frequency_penalty: 0.0,
    };

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(apiBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const generatedContent = data.choices?.[0]?.message?.content;

        if (!generatedContent) {
            throw new Error("No content generated from OpenAI");
        }

        console.log("Generated Content:", generatedContent);
        return generatedContent;
    } catch (error) {
        console.error("OpenAI API error:", error);
        throw error;
    }
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt } = body;

        if (!prompt || prompt.trim().length === 0) {
            return NextResponse.json(
                { message: "Prompt is required" },
                { status: 400 }
            );
        }

        const result = await callOpenAiApi(prompt);
        return NextResponse.json({ content: result });
    } catch (error) {
        console.error("OpenAI route error:", error);

        if (error instanceof Error) {
            if (error.message.includes("API key not configured")) {
                return NextResponse.json(
                    { message: "OpenAI service unavailable" },
                    { status: 500 }
                );
            }

            if (error.message.includes("OpenAI API error")) {
                return NextResponse.json(
                    { message: "OpenAI service error" },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            { message: "Failed to generate content" },
            { status: 500 }
        );
    }
} 