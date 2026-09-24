const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const Booking = require("./models/booking");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const flash = require("connect-flash");
const transporter = require("./utils/email");

const app = express();


// =========================
// MONGODB
// =========================

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((err) => {
        console.log("MongoDB connection error:", err);
    });


// =========================
// MIDDLEWARE
// =========================

app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));


app.use(session({
    secret: "salon-secret-key",
    resave: false,
    saveUninitialized: false
}));


app.use(flash());


// =========================
// FLASH MESSAGES
// =========================

app.use((req, res, next) => {

    res.locals.success = req.flash("success");

    res.locals.error = req.flash("error");

    next();

});


// =========================
// VIEW ENGINE
// =========================

app.set("view engine", "ejs");


// =========================
// LOGIN MIDDLEWARE
// =========================

function isLogin(req, res, next) {

    if (req.session.userId) {

        next();

    } else {

        req.flash(
            "error",
            "Please login to continue."
        );

        res.redirect("/login");

    }

}


// =========================
// ADMIN MIDDLEWARE
// =========================

function isAdmin(req, res, next) {

    if (req.session.isAdmin) {

        next();

    } else {

        req.flash(
            "error",
            "Please login as an administrator."
        );

        res.redirect("/admin-login");

    }

}


// =========================
// HOME
// =========================

app.get("/", (req, res) => {

    res.render("index", {
        userName: req.session.userName
    });

});


// =========================
// LOGIN PAGE
// =========================

app.get("/login", (req, res) => {

    res.render("login");

});


// =========================
// LOGIN
// =========================

app.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;


        const user = await User.findOne({
            email: email
        });


        if (!user) {

            req.flash(
                "error",
                "User not found."
            );

            return res.redirect("/login");

        }


        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {

            req.flash(
                "error",
                "Incorrect password."
            );

            return res.redirect("/login");

        }


        // Login successful
        req.session.userId = user._id;

        req.session.userName = user.name;


        req.flash(
            "success",
            "Welcome back!"
        );


        res.redirect("/");


    } catch (error) {

        console.log(error);

        req.flash(
            "error",
            "Login error. Please try again."
        );

        res.redirect("/login");

    }

});


// =========================
// LOGOUT
// =========================

app.get("/logout", (req, res) => {

    req.flash(
        "success",
        "You have been logged out."
    );


    req.session.userId = null;

    req.session.userName = null;


    res.redirect("/");

});
// =========================
// SIGN UP PAGE
// =========================

app.get("/signup", (req, res) => {
    res.render("signup");
});



// =========================
// SIGN UP
// SEND VERIFICATION CODE
// =========================

app.post("/signup", async (req, res) => {

    const { name, email, password } = req.body;


    try {

        // Check if email already exists
        const existingUser = await User.findOne({
            email: email
        });


        if (existingUser) {

            req.flash(
                "error",
                "An account with this email already exists. Please sign in."
            );

            return res.redirect("/signup");

        }


        // Generate 6-digit verification code
        const verificationCode = Math.floor(
            100000 + Math.random() * 900000
        ).toString();


        // Save signup information temporarily
        req.session.signupName = name;

        req.session.signupEmail = email;

        req.session.signupPassword = password;

        req.session.signupVerificationCode =
            verificationCode;


        // Code expires in 1 minute
        req.session.signupVerificationCodeExpires =
            Date.now() + 1 * 60 * 1000;


        // Send verification email
        await transporter.sendMail({

            from:
                `"Ingram Cut Hair Studio" <${process.env.EMAIL}>`,

            to: email,

            subject:
                "Verify Your INGRAM Cut Hair Studio Account",

            html: `

                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: auto;
                    padding: 30px;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                ">

                    <h1 style="text-align: center;">
                        INGRAM CUT HAIR STUDIO
                    </h1>

                    <h2 style="text-align: center;">
                        Verify Your Account
                    </h2>

                    <p>
                        Hello ${name},
                    </p>

                    <p>
                        Thank you for creating an account
                        with INGRAM Cut Hair Studio.
                    </p>

                    <p>
                        Your verification code is:
                    </p>

                    <h1 style="
                        text-align: center;
                        letter-spacing: 8px;
                        font-size: 36px;
                    ">
                        ${verificationCode}
                    </h1>

                    <p style="text-align: center;">

                        <strong>
                            This code will expire in 1 minute.
                        </strong>

                    </p>

                    <p>
                        If you did not create this account,
                        you can ignore this email.
                    </p>

                    <p>
                        Thank you,<br>

                        <strong>
                            INGRAM Cut Hair Studio
                        </strong>
                    </p>

                </div>

            `

        });


        res.redirect("/signup-verification");


    } catch (error) {

        console.log(error);

        req.flash(
            "error",
            "Something went wrong while creating your account."
        );

        res.redirect("/signup");

    }

});


