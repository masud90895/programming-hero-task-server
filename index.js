const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
//gitignore
require("dotenv").config();
const port = process.env.PORT || 5000;

// used Middleware
app.use(cors());
// backend to client data sent
app.use(express.json());

//jwt token
const secretKey = process.env.SECRET_KEY;

// Connect With MongoDb Database
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Create a async function to all others activity
async function run() {
  try {
    // Create Database to store Data
    const userCollection = client.db("programmingHeroTask").collection("users");
    const billCollection = client.db("programmingHeroTask").collection("bills");

    // user registration
    app.post("/api/registration", async (req, res) => {
      const { firstName, lastName, email, password } = req.body;

      const encryptedPassword = await bcrypt.hash(password, 10);
      console.log(encryptedPassword);
      try {
        const oldUser = await userCollection.findOne({ email: email });

        if (oldUser) {
          return res.json({ error: "User Exists" });
        }
        await userCollection.insertOne({
          firstName,
          lastName,
          email,
          password: encryptedPassword,
        });
        res.send({ status: "ok" });
      } catch (error) {
        res.send({ status: "error" });
      }
    });

    // user login
    app.post("/api/login", async (req, res) => {
      const { email, password } = req.body;

      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.json({ error: "User Not found" });
      }
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ email: user.email }, secretKey, {
          expiresIn: "7d",
        });

        if (res.status(201)) {
          return res.json({ status: "ok", data: token });
        } else {
          return res.json({ error: "error" });
        }
      }
      res.json({ status: "error", error: "InvAlid Password" });
    });

    // get user data

    app.post("/api/getUserData", async (req, res) => {
      const { token } = req.body;
      try {
        const user = jwt.verify(token, secretKey, (err, res) => {
          if (err) {
            return "token expired";
          }
          return res;
        });
        console.log(user);
        if (user == "token expired") {
          return res.send({ status: "error", data: "token expired" });
        }

        const useremail = user.email;
        userCollection
          .findOne({ email: useremail })
          .then((data) => {
            res.send({ status: "ok", data: data });
          })
          .catch((error) => {
            res.send({ status: "error", data: error });
          });
      } catch (error) {}
    });

    // post bills

    app.post("/api/add-billing", async (req, res) => {
      const generatingId = new ObjectId().toString();

      const { fullName, email, phone, amount, time, AddedUserEmail } = req.body;
      const addedData = {
        generatingId,
        fullName,
        email,
        phone,
        amount,
        time,
        AddedUserEmail,
      };
      const result = await billCollection.insertOne(addedData)
      if(result.insertedId){
        res.send({
          success: true,
          message : `Success Created ${req.body.fullName}`
        })
      }
      else{
        res.send({success: false, message: "Can't insert bill"})
      }
    });


    // get all bills
    app.get("/api/billing-list/:search", async (req, res) => {
      const search = req.params.search;
      let result
      if(search === ""){
        const result = await billCollection.find({}).sort({time:-1}).toArray();
        res.send(result);
      }else{
        result = await billCollection.find({
          $or: [
             { fullName: { $regex: search, $options: "i" } },
             { email: { $regex: search, $options: "i" } },
             { phone: { $regex: search, $options: "i" } }
          ],
       }).sort({time:-1}).toArray();
       return res.send(result);
      }
     
    });







  } finally {
    // await client.close();
  }
}

// Call the function you decleare abobe
run().catch(console.dir);

// Root Api to check activity
app.get("/", (req, res) => {
  res.send("Hello From server!");
});

app.listen(port, () => console.log(`Server up and running ${port}`));
