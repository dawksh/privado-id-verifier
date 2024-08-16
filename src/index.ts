import express from "express";
import { config } from "dotenv";

config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.listen(PORT, () => {
    console.log("Server Listening on PORT: ", PORT);
})