// =========================
// SIGN UP VERIFICATION PAGE
// =========================

app.get("/signup-verification", (req, res) => {

    res.render("signup-verification");

});


// =========================
// VERIFY SIGN UP CODE
// =========================

app.post("/signup-verification", async (req, res) => {

    const { code } = req.body;


    try {

        // Check signup session
        if (
            !req.session.signupEmail ||
            !req.session.signupVerificationCode
        ) {

            req.flash(
                "error",
                "Your signup session has expired. Please sign up again."
            );

            return res.redirect("/signup");

        }


        // Check verification code
        if (
            code !== req.session.signupVerificationCode
        ) {

            req.flash(
                "error",
                "Incorrect verification code."
            );

            return res.redirect("/signup-verification");

        }


        // Check expiration
        if (
            Date.now() >
            req.session.signupVerificationCodeExpires
        ) {

            req.flash(
                "error",
                "Your verification code has expired. Please sign up again."
            );

            return res.redirect("/signup");

        }


        // =========================
        // CREATE USER
        // =========================

        const hashedPassword = await bcrypt.hash(
            req.session.signupPassword,
            10
        );


        const user = new User({

            name: req.session.signupName,

            email: req.session.signupEmail,

            password: hashedPassword

        });


        await user.save();


        // =========================
        // LOG USER IN
        // =========================

        req.session.userId = user._id;

        req.session.userName = user.name;


        // =========================
        // DELETE TEMPORARY DATA
        // =========================

        delete req.session.signupName;

        delete req.session.signupEmail;

        delete req.session.signupPassword;

        delete req.session.signupVerificationCode;

        delete req.session.signupVerificationCodeExpires;


        // =========================
        // SUCCESS
        // =========================

        req.flash(
            "success",
            "Account created successfully! Welcome to My Salon."
        );


        res.redirect("/");


    } catch (error) {

        console.log(error);

        req.flash(
            "error",
            "Something went wrong while verifying your account."
        );

        res.redirect("/signup-verification");

    }

});


// =========================
// BOOKING PAGE
// =========================

app.get("/booking", isLogin, (req, res) => {

    res.render("booking");

});


// =========================
// CREATE BOOKING
// =========================

app.post("/booking", isLogin, async (req, res) => {

    try {

        const booking = await Booking.create({

            name: req.body.name,

            email: req.body.email,

            phone: req.body.phone,

            service: req.body.service,

            date: req.body.date,

            time: req.body.time

        });


        // Send booking email
        await transporter.sendMail({

            from:
                `"Ingram Cut Hair Studio" <${process.env.EMAIL}>`,

            to: booking.email,

            subject: "Salon Booking Received",

            text: `Hello ${booking.name},

Your salon appointment has been received.

Service: ${booking.service}
Date: ${booking.date}
Time: ${booking.time}

Your booking status is currently: ${booking.status}

We will contact you when your appointment is confirmed.

Thank you!`

        });


        req.flash(
            "success",
            "Your appointment has been received successfully!"
        );


        res.redirect("/booking-success");


    } catch (error) {

        console.log(error);

        req.flash(
            "error",
            "Something went wrong while booking your appointment."
        );

        res.redirect("/booking");

    }

});


// =========================
// BOOKING SUCCESS
// =========================

app.get("/booking-success", isLogin, (req, res) => {

    res.render("booking-success");

});


// =========================
// ADMIN LOGIN PAGE
// =========================

app.get("/admin-login", (req, res) => {

    res.render("admin-login");

});


// =========================
// ADMIN LOGIN
// =========================

app.post("/admin-login", (req, res) => {

    const { email, password } = req.body;


   if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
) {

        req.session.isAdmin = true;


        req.flash(
            "success",
            "Welcome to the admin dashboard."
        );


        res.redirect("/bookings");


    } else {

        req.flash(
            "error",
            "Incorrect admin email or password."
        );

        res.redirect("/admin-login");

    }

});


