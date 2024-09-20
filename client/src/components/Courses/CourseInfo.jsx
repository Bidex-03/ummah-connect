import React, { useState, useEffect } from "react";
import {
	useParams,
	useNavigate,
	useSearchParams,
	Navigate,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiClock, FiDollarSign, FiBook } from "react-icons/fi";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
const URL = import.meta.env.VITE_APP_BACKEND_URL;

const CourseInfo = () => {
	const { courseId } = useParams();
	const navigate = useNavigate();
	const [course, setCourse] = useState(null);
	const [isEnrolled, setIsEnrolled] = useState(false);
	const [loading, setLoading] = useState(true);
	const [searchParams, setSearchParams] = useSearchParams();
	const purchaseError = searchParams.get("cancelled");
	const { user } = useSelector((state) => state.auth);
	const [enrolling, setEnrolling] = useState(false);

	useEffect(() => {
		if (!!purchaseError) {
			toast.error("Course purchase was unsuccessful");
		}
	}, [purchaseError]);
	useEffect(() => {
		// Fetch course data and check enrollment status
		const fetchCourseData = async () => {
			try {
				const config = {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${localStorage.getItem("token")}`,
					},
				};
				// Replace with your API call
				const response = await axios.get(`${URL}/courses/${courseId}`, config);
				setCourse(response.data);

				const isPurchased = response.data.purchasedBy.some(
					(item) => item.user === user._id
				);
				console.log(response.data.purchasedBy);
				// Check if user is enrolled
				// Replace with your actual enrollment check logic
				// const enrollmentCheck = await fetch(
				// 	`/api/enrollments/check/${courseId}`
				// );
				// const enrollmentData = await enrollmentCheck.json();
				setIsEnrolled(isPurchased);

				setLoading(false);
			} catch (error) {
				console.error("Error fetching course data:", error);
				setLoading(false);
			}
		};

		fetchCourseData();
	}, [courseId]);

	const handleEnrollment = async () => {
		try {
			setEnrolling(true);
			const config = {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			};
			const response = await axios.post(
				`${URL}/courses/enroll/${courseId}`,
				config
			);
			if (course.price === 0) {
				return navigate(`/study/${courseId}/?success=1`);
			}
			window.location.assign(response.data.url);
		} catch {
			toast.error("Something went wrong");
		} finally {
			setEnrolling(false);
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-[80vh] justify-center items-center">
				<Loader2 key="loader" className="mr-2 h-10 w-10 animate-spin" />{" "}
			</div>
		);
	} else if (!course) {
		return <div>Course not found</div>;
	}

	// console.log(course);

	return (
		<div className="container mx-auto p-4">
			<Card className="w-full max-w-3xl mx-auto">
				<CardHeader>
					<CardTitle className="text-2xl font-bold">{course.title}</CardTitle>
				</CardHeader>
				<CardContent>
					<img
						src={course.coverImage}
						alt={course.title}
						className="w-full h-64 object-cover mb-4 rounded-md"
					/>
					<span className="text-gray-600 mb-4 flex gap-2 items-center ">
						<img
							className="h-7 w-7 rounded-full"
							src={course?.instructor?.photo}
							alt={course?.instructor?.firstName}
						/>
						{`${course.instructor.firstName} ${course.instructor.lastName}`}
					</span>
					<p className="text-gray-600 mb-4">{course.description}</p>

					<div className="flex justify-between items-center mb-4">
						<div className="flex items-center">
							<FiClock className="mr-2" />
							<span>{course.duration} hours</span>
						</div>
						<div className="flex items-center">
							<FiDollarSign className="mr-1" />
							<span>{course.price === 0 ? "Free" : `${course.price.toFixed(2)}`}</span>
						</div>
						<div className="flex items-center">
							<FiBook className="mr-2" />
							<span>{course.chapters.length} chapters</span>
						</div>
					</div>

					<h3 className="text-xl font-semibold mb-2">Chapters:</h3>
					<ul className="list-disc pl-5 mb-4">
						{course.chapters.map((chapter, index) => (
							<li key={index}>{chapter.title}</li>
						))}
					</ul>

					{isEnrolled ? (
						<Button onClick={() => navigate(`/study/${courseId}`)}>
							Go to Study Page
						</Button>
					) : (
						<Button disabled={enrolling} onClick={handleEnrollment}>
							{course.price === 0
								? "Enroll for Free"
								: enrolling
								? "Enrolling"
								: "Enroll Now"}
						</Button>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default CourseInfo;
