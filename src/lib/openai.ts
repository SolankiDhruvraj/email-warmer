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

export default callOpenAiApi; 