// =========================
// ADMIN DASHBOARD
// =========================

app.get("/bookings", isAdmin, async (req, res) => {

    try {

        const { status, search } = req.query;


        let filter = {};


        // Filter by status
        if (status) {

            filter.status = status;

        }


        // Search by name or email
        if (search) {

            filter.$or = [

                {
                    name: {
                        $regex: search,
                        $options: "i"
                    }
                },

                {
                    email: {
                        $regex: search,
                        $options: "i"
                    }
                }

            ];

        }


        const bookings = await Booking.find(filter);


        res.render("bookings", {

            bookings,

            selectedStatus: status || "",

            search: search || ""

        });


    } catch (error) {

        console.log(error);

        req.flash(
            "error",
            "Error loading bookings."
        );

        res.redirect("/admin-login");

    }

});


// =========================
// EDIT BOOKING PAGE
// =========================

app.get(
    "/bookings/:id/edit",
    isAdmin,
    async (req, res) => {

        try {

            const booking =
                await Booking.findById(req.params.id);


            if (!booking) {

                req.flash(
                    "error",
                    "Booking not found."
                );

                return res.redirect("/bookings");

            }


            res.render("edit-booking", {
                booking: booking
            });


        } catch (error) {

            console.log(error);

            req.flash(
                "error",
                "Error loading booking."
            );

            res.redirect("/bookings");

        }

    }
);


// =========================
// UPDATE BOOKING
// =========================

app.post(
    "/bookings/:id/edit",
    isAdmin,
    async (req, res) => {

        try {

            await Booking.findByIdAndUpdate(
                req.params.id,
                {
                    name: req.body.name,
                    email: req.body.email,
                    phone: req.body.phone,
                    service: req.body.service,
                    date: req.body.date,
                    time: req.body.time
                }
            );


            req.flash(
                "success",
                "Booking updated successfully."
            );


            res.redirect("/bookings");


        } catch (error) {

            console.log(error);

            req.flash(
                "error",
                "Unable to update booking."
            );

            res.redirect("/bookings");

        }

    }
);


// =========================
// CONFIRM BOOKING
// =========================

app.post(
    "/bookings/:id/confirm",
    isAdmin,
    async (req, res) => {

        try {

            const booking =
                await Booking.findById(req.params.id);


            if (!booking) {

                req.flash(
                    "error",
                    "Booking not found."
                );

                return res.redirect("/bookings");

            }


            if (booking.status === "Confirmed") {

                req.flash(
                    "error",
                    "This booking is already confirmed."
                );

                return res.redirect("/bookings");

            }


            booking.status = "Confirmed";

            await booking.save();


            await transporter.sendMail({

                from:
                    `"Ingram Cut Hair Studio" <${process.env.EMAIL}>`,

                to: booking.email,

                subject:
                    "Your INGRAM Cut Hair Studio Appointment Is Confirmed",

                html: `

                    <div style="
                        font-family: Arial, sans-serif;
                        max-width: 600px;
                        margin: auto;
                        padding: 30px;
                    ">

                        <h1 style="text-align: center;">
                            INGRAM CUT HAIR STUDIO
                        </h1>

                        <h2 style="text-align: center;">
                            Appointment Confirmed ✓
                        </h2>

                        <p>
                            Hello ${booking.name},
                        </p>

                        <p>
                            Your appointment has been
                            successfully confirmed.
                        </p>

                        <hr>

                        <h3>
                            Appointment Details
                        </h3>

                        <p>
                            <strong>Service:</strong>
                            ${booking.service}
                        </p>

                        <p>
                            <strong>Date:</strong>
                            ${booking.date}
                        </p>

                        <p>
                            <strong>Time:</strong>
                            ${booking.time}
                        </p>

                        <p>
                            <strong>Status:</strong>
                            Confirmed
                        </p>

                        <hr>

                        <h3>
                            Studio Location
                        </h3>

                        <p>
                            INGRAM Cut Hair Studio<br>
                            Ogoh Street Off Evueta,
                            Close to Celestial Church,
                            Ughelli, Delta State.
                        </p>

                        <p>
                            <strong>Opening Hours:</strong><br>
                            Monday – Sunday<br>
                            10:00 AM – 8:00 PM
                        </p>

                        <hr>

                        <p>
                            Thank you for choosing
                            INGRAM Cut Hair Studio.
                        </p>

                        <p>
                            <strong>
                                We look forward to seeing you!
                            </strong>
                        </p>

                    </div>

                `

            });


            req.flash(
                "success",
                "Booking confirmed successfully."
            );


            res.redirect("/bookings");


        } catch (error) {

            console.log(error);

            req.flash(
                "error",
                "Unable to confirm booking."
            );

            res.redirect("/bookings");

        }

    }
);


