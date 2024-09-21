const Course = require("../models/courseModel");
const nodemailer = require("nodemailer");
const User = require("../models/authModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const Event = require("../models/eventModel")



const generateStripeAccountLink = async (req, res) => {
	try {

		const user = req.user

		let stripeAccountId = user.stripeAccountId;

		if (!stripeAccountId) {
			// Create a new account if it doesn't exist
			const account = await stripe.accounts.create({
				type: "express",
				country: "US", // Change as needed
				email: user.email,
				capabilities: {
					card_payments: { requested: true },
					transfers: { requested: true },
				},
			});

			stripeAccountId = account.id;
			user.stripeAccountId = stripeAccountId;
			await user.save();
		}

		const accountLink = await stripe.accountLinks.create({
			account: stripeAccountId,
			refresh_url: `${process.env.FRONTEND_URL}/generate-stripe-link`,
			return_url: `${process.env.FRONTEND_URL}/complete-stripe-link`,
			type: "account_onboarding",
		});

		res.json({ url: accountLink.url });
	} catch (error) {
		console.error("[GENERATE_STRIPE_ACCOUNT_LINK]", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const completeStripeConnectOnboarding = async (req, res) => {
	try {
		const user = req.user
		// const userId = user._id;

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		if (!user.stripeAccountId) {
			return res
				.status(400)
				.json({ message: "No Stripe account found for this user" });
		}

		// Retrieve the account to check its status
		const account = await stripe.accounts.retrieve(user.stripeAccountId);

		if (account.details_submitted) {
			// The account setup is complete
			user.stripeOnboardingComplete = true;
			await user.save();

			res.json({ message: "Stripe account setup completed successfully" });
		} else {
			// The account setup is not complete
			res.status(400).json({ message: "Stripe account setup is not complete" });
		}
	} catch (error) {
		console.error("[COMPLETE_STRIPE_CONNECT_ONBOARDING]", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const handleStripeWebhook = async (req, res) => {
	try {
		console.log("running...........")
		const { body, headers } = req;
		const signature = headers["stripe-signature"];

		let event;
		try {
			event = stripe.webhooks.constructEvent(
				body,
				signature,
				process.env.STRIPE_WEBHOOK_SECRET
			);
		} catch (error) {
			console.log(error);
			return res.status(400).send(`Webhook Error: ${error.message}`);
		}

		const session = event.data.object;
		const userId = session?.metadata?.userId;
		const courseId = session?.metadata?.courseId;

		const user = await User.findById(userId);


		if (event.type === "checkout.session.completed") {
			const course = await Course.findById(courseId);
			const instructor = await User.findById(course.instructor);

			if (!instructor.stripeAccountId) {
				console.error("Instructor has no connected Stripe account");
				return res
					.status(400)
					.send("Instructor has no connected Stripe account");
			}

			const totalAmountCents = session.amount_total;
			const totalAmountDollars = totalAmountCents / 100;
			const platformFeeCents = Math.round(totalAmountCents * 0.1);
			const instructorAmountCents = totalAmountCents - platformFeeCents;
			const instructorAmountDollars = instructorAmountCents / 100;

			// Transfer funds to instructor's Stripe account
			try {
				const transfer = await stripe.transfers.create({
					amount: instructorAmountCents,
					currency: session.currency,
					destination: instructor.stripeAccountId,
					transfer_group: session.id,
				});

				// Record the transaction for the instructor (payout)
				instructor.transactions.push({
					type: "balanceTransfer",
					amount: instructorAmountDollars,
					courseId: course._id,
					stripeTransactionId: transfer.id,
					status: "success",
				});
				await instructor.save();
			} catch (error) {
				console.error("Failed to transfer funds to instructor:", error);
				return res.status(500).send("Failed to transfer funds to instructor");
			}

			// Record the transaction for the student (purchase)
			user.transactions.push({
				type: "purchase",
				amount: totalAmountDollars,
				courseId: course._id,
				stripeTransactionId: session.id,
				status: "completed",
			});

			// Update course and user
			course.purchasedBy.push({ user: userId, amount: totalAmountDollars });
			await course.save();

			user.enrolledCourses.push({
				course: courseId,
				lastStudiedAt: new Date(),
			});
			await user.save();

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
				subject: "Course Enrollment Confirmation",
				text: `As salam 'alaekum Dear ${user.firstName} 🤗,

      Thank you for enrolling in the course "${course.title}".

      Course Details:
      ---------------
      Title: ${course.title}
      Description: ${course.description}
      Duration: ${course.duration}

      We appreciate your interest and are excited to have you in the course.

      Ma' salam,
      The UmmahConnect Education Team`,
			};

			// Send email
			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					return res.status(500).json({ message: error.message });
				}
			});

		} else if (
			event.type === "payout.paid" ||
			event.type === "payout.failed" ||
			event.type === "payout.pending" ||
			event.type === "payout.updated"
		) {
			const payout = event.data.object;
			const status = payout.status;
			const payoutId = payout.id;

			// Find the user with the transaction that has the payout ID
			const user = await User.findOne({
				"transactions.stripeTransactionId": payoutId,
			});

			if (user) {
				// Find the existing transaction
				const existingTransaction = user.transactions.find(
					(transaction) => transaction.stripeTransactionId === payoutId
				);

				if (existingTransaction) {
					// Update the existing transaction
					existingTransaction.status = status;
				} else {
					console.log("No existing transaction found, this shouldn't happen.");
				}

				await user.save();
			} else {
				console.log(`No user found with payout ID: ${payoutId}`);
			}
		} else {
			return res
				.status(200)
				.send(`Webhook Error: Unhandled event type ${event.type}`);
		}

		res.status(200).send();
	} catch (error) {
		console.error("[HANDLE_STRIPE_WEBHOOK]", error);
		res.status(500).send("Internal server error");
	}
};

const getPayoutDetails = async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId);

		if (!user.stripeAccountId) {
			return res
				.status(400)
				.json({ message: "No Stripe account found for this user" });
		}

		// Retrieve the balance from Stripe
		const balance = await stripe.balance.retrieve({
			stripeAccount: user.stripeAccountId,
		});

		// Get the available balance in the default currency (usually USD)
		const availableBalance =
			balance.available.find((bal) => bal.currency === "usd").amount / 100;

		// Retrieve the default bank account (assuming the user has set one up)
		const bankAccounts = await stripe.accounts.listExternalAccounts(
			user.stripeAccountId,
			{ object: "bank_account", limit: 1 }
		);

		let bankAccount = null;
		if (bankAccounts.data.length > 0) {
			const { last4, bank_name } = bankAccounts.data[0];
			bankAccount = { last4, bank_name };
		}
		// console.log(availableBalance, bankAccount)

		res.json({ availableBalance, bankAccount });
	} catch (error) {
		console.error("[GET_PAYOUT_DETAILS]", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const initiatePayout = async (req, res) => {
	try {
		const userId = req.user._id;
		const { amount } = req.body;
		const user = await User.findById(userId);

		if (!user.stripeAccountId) {
			return res
				.status(400)
				.json({ message: "No Stripe account found for this user" });
		}

		// Create a payout
		const payout = await stripe.payouts.create(
			{
				amount: Math.round(amount * 100), // Convert to cents
				currency: "usd",
			},
			{
				stripeAccount: user.stripeAccountId,
			}
		);

		user.transactions.push({
			type: "payout",
			amount: payout.amount / 100, // Convert cents to dollars
			stripeTransactionId: payout.id,
			status: "initiated",
			createdAt: new Date(payout.created * 1000), // Convert Unix timestamp to Date
		});

		await user.save();

		// console.log("payout initiated", payout);

		res.json({ message: "Payout initiated successfully", payoutId: payout.id });
	} catch (error) {
		console.error("[INITIATE_PAYOUT]", error);
		res.status(500).json({ message: "Failed to initiate payout" });
	}
};

const getTransactionHistory = async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId).populate("transactions.courseId");

		res.json(user.transactions);
	} catch (error) {
		console.error("[GET_TRANSACTION_HISTORY]", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

const eventPaymentHook = async (req, res) => {
	try {
		console.log("running...........")
		const { body, headers } = req;
		const signature = headers["stripe-signature"];

		let event;
		try {
			event = stripe.webhooks.constructEvent(
				body,
				signature,
				process.env.STRIPE_WEBHOOK_SECRET
			);
		} catch (error) {
			console.log(error);
			return res.status(400).send(`Webhook Error: ${error.message}`);
		}

		const session = event.data.object;
		const userId = session?.metadata?.userId;
		const eventId = session?.metadata?.eventId;

		const user = await User.findById(userId);

		if (event.type === "checkout.session.completed") {
			const event = await Event.findById(eventId);
			const organizer = await User.findById(event.organizer);

			if (!organizer.stripeAccountId) {
				console.error("Oganizer has no connected Stripe account");
				return res
					.status(400)
					.send("Organizer has no connected Stripe account");
			}

			const totalAmountCents = session.amount_total;
			const totalAmountDollars = totalAmountCents / 100;
			const platformFeeCents = Math.round(totalAmountCents * 0.1);
			const organizerAmountCents = totalAmountCents - platformFeeCents;
			const organizerAmountDollars = organizerAmountCents / 100;

			// Transfer funds to instructor's Stripe account
			try {
				const transfer = await stripe.transfers.create({
					amount: instructorAmountCents,
					currency: session.currency,
					destination: organizer.stripeAccountId,
					transfer_group: session.id,
				});

				organizer.transactions.push({
					type: "balanceTransfer",
					amount: organizerAmountDollars,
					eventId: event._id,
					stripeTransactionId: transfer.id,
					status: "success",
				});
				await organizer.save();
			} catch (error) {
				console.error("Failed to transfer funds to instructor:", error);
				return res.status(500).send("Failed to transfer funds to instructor");
			}

			user.transactions.push({
				type: "purchase",
				amount: totalAmountDollars,
				eventId: event._id,
				stripeTransactionId: session.id,
				status: "completed",
			});

			event.attendees.push({ user: userId, amount: totalAmountDollars });
			await event.save();

			user.bookedEvents.push({
				course: eventId,
			});
			await user.save();
		} else if (
			event.type === "payout.paid" ||
			event.type === "payout.failed" ||
			event.type === "payout.pending" ||
			event.type === "payout.updated"
		) {
			const payout = event.data.object;
			const status = payout.status;
			const payoutId = payout.id;

			// Find the user with the transaction that has the payout ID
			const user = await User.findOne({
				"transactions.stripeTransactionId": payoutId,
			});

			if (user) {
				// Find the existing transaction
				const existingTransaction = user.transactions.find(
					(transaction) => transaction.stripeTransactionId === payoutId
				);

				if (existingTransaction) {
					// Update the existing transaction
					// If there is any
					existingTransaction.status = status;
				} else {
					console.log("No existing transaction found, this shouldn't happen.");
				}

				await user.save();
			} else {
				console.log(`No user found with payout ID: ${payoutId}`);
			}
		} else {
			return res
				.status(200)
				.send(`Webhook Error: Unhandled event type ${event.type}`);
		}

		res.status(200).send();

	} catch (error) {
		console.error("[HANDLE_STRIPE_WEBHOOK]", error);
		res.status(500).send("Internal server error");
	}

}

module.exports = {
	generateStripeAccountLink,
	completeStripeConnectOnboarding,
	handleStripeWebhook,
	getPayoutDetails,
	initiatePayout,
	getTransactionHistory,
	eventPaymentHook
};