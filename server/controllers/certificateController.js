const dotenv = require("dotenv");
const Certificate = require("../models/certificateModel");
const { default: axios } = require("axios");
const pinataSDK = require("@pinata/sdk");
dotenv.config();
const { Readable } = require("stream");
const User = require("../models/authModel");
const Course = require("../models/courseModel");

const pinata = new pinataSDK(
	process.env.PINATA_API_KEY,
	process.env.PINATA_SECRET_API_KEY
);

const createCertificate = async (req, res) => {
	try {
		const { courseId } = req.params;
		const { certificateId, cloudinaryUrl } = req.body;
		const userId = req.user._id;
		// console.log(req.body);
		// console.log(req.body);

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const course = await Course.findById(courseId);
		if (!course) {
			return res.status(404).json({ message: "Course not found" });
		}
		if (!certificateId) {
			return res.status(400).json({ message: "Certificate ID is required" });
		}
		if (!cloudinaryUrl) {
			return res.status(400).json({ message: "cloudinaryUrl is required" });
		}

		const existingCertificate = await Certificate.findOne({
			student: userId,
			course: courseId,
		});

		if (existingCertificate) {
			return res
				.status(400)
				.json({ message: "Certificate already exists for this course" });
		}

		const certificate = await Certificate.create({
			student: userId,
			course: courseId,
			certificateId: certificateId,
			cloudinaryUrl: cloudinaryUrl,
			date: new Date(),
		});

		// console.log(certificate);

		res
			.status(201)
			.json({ message: "Certificate created successfully", certificate });
	} catch (error) {
		console.error("Error creating certificate:", error);
		res.status(500).json({ message: "Server error" });
	}
};

const prepareCertificateData = async (req, res) => {
	try {
		const { courseTitle, studentName } = req.body;
		// console.log(req.body);
		const { courseId } = req.params;
		const userId = req.user._id;

		const existingCertificate = await Certificate.findOne({
			student: userId,
			course: courseId,
		});

		if (!existingCertificate)
			return res
				.status(404)
				.json({ success: false, message: "Certificate not found" });

		if (existingCertificate && existingCertificate.isUploadedToIPFS) {
			if (existingCertificate.isMinted) {
				return res.status(400).json({
					success: false,
					message: "Certificate already minted",
				});
			}
			if (!existingCertificate.isMinted) {
				return res.json({
					success: true,
					tokenURI: existingCertificate.tokenURI,
				});
			}
		}

		const response = await axios.get(existingCertificate.cloudinaryUrl, {
			responseType: "arraybuffer",
		});
		const imageBuffer = Buffer.from(response.data, "binary");

		// Create a readable stream from the buffer
		const stream = Readable.from(imageBuffer);

		// Upload image to IPFS via Pinata
		const imageResult = await pinata.pinFileToIPFS(stream, {
			pinataMetadata: {
				name: `${courseTitle}_certificate.png`,
			},
			pinataOptions: {
				cidVersion: 0,
			},
		});
		const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageResult.IpfsHash}`;

		// Create metadata
		const metadata = {
			name: `${courseTitle} Certificate`,
			description: `Certificate for ${studentName}`,
			image: imageUrl,
			attributes: [
				{ trait_type: "Course", value: courseTitle },
				{ trait_type: "Student", value: studentName },
				{
					trait_type: "Completion Date",
					value: existingCertificate.date.toISOString(),
				},
			],
		};

		// Upload metadata to IPFS
		const metadataResult = await pinata.pinJSONToIPFS(metadata, {
			pinataMetadata: {
				name: `${courseTitle}_metadata.json`,
			},
		});
		const tokenURI = `https://gateway.pinata.cloud/ipfs/${metadataResult.IpfsHash}`;

		if (existingCertificate) {
			existingCertificate.tokenURI = tokenURI;
			existingCertificate.isUploadedToIPFS = true;
			await existingCertificate.save();
		}
		res.json({ success: true, tokenURI });
	} catch (error) {
		console.error(error);
		res.status(500).json({ success: false, error: error.message });
	}
};

const verifyCertificate = async (req, res) => {
	try {
		const { id } = req.query;
		console.log(id)

		if (!id) {
			return res
				.status(400)
				.json({ error: "Certificate ID or NFT ID is required" });
		}

		let query;

		// Check if the id is a valid number (for NFTId)
		if (!isNaN(id) && Number.isInteger(Number(id))) {
			query = { NFTId: Number(id) };
		} else {
			// For certificateId, use case-insensitive regex
			query = { certificateId: { $regex: new RegExp("^" + id + "$", "i") } };
		}

		let certificate = await Certificate.findOne(query)
			.populate({
				path: "student",
				select: "firstName lastName", 
			})
			.populate("course", "title");

		if (!certificate) {
			return res.status(404).json({ error: "Certificate not found" });
		}

		res.json(certificate);
	} catch (error) {
		console.error("Error verifying certificate:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

const getUserCertificatePerCourse = async (req, res) => {
	try {
		const userId = req.user._id;
		const courseId = req.params.courseId;

		const certificate = await Certificate.findOne({
			student: userId,
			course: courseId,
		});
		// console.log(certificate);

		res.json({ certificate });
	} catch (error) {
		console.error("Error getting user certificate for course:", error);
		res.status(500).json({ message: "Server error" });
	}
};

const getAllUserCertificates = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 9;
		const startIndex = (page - 1) * limit;

		const userId = req.user._id; // Assuming you have user authentication middleware

		const totalCertificates = await Certificate.countDocuments({
			student: userId,
		});
		const totalPages = Math.ceil(totalCertificates / limit);

		const certificates = await Certificate.find({ student: userId })
			.populate("course", "title")
			.sort({ date: -1 })
			.skip(startIndex)
			.limit(limit);

		res.json({
			certificates,
			currentPage: page,
			totalPages,
			totalCertificates,
		});
	} catch (error) {
		console.error("Error fetching certificates:", error);
		res
			.status(500)
			.json({ message: "Error fetching certificates", error: error.message });
	}
};
module.exports = {
	createCertificate,
	prepareCertificateData,
	verifyCertificate,
	getUserCertificatePerCourse,
	getAllUserCertificates,
};