// =========================
// CANCEL BOOKING
// =========================

app.post(
    "/bookings/:id/cancel",
    isAdmin,
    async (req, res) => {

        try {

            const booking =
                await Booking.findById(req.params.id);


            if (!booking) {

                req.flash(
                    "error",
                    "Booking not found."
                );

                return res.redirect("/bookings");

            }


            booking.status = "Cancelled";

            await booking.save();


            await transporter.sendMail({

                from:
                    `"Ingram Cut Hair Studio" <${process.env.EMAIL}>`,

                to: booking.email,

                subject:
                    "Your Salon Appointment Has Been Cancelled",

                text: `Hello ${booking.name},

Unfortunately, your salon appointment has been cancelled.

Service: ${booking.service}
Date: ${booking.date}
Time: ${booking.time}

Please contact us if you would like to book another appointment.

Thank you.`

            });


            req.flash(
                "success",
                "Booking cancelled successfully."
            );


            res.redirect("/bookings");


        } catch (error) {

            console.log(error);

            req.flash(
                "error",
                "Unable to cancel booking."
            );

            res.redirect("/bookings");

        }

    }
);


// =========================
// COMPLETE BOOKING
// =========================

app.post(
    "/bookings/:id/complete",
    isAdmin,
    async (req, res) => {

        try {

            const booking =
                await Booking.findById(req.params.id);


            if (!booking) {

                req.flash(
                    "error",
                    "Booking not found."
                );

                return res.redirect("/bookings");

            }


            booking.status = "Completed";

            await booking.save();


            await transporter.sendMail({

                from:
                    `"Ingram Cut Hair Studio" <${process.env.EMAIL}>`,

                to: booking.email,

                subject:
                    "Your Salon Appointment Is Complete",

                text: `Hello ${booking.name},

Your salon appointment has been completed.

Service: ${booking.service}
Date: ${booking.date}
Time: ${booking.time}

Thank you for choosing our salon.

We look forward to seeing you again.`

            });


            req.flash(
                "success",
                "Booking marked as completed."
            );


            res.redirect("/bookings");


        } catch (error) {

            console.log(error);

            req.flash(
                "error",
                "Unable to complete booking."
            );

            res.redirect("/bookings");

        }

    }
);


// =========================
// DELETE BOOKING
// =========================

app.post(
    "/bookings/:id",
    isAdmin,
    async (req, res) => {

        try {

            await Booking.findByIdAndDelete(
                req.params.id
            );


            req.flash(
                "success",
                "Booking deleted successfully."
            );


            res.redirect("/bookings");


        } catch (error) {

            console.log(error);

            req.flash(
                "error",
                "Unable to delete booking."
            );

            res.redirect("/bookings");

        }

    }
);


// =========================
// CUSTOMER BOOKING STATUS PAGE
// =========================

app.get(
    "/booking-status",
    isLogin,
    (req, res) => {

        res.render("booking-status");

    }
);


// =========================
// CHECK BOOKING STATUS
// =========================

app.post(
    "/booking-status",
    isLogin,
    async (req, res) => {

        try {

            const booking =
                await Booking.findOne({
                    email: req.body.email
                });


            if (!booking) {

                req.flash(
                    "error",
                    "No booking found with that email."
                );

                return res.redirect("/booking-status");

            }


            res.render(
                "booking-results",
                {
                    booking: booking
                }
            );


        } catch (error) {

            console.log(error);

            req.flash(
                "error",
                "Unable to check booking status."
            );

            res.redirect("/booking-status");

        }

    }
);


// =========================
// SERVER
// =========================

app.listen(3000, () => {

    console.log(
        "Salon Booking App is running on port 3000"
    );

});