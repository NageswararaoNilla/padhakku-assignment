const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "users.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// User Sign-Up API

app.post("/register/", async (req, res) => {
  const { username, email } = req.body;
  let addUserQuery;
  const selectUser = `
    SELECT * FROM user WHERE email = '${email}';`;
  const dbUser = await db.get(selectUser);

  if (dbUser === undefined) {
    if (email.endsWith("@gmail.com")) {
      addUserQuery = `
        INSERT INTO
        user ( username, email )
        VALUES (
            '${username}', 
            '${email}'
            );`;
      await db.run(addUserQuery);
      res.send("Successful user sign-up.");
    } else {
      res.status(400);
      res.send("Invalid email format.");
    }
  } else {
    res.status(400);
    res.send("Email already registered.");
  }
});
