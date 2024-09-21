const express = require("express");
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  validateCreateEvent,
  upcomingEvents,
  pastEvents,
  trendingEvents,
  buyTicket,
  getOrganizerById,
  getTicketsSold,
  getEventWithTicketById,
} = require("../controllers/eventController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router
  .route("/")
  .post(protect, validateCreateEvent, createEvent)
  .get(getEvents);

router.get("/upcoming", upcomingEvents);
router.get("/past", pastEvents);
router.get("/trending-events", trendingEvents);
router.get("/:id/ticket", getEventWithTicketById);

router.post("/buy-ticket/:eventId", protect, buyTicket);
router.get("/organizer/:id", getOrganizerById);
router.get("/:eventId/tickets-sold", getTicketsSold);

router
  .route("/:id")
  .get(protect, getEvent)
  .put(protect, adminOnly, updateEvent)
  .delete(protect, adminOnly, deleteEvent);

router.route("/:id/rsvp").post(protect, rsvpEvent);

module.exports = router;
