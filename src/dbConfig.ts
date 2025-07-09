import mongoose from "mongoose";
const connect = async () => {
  try {
    mongoose.connect(process.env.MONGO_URI!);
    const connection = mongoose.connection;

    connection.on("connected", () => {
      console.log("Connected to database");
    });

    connection.on("error", (error) => {
      console.log("Error connecting to database", error);
    });
  } catch (error: any) {
    console.error("Error:", error.message);
  }
};

export default connect;
