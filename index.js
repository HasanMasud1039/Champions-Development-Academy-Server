const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECURITY_KEY);
const port = process.env.PORT || 5000;

const jwt = require("jsonwebtoken");

// middleware//
app.use(cors());
app.use(express.json());
//Verify token
const verifyJWT = (req, res, next) => {
  const authentication = req.headers.authentication;
  if (!authentication) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authentication.split(" ")[1];

  // verify a token symmetric
  jwt.verify(token, process.env.ACCESS_TOKEN_JWT, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }

    req.decoded = decoded;
    next();
  });
};
//JWT Authentication

app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_JWT, {
    expiresIn: "1h",
  });
  res.send({ token });
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.fznkpfd.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const manageUsersCollection = client
      .db("ChampionsDevelopmentAcademy")
      .collection("manageMdb");
    const instructorsCollection = client
      .db("ChampionsDevelopmentAcademy")
      .collection("instructors");
    const instructorClassCollection = client
      .db("ChampionsDevelopmentAcademy")
      .collection("ClassMdb");

    const userSelectClassCollection = client
      .db("ChampionsDevelopmentAcademy")
      .collection("ClassSelect");

    const paymentUserCollection = client
      .db("ChampionsDevelopmentAcademy")
      .collection("PaymentUser");
    const paymentSuccessfullyCollection = client
      .db("ChampionsDevelopmentAcademy")
      .collection("PaymentSuccessfully");
    const cartCollection = client
      .db("ChampionsDevelopmentAcademy")
      .collection("cart");
    const sponsorCollection = client
      .db("ChampionsDevelopmentAcademy")
      .collection("sponsor");
    const paymentCardCollection = client
      .db("ChampionsDevelopmentAcademy")
      .collection("paymentCards");


    //Verify Super Admin
    const verifySuperAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await manageUsersCollection.findOne(query);

      if (user?.role !== "superAdmin") {
        return res.status(403).send({ error: true, message: "FORBIDDEN user" });
      }
      next();
    };
    //Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await manageUsersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ error: true, message: "FORBIDDEN user" });
      }
      next();
    };

    //verifyInstructors
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await instructorClassCollection.findOne(query);

      if (user?.role !== "instructor") {
        return res.status(403).send({ error: true, message: "FORBIDDEN user" });
      }
      next();
    };

    // users  section
    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })
    //All users for Super Admin
    app.get("/allUsers", verifyJWT, verifySuperAdmin, async (req, res) => {
      const query = { role: { $ne: 'superAdmin' } }; // Use $ne (not equal) to filter users with role not equal to 'superAdmin'
      const result = await manageUsersCollection.find(query).toArray();
      res.send(result);
    });
    //All users for Admin
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: { $ne: 'superAdmin' } }; // Use $ne (not equal) to filter users with role not equal to 'superAdmin'
      const result = await manageUsersCollection.find(query).toArray();
      res.send(result);
    });

    //Get items for users (without authentication)
    app.get("/sponsors", async (req, res) => {
      const result = await sponsorCollection.find().toArray();
      res.send(result);
    });
    app.get("/paymentCards", async (req, res) => {
      const result = await paymentCardCollection.find().toArray();
      res.send(result);
    });
    app.get("/popularInstructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    //Post New User
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await manageUsersCollection.findOne(query);
      if (existingUser) {
        return res.send({
          message: ` ${user.name} already exists in the Champions database`,
        });
      }
      const result = await manageUsersCollection.insertOne(user);
      res.send(result);
    });

    // Student Dashboard

    //All classes
    app.get("/allClasses", async (req, res) => {
      const result = await instructorClassCollection.find().toArray();
      res.send(result);
    });
    //delete class by id by Super Admin
    app.delete("/allClasses/:id", verifySuperAdmin, verifyJWT, async (req, res) => {
      const classId = req.params.id;
      const query = { _id: new ObjectId(classId) };
      const result = await instructorClassCollection.deleteOne(query);
      res.send(result);
    });
    //All classes (greater than zero available seats)
    app.get("/classes/all", async (req, res) => {
      const query = { Status: "approved", availableSeats: { $gt: 0 } };
      const result = await instructorClassCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/classes/all-up", async (req, res) => {
      const classId = req.body.classId; // Access classId from req.body
      const instructorEmail = req.body.instructorEmail // Access classId from req.body
      const className = req.body.className; // Access classId from req.body
      const status = req.body.status; // Access classId from req.body
      const availableSeatsInt = parseInt(req.body.availableSeats); // Access classId from req.body
      const enrolledStudentsInt = parseInt(req.body.enrolledStudents); // Access classId from req.body
      const query = { instructorEmail: instructorEmail, className: className, Status: status };
      const update = {
        // $set: {availableSeats: availableSeatsInt, enrolledStudents: enrolledStudentsInt},
        $inc: { availableSeats: -1, enrolledStudents: 1 }, // Increment enrolledStudents by 1 and decrement availableSeats by 1
      };
      const options = { upsert: true };
      const result = await instructorClassCollection.updateOne(
        query,
        update,
        options
      );

      // Retrieve the updated document after the update
      const updatedDocument = await instructorClassCollection.findOne(query);

      res.send({ result, updatedDocument });
    });

    app.get("/classes/all/manage/classes", async (req, res) => {
      const result = await instructorClassCollection.find().toArray();
      res.send(result);
    });

    app.get("/classes/role/instructor", async (req, res) => {
      const query = { role: { $in: ["admin", "instructor"] } };
      const result = await manageUsersCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/users/popularClass", async (req, res) => {
      const query = { Status: "approved" };
      const result = await instructorClassCollection
        .find(query)
        .sort({ enrolledStudents: -1 }) // Sort by enrolledStudents in descending order
        .limit(6)
        .toArray();

      res.send(result);
    });

    // select/class

    app.get("/select/classes", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(401)
          .send({ error: true, message: "unauthorized access" });
      }

      const query = { email: email };
      const result = await userSelectClassCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/select/classes", async (req, res) => {
      const select = req.body;
      const query = { newId: select.newId, email: select.email };

      const existingSelect = await userSelectClassCollection.findOne(query);
      if (existingSelect) {
        return res.send({
          message: ` already exists in the Selected database`,
        });
      }

      const result = await userSelectClassCollection.insertOne(select);
      res.send(result);
    });
    // Selected class remove

    app.delete("/select/classes/:classId", async (req, res) => {
      const classId = req.params.classId;
      // console.log("deleted id ",classId);
      const query = { _id: new ObjectId(classId) };
      console.log("deleted query id ", classId);
      const result = await userSelectClassCollection.deleteOne(query);
      res.send(result);
      console.log("deleted result ", result);
    });

    // ---------------
    app.get("/users/popular/instructor", async (req, res) => {
      const options = {
        projection: {
          _id: 1,
          instructorEmail: 1,
          instructorName: 1,
          instructorPhoneNumber: 1,
          instructorOPhoto: 1,
        },
      };

      const result = await instructorClassCollection
        .find({})
        .project(options.projection)
        .limit(6)
        .toArray();

      res.send(result);
    });

    //Instructors-class-Admin
    app.get("/classes/instructor", async (req, res) => {
      const query = { role: { $in: ["instructor"] } };
      const result = await manageUsersCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/classes/instructor/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: { $in: [email] } };
      const result = await manageUsersCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/classes/instructor", async (req, res) => {
      const email = req.body.email; // Access email from req.body
      const instructorData = req.body.instructorData; // Access data from req.body
      console.log(email);
      console.log(instructorData.age);

      const query = { email: (email) };
      const update = {
        $set: {
          address: instructorData.address,
          age: instructorData.age,
          category: instructorData.className,
          contact: instructorData.contact,
          description: instructorData.description,
          experience: instructorData.experience,
          imageURL: instructorData.imageURL,
          skill: instructorData.skill
        }
      };
      const options = { upsert: true };
      const result = await manageUsersCollection.updateOne(
        query,
        update,
        options
      );

      // Retrieve the updated document after the update
      const updatedDocument = await instructorClassCollection.findOne(query);

      res.send({ result, updatedDocument });
    });

    app.get("/classes/all/instructors", async (req, res) => {
      const result = await instructorClassCollection.find().toArray();
      res.send(result);
    });

    // handlerDenyd-handlerApproved
    app.patch("/class/approved/:id", async (req, res) => {
      const adminClassApproved = req.params.id;
      const filter = { _id: new ObjectId(adminClassApproved) };

      const updateDoc = {
        $set: {
          Status: "approved",
        },
      };
      const result = await instructorClassCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    app.patch("/class/denied/:id", async (req, res) => {
      const deniedClassApproved = req.params.id;
      const filter = { _id: new ObjectId(deniedClassApproved) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          Status: "denied",
        },
      };
      const result = await instructorClassCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    //admin feedback to instructor
    app.patch("/admin/feedback", async (req, res) => {
      try {
        const feedback = req.body.feedback;
        const feedbackId = req.body._id;
        const instructorEmail = req.body.instructorEmail;
        const className = req.body.className;

        const query = { _id: new ObjectId(feedbackId) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            // _id: feedbackId,
            feedback: feedback,
            instructorEmail: instructorEmail,
            className: className
          },
        };
        const result = await instructorClassCollection.updateOne(
          query,
          updateDoc,
          options
        );
        res.send(result);
      } catch (error) {
        console.log("Error while updating feedback:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/admin/feedback/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { feedback: { $exists: true }, instructorEmail: email };
      const result = await instructorClassCollection.find(query).toArray();
      res.send(result);
    });

    // GET instructor classes by email
    app.get("/users/instructor/class/:email", async (req, res) => {
      const email = req.params.email;
      const query = { instructorEmail: email };
      const result = await instructorClassCollection.find(query).toArray();
      res.send(result);
    });

    //TODO Verify that verifyInstructor,
    app.post("/users/instructor/class", verifyJWT, async (req, res) => {
      const classInfo = req.body;
      const result = await instructorClassCollection.insertOne(classInfo);
      res.send(result);
    });

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      } else {
        try {
          const query = { email: email };
          const user = await manageUsersCollection.findOne(query);
          const result = { instructor: user?.role === "instructor" };
          res.send(result);
        } catch (error) {
          res
            .status(500)
            .send({ error: true, message: "Internal server error" });
        }
      }
    });

    //TODO Verify that
    app.patch("/users/instructors/:id", async (req, res) => {
      const instructorsId = req.params.id;
      const filter = { _id: new ObjectId(instructorsId) };

      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await manageUsersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //make user
    app.patch("/users/:id", async (req, res) => {
      const userId = req.params.id;
      const filter = { _id: new ObjectId(userId) };

      const updateDoc = {
        $unset: {
          role: "",
        },
      };
      const result = await manageUsersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //delete user
    app.delete("/users/:id", async (req, res) => {
      const userId = req.params.id;
      const filter = { _id: new ObjectId(userId) };
      const result = await manageUsersCollection.deleteOne(filter);
      res.send(result);
    });

    //delete instructor class
    app.delete("/users/instructor/class/:id", async (req, res) => {
      const classId = req.params.id;
      const query = { _id: new ObjectId(classId) };
      const result = await instructorClassCollection.deleteOne(query);
      res.send(result);
    });

    //SuperAdmin
    app.get("/users/superAdmin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ superAdmin: false });
      } else {
        try {
          const query = { email: email };
          const user = await manageUsersCollection.findOne(query);
          const result = { superAdmin: user?.role === "superAdmin" };
          res.send(result);
        } catch (error) {
          res
            .status(500)
            .send({ error: true, message: "Internal server error" });
        }
      }
    });

    //admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      } else {
        try {
          const query = { email: email };
          const user = await manageUsersCollection.findOne(query);
          const result = { admin: user?.role === "admin" };
          res.send(result);
        } catch (error) {
          res
            .status(500)
            .send({ error: true, message: "Internal server error" });
        }
      }
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const instructorsId = req.params.id;
      const filter = { _id: new ObjectId(instructorsId) };

      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await manageUsersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Create a PaymentIntent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;

      // Validate the price
      if (!Number.isFinite(price) || price < 1) {
        return res.status(400).json({ error: "Invalid price value" });
      }
      const fPrice = price.toFixed(2);
      const amount = fPrice * 100;

      // Create a PaymentIntent with the order amount and currency
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        return res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        return res
          .status(500)
          .json({ error: "Failed to create payment intent" });
      }
    });

    //payment history

    app.get("/payments/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const sort = { created: -1 }; // Sort by  descending order
      const result = await paymentUserCollection
        .find(query)
        .sort(sort)
        .toArray();
      res.send(result);
    });

    //PaymentIntent history saving api!
    app.post("/payments", verifyJWT, async (req, res) => {
      const paymentInfo = req.body;
      const result = await paymentUserCollection.insertOne(paymentInfo);
      res.send(result);
    });

    //  successfully payment

    app.post("/payments/successfully", verifyJWT, async (req, res) => {
      const successfullyData = req.body;
      const result = await paymentSuccessfullyCollection.insertOne(
        successfullyData
      );
      res.send(result);
    });

    app.get("/payments/successfully/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentSuccessfullyCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/paymentDone", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await paymentSuccessfullyCollection.find().toArray();
      res.send(result);
    });
    //  successfully payment

    // Selected class remove

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Welcome to the Champions Development Academy server side!");
});

app.listen(port, (req, res) => {
  console.log(`Champions server listening on port ${port}`);
});
