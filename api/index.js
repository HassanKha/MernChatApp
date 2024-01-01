import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserModel } from "./models/User.js";
import Jwt from "jsonwebtoken";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import ws from "ws";
import { MessageModel } from "./models/Message.js";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const _dirname = path.resolve();

const bcryptSalt = bcrypt.genSaltSync(10);
const app = express();
app.use(express.static(path.join(_dirname,'/my-project/dist')));
app.use(bodyParser.json());
app.use(cookieParser());
const corsOptions = {
  origin: ['https://chatapp-aaww.onrender.com', 'http://localhost:5173'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use('/uploads', express.static(__dirname + '/uploads'));


async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies.token;

    if (token) {
      try {
        const user = Jwt.verify(token, process.env.JWT_SECRET);

        const { userId, username } = user;
        resolve(user);
      } catch (error) {
        throw err;
      }
    } else {
      reject("no token");
    }
  });
}

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const user = await getUserDataFromRequest(req);
  const ourUserId = user.userId;
  const messages = await MessageModel.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  })
    .sort({ createdAt: 1 })
    .exec();

  res.json(messages);
});

app.get("/people", async (req, res) => {
  const users = await UserModel.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.get("/profile", (req, res) => {
  const token = req.cookies.token;

  if (token) {
    try {
      const user = Jwt.verify(token, process.env.JWT_SECRET);

      const { userId, username } = user;
      res.json({
        userId,
        username,
      });
    } catch (error) {
      throw err;
    }
  } else {
    res.status(401).json({
      error: "Unauthorized",
    });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const foundUser = await UserModel.findOne({ username });

  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);

    if (passOk) {
      const token = Jwt.sign(
        { userId: foundUser._id, username },
        process.env.JWT_SECRET
      );
      console.log(foundUser);
      res
        .cookie("token", token, { sameSite: "none", secure: true })
        .status(201)
        .json({
          id: foundUser._id,
        });
    }
  }
});

app.post("/logout", async (req, res) => {
  res.cookie("token", "", { sameSite: "none", secure: true }).json("ok");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashpass = bcrypt.hashSync(password, bcryptSalt);
  try {
    const createdUser = await UserModel.create({
      username,
      password: hashpass,
    });

    // Use 'jwt.sign' instead of 'Jwt.sign'
    const token = Jwt.sign(
      { userId: createdUser._id, username },
      process.env.JWT_SECRET
    );

    // Set the token as a cookie
    res
      .cookie("token", token, { sameSite: "none", secure: true })
      .status(201)
      .json({
        id: createdUser._id,
      });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const server = app.listen(3000, () => {
  console.log("server is runing on port 3000");
});

mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

const wss = new ws.Server({ server });
wss.setMaxListeners(0);

function notifyonline() {
  [...wss.clients].forEach((client) => {
    client.send(
      JSON.stringify({
        online: [...wss.clients].map((c) => ({
          userId: c.userId,
          username: c.username,
        })),
      })
    );
  });
}
wss.on("connection", (connection, req) => {
  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyonline();
    }, 1000);
  }, 5000);

  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  const cookies = req.headers.cookie;
  if (cookies) {
    const TC = cookies.split(";").find((str) => str.startsWith("token="));
    if (TC) {
      const token = TC.split("=")[1];
      if (token) {
        try {
          const user = Jwt.verify(token, process.env.JWT_SECRET);
          const { userId, username } = user;
          connection.userId = userId;
          connection.username = username;
        } catch (error) {
          throw error;
        }
      }
    }
  }

  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    console.log(messageData);

    const { recipient, text ,file} = messageData.message;
   
   
    let filename = null;
    if (file) {
      console.log('size', file.data.length);
      const parts = file.name.split('.');
      const ext = parts[parts.length - 1];
      filename = Date.now() + '.'+ext;
      const path = __dirname + '/uploads/' + filename;
      const bufferData = new Buffer(file.data.split(',')[1], 'base64');
      fs.writeFile(path, bufferData, () => {
        console.log('file saved:'+path);
      });
    }
   
    
    if (recipient && (text || file)) {
      const MessageDoc = await MessageModel.create({
        sender: connection.userId,
        recipient,
        text,
        file:file ? filename : null
      });

      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text,
              recipient,
              sender: connection.username,
              file: file ? filename : null,
              id: MessageDoc._id,
            })
          )
        );
    }
  });

  // notify everyone about online people when someone connects
  [...wss.clients].forEach((client) => {
    client.send(
      JSON.stringify({
        online: [...wss.clients].map((c) => ({
          userId: c.userId,
          username: c.username,
        })),
      })
    );
  });

  wss.on("close", (data) => {});
});
