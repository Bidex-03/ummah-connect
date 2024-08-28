require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const connectDB = require("./config/DBConnect");
const webhookRoute = require("./routes/webhookRoute");

const app = express();

//serve static files

// app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	next();
});

// Stripe webhook parsing middleware
app.use((req, res, next) => {
	if (req.originalUrl === "/api/webhook") {
		next();
	} else {
		express.json()(req, res, next);
	}
});

// Use express.raw for the Stripe webhook route
app.use("/api", express.raw({ type: "application/json" }));

app.use(express.urlencoded({ extended: true })); // parse form data inside the req body

app.use(
	cors({
		origin: [
			"*",
			"http://localhost:5173",
			"https://console.cloudinary.com",
			"https://api.cloudinary.com",
		],
		credentials: true,
		optionSuccessStatus: 200,
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	})
);
app.use(cookieParser());

app.get("/", (req, res) => {
	res.send("UmmahConnect Page");
});

app.use("/auth", require("./routes/authRoute"));
app.use("/content", require("./routes/contentRoute"));
app.use("/api", webhookRoute);
app.use("/discussion", require("./routes/forumRoute"));
app.use("/events", require("./routes/eventRoute"));
app.use("/mentorship", require("./routes/mentorship"));
app.use("/subscribe", require("./routes/subscriptionRoute"));
app.use("/courses", require("./routes/courseRoute"));
// app.use("/enrollments", require("./routes/enrollmentRoute"));
// app.use("/progress", require("./routes/progressRoute"));
app.use("/webinars", require("./routes/webinarRoute"));

const PORT = process.env.PORT || 5000;

connectDB();
mongoose.connection.once("open", () => {
	console.log("Connected to MongoDB");
	app.listen(PORT, console.log(`Server up and running on port ${PORT}`));
});
