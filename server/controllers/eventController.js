const User = require("../models/authModel");
const { Event, Ticket } = require("../models/eventModel");
const { check, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const StripeCustomer = require("../models/StripeCustomerModel");
const clientUrl = process.env.FRONTEND_URL;


const validateCreateEvent = [
  check("title").not().isEmpty().withMessage("Title is required"),
  check("description").not().isEmpty().withMessage("Description is required"),
  check("date").isISO8601().toDate().withMessage("Valid date is required"),
  check("location").not().isEmpty().withMessage("Location is required"),
  check("limit")
    .isInt({ min: 1 })
    .withMessage("Limit must be a positive integer"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Create an event
const createEvent = async (req, res) => {
  const {
    title,
    subTitle,
    description,
    date,
    location,
    trending,
    photo,
    limit,
    tickets,
  } = req.body;

  try {
    const ticket = new Ticket({
      price: tickets.price,
      quantity: limit,
      sold: tickets.sold || 0
    });
    const createdTicket = await ticket.save();

    const event = new Event({
      title,
      subTitle,
      description,
      date,
      location,
      organizer: req.user._id,
      trending: trending || false,
      photo,
      limit,
      tickets: createdTicket._id,
    });
    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all events
const getEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("organizer", "name")
      .populate("attendees", "name");
    res.json(events);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get single event
const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("organizer", "name")
      .populate("attendees", "name");

    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an event
const updateEvent = async (req, res) => {
  const { title, subTitle, description, date, location } = req.body;
  try {
    const event = await Event.findById(req.params.id);
    if (event) {
      event.title = title || event.title;
      event.subTitle = subTitle || event.subTitle;
      event.description = description || event.description;
      event.date = date || event.date;
      event.location = location || event.location;

      const updatedEvent = await event.save();
      res.json(updatedEvent);
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an event
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (event) {
      await event.deleteOne();
      res.json({ message: "Event removed" });
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// RSVP to an event
const rsvpEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (event) {
      if (!event.attendees.includes(req.user._id)) {
        event.attendees.push(req.user._id);
        await event.save();
        res.json({ message: "RSVP successful" });
      } else {
        res.status(400).json({ message: "Already RSVPed" });
      }
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Fetch upcoming events
const upcomingEvents = async (req, res) => {
  try {
    const upcomingEvents = await Event.find()
      .where("date")
      .gt(Date.now())
      .exec();
    res.status(200).json(upcomingEvents);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Fetch past events
const pastEvents = async (req, res) => {
  try {
    const pastEvents = await Event.find().where("date").lte(Date.now()).exec();

    for (let event of pastEvents) {
      if (event.trending) {
        event.trending = false;
        await event.save();
      }
    }
    res.status(200).json(pastEvents);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Fetch trending events
const trendingEvents = async (req, res) => {
  try {
    console.log("Fetching trending events...");
    const trendingEvents = await Event.find({ trending: true }).exec();
    console.log("Trending events found:", trendingEvents);
    res.status(200).json(trendingEvents);
  } catch (error) {
    console.error("Error fetching trending events:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getEventWithTicketById = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findById(id).populate("tickets");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const buyTicket = async (req, res) => {
  const { eventId } = req.params;
  const { quantity, paymentOption } = req.body;
  const userId = req.user._id;

  try {
    // Find the event by ID and populate ticket details
    const event = await Event.findById(eventId).populate("tickets");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Find the ticket associated with the event
    const ticket = await Ticket.findById(event.tickets);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if enough tickets are available
    if (ticket.quantity < quantity) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    // Decrease the ticket quantity
    ticket.quantity -= quantity;
    ticket.sold += quantity;
    await ticket.save();

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.bookedEvents.push(eventId);
    await user.save();

    event.attendees.push(userId);
    await event.save();

    if (paymentOption === "stripe") {
      try {


        const line_items = [
          {
            price_data: {
              currency: "USD",
              product_data: {
                name: event.title,
              },
              unit_amount: Math.round(course.price * 100),
            },
            quantity,
          },
        ];

        let stripeCustomer = await StripeCustomer.findOne({ userId });
        if (!stripeCustomer) {
          const customer = await stripe.customers.create({
            email: user.emailAddress,
          });
          stripeCustomer = await StripeCustomer.create({
            userId,
            stripeCustomerId: customer.id,
          });
        }

        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomer.stripeCustomerId,
          line_items,
          mode: "payment",
          success_url: `${clientUrl}/success`,
          cancel_url: `${clientUrl}/cancel`,
          metadata: {
            courseId,
            userId: userId.toString(),
          },
        });

        res.json({ url: session.url });
      } catch (error) {
        console.error("[PURCHASE_COURSE]", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.emailAddress,
      subject: "Ticket Purchase Confirmation",
      text: `As salam 'alaekum Dear ${user.firstName} 🤗,
    
      Thank you for purchasing ${quantity} ticket(s) for the event "${
        event.title
      }".
    
      Event Details:
      ---------------
      Title: ${event.title}
      Description: \t${event.subTitle}
      Date: ${new Date(event.date).toLocaleString()}
      Location: ${event.location}
    
      Your Ticket Information:
      -------------------------
      Quantity: ${quantity}
    
      We appreciate your support and look forward to seeing you at the event.
    
      Ma' salam,
      The UmmahConnect Event Team
    `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(200).json({ message: "Ticket purchased and email sent" });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrganizerById = async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }
    res.status(200).json(organizer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTicketsSold = async (req, res) => {
  const { eventId } = req.params;

  try {
    // Find the event by ID
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get the number of sold tickets from the event's ticket schema
    const ticketsSold = event.tickets.sold;

    res.status(200).json({ ticketsSold });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  upcomingEvents,
  pastEvents,
  trendingEvents,
  buyTicket,
  getOrganizerById,
  getTicketsSold,
  getEventWithTicketById,

  validateCreateEvent,
};
