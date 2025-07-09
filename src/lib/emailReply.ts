import Imap from "imap";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import cron from "node-cron";
import User from "./model/userModel";
import callOpenAI from "./openai";
import { inspect } from "util";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";

interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    tlsOptions: object;
}

const getEmails = async (email: string, appPass: string): Promise<void> => {
    if (!email || !appPass) {
        throw new Error("Email and app password are required");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error("Please provide a valid email address");
    }

    const imapConfig: ImapConfig = {
        user: email,
        password: appPass,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
    };

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: email,
            pass: appPass,
        },
    });

    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log("User not found in the database.");
            return;
        }

        const scheduleTask = () => {
            const randomMinutes = Math.floor(Math.random() * 60);
            console.log("-----Random Minutes (Receiver)-------", randomMinutes);
            const cronExpression = `${randomMinutes} 10-17 * * 1-5`;

            cron.schedule(cronExpression, async () => {
                try {
                    const imap = new Imap(imapConfig);

                    imap.once("ready", (): void => {
                        imap.openBox("INBOX", false, (): void => {
                            if (!user.emails || user.emails.length === 0) {
                                console.log("No sender emails configured for monitoring");
                                imap.end();
                                return;
                            }

                            user.emails.forEach(async (senderEmail: string) => {
                                imap.search(
                                    ["UNSEEN", ["FROM", senderEmail]],
                                    (err: Error, results: number[]): void => {
                                        if (err) {
                                            console.error("IMAP search error:", err);
                                            return;
                                        }

                                        if (results.length === 0) {
                                            console.log(`No unread messages from ${senderEmail}`);
                                            return;
                                        }

                                        user.emailsReceived += results.length;
                                        const f = imap.fetch(results, { bodies: "" });

                                        f.on("message", (msg: any): void => {
                                            msg.on("body", (stream: any): void => {
                                                simpleParser(
                                                    stream,
                                                    async (err: Error, parsed: any): Promise<void> => {
                                                        if (err) {
                                                            console.error("Email parsing error:", err);
                                                            return;
                                                        }

                                                        if (
                                                            parsed &&
                                                            parsed.attributes &&
                                                            parsed.attributes.uid
                                                        ) {
                                                            const markFlags = ["\\Flag"];
                                                            imap.addFlags(
                                                                parsed.attributes.uid,
                                                                markFlags,
                                                                (): void => {
                                                                    console.log(
                                                                        `Marked as important: ${inspect(markFlags)}`
                                                                    );
                                                                }
                                                            );
                                                        }

                                                        // Send automatic reply
                                                        try {
                                                            const openAIResult = await callOpenAI(
                                                                `Generate a reply to: ${parsed.subject} and recipient is ${senderEmail} and do not include words which are considered as spam.`
                                                            );
                                                            const emailContentWithoutSubject =
                                                                openAIResult.replace(
                                                                    /Subject: (.*?)(?=\n|$)/,
                                                                    ""
                                                                );

                                                            const replyMailDetails = {
                                                                from: email,
                                                                to: senderEmail,
                                                                subject: "Re: " + parsed.subject,
                                                                text: emailContentWithoutSubject,
                                                            };

                                                            transporter.sendMail(
                                                                replyMailDetails,
                                                                (error: Error | null, info: any): void => {
                                                                    if (error) {
                                                                        console.error(
                                                                            "Error sending automatic reply:",
                                                                            error
                                                                        );
                                                                    } else {
                                                                        user.emailsSent += 1;
                                                                        console.log(
                                                                            "Automatic reply sent:",
                                                                            info.response
                                                                        );
                                                                    }
                                                                }
                                                            );
                                                        } catch (openAIError) {
                                                            console.error("OpenAI error in email reply:", openAIError);
                                                        }
                                                    }
                                                );
                                            });

                                            msg.once("attributes", (attrs: any): void => {
                                                const { uid } = attrs;
                                                imap.addFlags(uid, ["\\Seen"], (): void => {
                                                    console.log("Marked as read!");
                                                });
                                            });
                                        });

                                        f.once("error", (ex: Error): void => {
                                            console.error("Fetch error:", ex);
                                            imap.end();
                                        });

                                        f.once("end", (): void => {
                                            console.log(
                                                `Done fetching unread messages from ${senderEmail}`
                                            );
                                        });
                                    }
                                );
                            });
                        });
                    });

                    imap.once("error", (err: Error): void => {
                        console.error("IMAP error:", err);
                    });

                    imap.once("end", (): void => {
                        console.log("Connection ended");
                    });

                    imap.connect();
                } catch (ex) {
                    console.error("An error occurred in email monitoring:", ex);
                }

                try {
                    await user.save();
                } catch (saveError) {
                    console.error("Error saving user data:", saveError);
                }
            });
        };

        scheduleTask();

        // Everyday at midnight the daily mail count will reset
        cron.schedule("0 0 * * *", (): void => {
            scheduleTask();
        });

        console.log("Email reply monitoring started successfully");
    } catch (error) {
        console.error("Error in getEmails:", error);
        throw error;
    }
};

export default getEmails; 