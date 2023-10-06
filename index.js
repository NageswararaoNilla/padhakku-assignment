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

// login


app.post("/login/", async (req, res) => {
  const { username, email } = req.body;
  const selectUser = `
     SELECT * FROM user WHERE email = '${email}';`;
  const dbUser = await db.get(selectUser);
  if (dbUser === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_CODE");
      res.send({ jwtToken });
  }
});


// Authentication

const authenticateToken = async (req, res, next) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_CODE", async (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        req.username = payload.username;
        next();
      }
    });
  }
};

// Create Post API

app.post("/user/post/", authenticateToken, async (req, res) => {
  const { username } = req;
  const { post } = req.body;
  const getUserId = `SELECT user_id FROM user WHERE username = '${username}';`;
  const { user_id } = await db.get(getUserId);
  if (user_id !== undefined) {
    if (post !== "") {
      const createPostQuery = `
    INSERT INTO 
      post (post, user_id)
    VALUES ('${post}', ${user_id}); `;
      await db.run(createPostQuery);
      res.send("Successfully created.");
    } else {
      res.status(400);
      res.send("Content cannot be empty.");
    }
  } else {
    res.status(404);
    res.send("User ID not found.");
  }
});

// Delete Post

app.delete("/post/:postId/", authenticateToken, async (req, res) => {
  const { username } = req;
  const { postId } = req.params;
  const getUserId = `SELECT user_id FROM user WHERE username = '${username}';`;
  const { user_id } = await db.get(getUserId);
  const deletePostQuery = ` 
  DELETE FROM post
  WHERE 
    user_id = ${user_id}
    AND post_id = ${postId};`;
  const getPostQuery = `
    SELECT * FROM post
    WHERE 
      user_id = ${user_id} 
      AND post_id = ${postId};`;
  const postData = await db.get(getPostQuery);
  //console.log(tweetData);
  if (postData === undefined) {
    res.status(404);
    res.send("Post ID not found.");
  } else {
    await db.run(deletePostQuery);
    res.send("Successful post deletion.");
  }
});


// get user posts


app.get("/user/posts/", authenticateToken, async (req, res) => {
  const { username } = req;
  const getUserId = `SELECT user_id FROM user WHERE username = '${username}';`;
  const { user_id } = await db.get(getUserId);
  if (user_id !== undefined) {
    const getPostsQuery = `
    SELECT *
    FROM post
    WHERE user_id = ${user_id};`;
    const postsData = await db.all(getPostsQuery);
    if (postsData === [] ) {
        res.status(401);
        res.send("No posts found for this user.");
    } else {
        res.send(postsData);
    }
  } else {
        res.status(404);
        res.send("User ID not found.");
    }
});



module.exports app;