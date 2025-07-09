import nodemailer, { SendMailOptions } from "nodemailer";
import cron from "node-cron";
import callOpenAI from "./openai";
import User from "./model/userModel";
import connect from "./dbConfig";

/* Emails will be sent every hour at a randomly chosen minute within the hour until it reaches its defined maximum capacity. After reaching this limit, the task will cease execution. 
1. Mails will be sent from Monday to Friday
*/

const sendScheduledEmails = async (email: string, appPass: string) => {
  if (!email || !appPass) {
    throw new Error("Email and app password are required");
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Please provide a valid email address");
  }

  const mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: appPass,
    },
  });

  try {
    // Connect to database
    await connect();

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, emails: [] });
      await user.save();
    }

    const allusers = await User.find({ email: { $ne: email } });
    allusers.forEach(async (existingUser) => {
      if (existingUser && !user.emails.includes(existingUser.email)) {
        user.emails.push(existingUser.email);
      }
    });

    await user.save();

    const scheduleTask = () => {
      const randomMinutes = Math.floor(Math.random() * 60);
      console.log("-----Random Minutes (Sender)-------", randomMinutes);
      const cronExpression = `${randomMinutes} 10-17 * * 1-5`;

      cron.schedule(cronExpression, async () => {
        try {
          if (user.dailyMailCount > user.maxDailyMailCount) {
            console.log("Daily mail limit reached");
            return;
          }

          const allUsers = await User.find({ email: { $ne: email } });
          if (allUsers.length === 0) {
            console.log("No other users found for email sending");
            return;
          }

          const recipientUser = allUsers[user.currentEmailIndex % allUsers.length];

          const openAIResult = await callOpenAI(
            `Give me a random business email and do not include words which are considered as spam and the recipient shoud be ${recipientUser.email}`
          );

          const match = openAIResult.match(/Subject: (.*?)(?=\n|$)/);
          const subject = match ? match[1] : "Business Inquiry";
          const emailContentWithoutSubject = openAIResult.replace(
            /Subject: (.*?)(?=\n|$)/,
            ""
          );

          // Check if sender's email is not already present in the recipient's 'emails' array
          if (
            !recipientUser.emails.includes(email) &&
            email !== recipientUser.email
          ) {
            recipientUser.emails.push(email);
            await recipientUser.save();
          }

          const mailDetails: SendMailOptions = {
            from: email,
            to: recipientUser.email,
            subject: subject,
            text: emailContentWithoutSubject,
          };

          await mailTransporter.sendMail(mailDetails);

          user.currentEmailIndex += 1;
          if (user.currentEmailIndex >= allUsers.length) {
            user.currentEmailIndex = 0;
          }

          user.dailyMailCount += 1;
          user.emailsSent += 1;

          await user.save();
          console.log(`Email sent to ${recipientUser.email}`);
        } catch (error) {
          console.error("Error in scheduled email task:", error);
        }
      });
    };

    scheduleTask();

    // Everyday at midnight the daily mail count will reset
    cron.schedule("0 0 * * *", async () => {
      try {
        user.dailyMailCount = 0;
        user.maxDailyMailCount += user.dailyMailIncrease;
        await user.save();
        scheduleTask();
        console.log("Daily mail count reset and new schedule created");
      } catch (error) {
        console.error("Error resetting daily mail count:", error);
      }
    });

    console.log("Email scheduling started successfully");
  } catch (error) {
    console.error("Error in sendScheduledEmails:", error);
    throw error;
  }
};

export default sendScheduledEmails;
