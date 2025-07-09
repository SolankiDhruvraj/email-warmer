import mongoose from "mongoose";

let isConnected = false;

const connect = async () => {
  if (isConnected) {
    console.log("Using existing database connection");
    return;
  }

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is not defined");
  }

  try {
    await mongoose.connect(mongoUri);
    isConnected = true;

    const connection = mongoose.connection;

    connection.on("connected", () => {
      console.log("Connected to database");
    });

    connection.on("error", (error) => {
      console.error("Database connection error:", error);
      isConnected = false;
    });

    connection.on("disconnected", () => {
      console.log("Database disconnected");
      isConnected = false;
    });

    console.log("Database connection established");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    isConnected = false;
    throw error;
  }
};

export default connect;
