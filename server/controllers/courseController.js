const Course = require("../models/courseModel");
const Progress = require("../models/progressModel");
const Webinar = require("../models/webinarModel");
const nodemailer = require("nodemailer");

const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/authModel");
const StripeCustomer = require("../models/StripeCustomerModel");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const clientUrl = process.env.FRONTEND_URL;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

exports.uploadFilesToCloudinary = async (files) => {
	const uploadedFiles = {};

	for (const [key, fileArray] of Object.entries(files)) {
		uploadedFiles[key] = [];
		for (const file of fileArray) {
			const result = await cloudinary.uploader.upload_stream(
				{ resource_type: "auto" },
				(error, result) => {
					if (error) {
						console.error("Cloudinary upload error:", error);
						return;
					}
					uploadedFiles[key].push(result.secure_url);
				}
			);
			file.stream.pipe(result);
		}
	}
	return uploadedFiles;
};

exports.getAllCourses = async (req, res) => {
	try {
		const courses = await Course.find();
		res.json(courses);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

exports.getPaginatedCourses = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		const totalCourses = await Course.countDocuments();
		const totalPages = Math.ceil(totalCourses / limit);

		const courses = await Course.find()
			.skip(skip)
			.limit(limit)
			.select("title description coverImage duration price")
			.populate({
				path: "instructor",
				select: "firstName lastName photo", // Select instructor details you want to include
			})
			.lean();

		res.json({
			courses,
			currentPage: page,
			totalPages,
			totalCourses,
		});
	} catch (error) {
		console.error("Error fetching courses:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.getCourseById = async (req, res) => {
	try {
		const course = await Course.findById(req.params.id).populate({
			path: "instructor",
			select: "firstName lastName photo", // Select instructor details you want to include
		});
		if (!course) return res.status(404).json({ message: "Course not found" });
		res.json(course);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

exports.createCourse = async (req, res) => {
	try {
		const { title, description, price, duration, coverImage, chapters } =
			req.body;

		const user = req.user;

		const parsedChapters = JSON.parse(chapters);

		console.log(parsedChapters);

		const course = new Course({
			title,
			description,
			price,
			instructor: user._id,
			duration,
			coverImage,
			chapters: parsedChapters,
		});

		const newCourse = await course.save();
		res.status(201).json(newCourse);
	} catch (err) {
		console.log("[Error_Creating_Course]", err);
		res.status(400).json({ message: err.message });
	}
};

exports.updateCourse = async (req, res) => {
	try {
		const course = await Course.findById(req.params.id);
		if (!course) {
			return res.status(404).json({ message: "Course not found" });
		}

		course.title = req.body.title || course.title;
		course.description = req.body.description || course.description;
		course.instructor = req.body.instructor || course.instructor;
		course.duration = req.body.duration || course.duration;
		course.coverImage = req.body.coverImage || course.coverImage;

		if (req.body.chapters) {
			const parsedChapters = JSON.parse(req.body.chapters);

			const updatedChapters = await Promise.all(
				parsedChapters.map(async (chapter, index) => {
					const chapterFiles = req.files[`chapter${index}`] || {};
					const uploadedFiles = await exports.uploadFilesToCloudinary(
						chapterFiles
					);

					return {
						...chapter,
						article: uploadedFiles.article || [],
						video: uploadedFiles.video || [],
						audio: uploadedFiles.audio || [],
					};
				})
			);

			course.chapters = updatedChapters;
		}

		const updatedCourse = await course.save();
		res.json(updatedCourse);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

exports.deleteCourse = async (req, res) => {
	try {
		const deletedCourse = await Course.findByIdAndDelete(req.params.id);
		if (!deletedCourse)
			return res.status(404).json({ message: "Course not found" });
		res.json({ message: "Course deleted successfully" });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

exports.searchCourses = async (req, res) => {
	const { query } = req.query;
	try {
		const courses = await Course.find({
			$or: [
				{ title: { $regex: query, $options: "i" } },
				{ description: { $regex: query, $options: "i" } },
			],
		});
		res.json(courses);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

exports.getCoursesByInstructor = async (req, res) => {
	const { instructorId } = req.params;
	try {
		const courses = await Course.find({ instructor: instructorId });
		res.json(courses);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

exports.getCourseStatistics = async (req, res) => {
	try {
		const totalCourses = await Course.countDocuments();
		res.json({ totalCourses });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

exports.addReview = async (req, res) => {
	const { userId, rating, comment } = req.body;
	try {
		const course = await Course.findById(req.params.id);
		if (!course) return res.status(404).json({ message: "Course not found" });

		course.reviews.push({ userId, rating, comment });
		await course.save();
		res.status(201).json(course);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

exports.enrollCourse = async (req, res) => {
	try {
		const userId = req.user._id;
		const courseId = req.params.courseId;

		// Find the course by its ID
		const course = await Course.findById(courseId);
		const instructor = await User.findById(course.instructor);

		if (!course) {
			return res.status(404).json({ message: "Course not found" });
		}

		// Check if the user is already enrolled in the course
		const user = await User.findById(userId);
		if (
			user.enrolledCourses.some(
				(enrollment) => enrollment.course.toString() === courseId
			)
		) {
			return res
				.status(403)
				.json({ message: "User is already enrolled in this course" });
		}

		if (course.price === 0) {
			// Enroll the user in the free course
			course.purchasedBy.push({ user: userId, amount: 0 });
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
			try {
				await transporter.sendMail(mailOptions);

				return res.status(200).json({
					message: "Enrollment successful and confirmation email sent",
				});
			} catch (error) {
				console.log(error);
				return res.status(400).json({ error: error.message });
			}
		}

		if (!instructor.stripeOnboardingComplete) {
			return res.status(403).json({
				message: "Instructor has not setup stripe to receive payments",
			}); 

		}

		const line_items = [
			{
				price_data: {
					currency: "USD",
					product_data: {
						name: course.title,
					},
					unit_amount: Math.round(course.price * 100),
				},
				quantity: 1,
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

		// Create checkout session
		const session = await stripe.checkout.sessions.create({
			customer: stripeCustomer.stripeCustomerId,
			line_items,
			mode: "payment",
			success_url: `${clientUrl}/study/${courseId}?success=1`,
			cancel_url: `${clientUrl}/course-info/${courseId}?cancelled=1`,
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
};

exports.getEnrolledCourses = async (req, res) => {
	try {
		const userId = req.user._id; // Assuming you have middleware that sets userId from the authenticated token

		const user = await User.findById(userId).populate({
			path: "enrolledCourses.course",
			select: "title description coverImage duration chapters", // Select the fields you want to include
			populate: {
				path: "instructor",
				select: "firstName lastName photo", // Select instructor details you want to include
			},
		});

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const enrolledCourses = user.enrolledCourses.map((enrollment) => {
			const course = enrollment.course;
			return {
				_id: course._id,
				title: course.title,
				description: course.description,
				coverImage: course.coverImage,
				duration: course.duration,
				instructor: course.instructor,
				lastStudiedAt: enrollment.lastStudiedAt,
				chapters: course.chapters,
				progress:
					(course.chapters.filter((chapter) =>
						chapter.completedBy.includes(userId)
					).length /
						course.chapters.length) *
					100,
				totalChapters: course.chapters.length,
				completedChapters: course.chapters.filter((chapter) =>
					chapter.completedBy.includes(userId)
				).length,
			};
		});

		res.json(enrolledCourses);
	} catch (error) {
		console.error("Error fetching enrolled courses:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.completeChapter = async (req, res) => {
	try {
		const userId = req.user._id; // Assuming you have middleware that sets userId from the authenticated token
		const { courseId, chapterIndex } = req.params;

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const course = await Course.findById(courseId);
		if (!course) {
			return res.status(404).json({ message: "Course not found" });
		}

		// Check if the user is enrolled in the course
		const enrollment = user.enrolledCourses.find(
			(e) => e.course.toString() === courseId
		);
		if (!enrollment) {
			return res
				.status(403)
				.json({ message: "User is not enrolled in this course" });
		}

		// Update the chapter completion status
		if (chapterIndex >= 0 && chapterIndex < course.chapters.length) {
			if (course.chapters[chapterIndex].completedBy.includes(userId)) {
				return res.status(400).json({ message: "Chapter already completed" });
			}
			course.chapters[chapterIndex].completedBy.push(userId);
			await course.save();

			// Update user's enrollment progress
			if (!enrollment.completedChapters.includes(Number(chapterIndex))) {
				enrollment.completedChapters.push(Number(chapterIndex));
				enrollment.progress =
					(enrollment.completedChapters.length / course.chapters.length) * 100;
				enrollment.lastStudiedAt = new Date();
				await user.save();
			}

			if (enrollment.progress === 100) {
				const purchasedByIndex = course.purchasedBy.findIndex(
					(purchase) => purchase.user.toString() === userId
				);
				if (purchasedByIndex !== -1) {
					course.purchasedBy[purchasedByIndex].completedCourseAt = new Date();
				}
				await course.save();
			}

			res.json({
				message: "Chapter marked as complete",
				progress: enrollment.progress,
			});
		} else {
			res.status(400).json({ message: "Invalid chapter index" });
		}
	} catch (error) {
		console.error("Error updating chapter completion:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.generateCertificate = async (req, res) => {
	try {
		const progress = await Progress.findOneAndUpdate(
			{
				userId: req.params.userId,
				courseId: req.params.courseId,
				completed: true,
			},
			{ certificateUrl: req.body.certificateUrl },
			{ new: true }
		);
		res.json(progress);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

exports.getAllWebinar = async (req, res) => {
	try {
		const webinars = await Webinar.find();
		res.json(webinars);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

exports.getSingleWebinar = async (req, res) => {
	try {
		const webinar = await Webinar.findById(req.params.id);
		res.json(webinar);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

exports.createWebinar = async (req, res) => {
	const webinar = new Webinar({
		title: req.body.title,
		description: req.body.description,
		instructor: req.body.instructor,
		date: req.body.date,
		url: req.body.url,
	});

	try {
		const newWebinar = await webinar.save();
		res.status(201).json(newWebinar);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

exports.updateWebinar = async (req, res) => {
	try {
		const webinar = await Webinar.findById(req.params.id);
		if (!webinar) {
			return res.status(404).json({ message: "Webinar not found" });
		}

		webinar.title = req.body.title || webinar.title;
		webinar.description = req.body.description || webinar.description;
		webinar.instructor = req.body.instructor || webinar.instructor;
		webinar.date = req.body.date || webinar.date;
		webinar.url = req.body.url || webinar.url;

		const updatedWebinar = await webinar.save();
		res.json(updatedWebinar);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

exports.deleteWebinar = async (req, res) => {
	try {
		const webinar = await Webinar.findById(req.params.id);
		if (!webinar) {
			return res.status(404).json({ message: "Webinar not found" });
		}

		await webinar.remove();
		res.json({ message: "Webinar deleted successfully" });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};
