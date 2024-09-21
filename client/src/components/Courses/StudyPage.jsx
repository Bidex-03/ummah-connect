import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiDownload, FiCheck } from "react-icons/fi";
import axios from "axios";
import { CourseProgress } from "../ui/CourseProgress";
import { useSelector } from "react-redux";
import CertificateGenerator from "./CertificateGenerator";

const URL = import.meta.env.VITE_APP_BACKEND_URL;

const StudyPage = () => {
	const { courseId } = useParams();
	const [course, setCourse] = useState(null);
	const [certificate, setCertificate] = useState("");
	const [currentChapter, setCurrentChapter] = useState(0);
	const [progress, setProgress] = useState(0);
	const [loading, setLoading] = useState(true);
	const { user } = useSelector((state) => state.auth);
	const [isCourseJustCompleted, setIsCourseJustCompleted] = useState(false);
	const [newValue, setNewValue] = useState(0);

	console.log(user);

	useEffect(() => {
		const fetchCourseData = async () => {
			try {
				const config = {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${localStorage.getItem("token")}`,
					},
				};
				const response = await axios.get(
					`${URL}/courses/enrolled-courses/all`,
					config
				);

				//To get certificate for course
				const certResponse = await axios.get(
					`${URL}/certificates/${courseId}`,
					config
				);
				const data = certResponse.data;
				setCertificate(data.certificate);
				console.log(data);

				console.log("Course ID from URL:", courseId);
				console.log("Response Data:", response.data);

				// Use map to iterate through the courses
				response.data.map((course) => {
					if (course._id === courseId) {
						console.log("Found Course:", course);
						setCourse(course);

						const completedChapters = course.chapters.filter((chapter) =>
							chapter.completedBy.includes(user._id)
						).length;
						setProgress((completedChapters / course.chapters.length) * 100);
					}
				});

				setLoading(false);
			} catch (error) {
				console.error("Error fetching course data:", error);
				setLoading(false);
			}
		};

		fetchCourseData();
	}, [courseId, user]);

	const handleChapterComplete = async () => {
		try {
			console.log("Rununiiiii---------------==============")
			// Mark chapter as complete in the backend
			const config = {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			};
			const response = await axios.post(
				`${URL}/courses/${courseId}/chapters/${currentChapter}/complete`,
				config
			);
			console.log(response.data);
			// Update local state
			const updatedCourse = { ...course };
			const completedBy = updatedCourse.chapters[currentChapter].completedBy;
			updatedCourse.chapters[currentChapter].completedBy = [
				...completedBy,
				user._id,
			];
			setCourse(updatedCourse);

			// Update progress
			const completedChapters = updatedCourse.chapters.filter((chapter) =>
				chapter.completedBy.includes(user._id)
			).length;
			const courseJustCompleted =
				completedChapters === updatedCourse.chapters.length &&
				!isAlreadyCompleted;
			setIsCourseJustCompleted(courseJustCompleted);
			setProgress((completedChapters / updatedCourse.chapters.length) * 100);
		} catch (error) {
			console.error("Error marking chapter as complete:", error);
		}
	};

	const handleVideoEnd = async () => {
		if (!course.chapters[currentChapter].completedBy.includes(user._id)) {
			await handleChapterComplete();
		}

		if (currentChapter < course.chapters.length - 1) {
			setCurrentChapter(currentChapter + 1);
		}
		// else {
		// 	setNewValue(currentChapter + 1);
		// }
	};

	// const handleDownload = (fileUrl, fileName) => {
	// 	// Implement file download logic here
	// 	console.log(`Downloading ${fileName} from ${fileUrl}`);
	// };

	if (loading) {
		return <div>Loading...</div>;
	}

	if (!course) {
		return <div>Course not found or not Enrolled for the course</div>;
	}

	const isAlreadyCompleted = course?.completedChapters === course.totalChapters;
	return (
		<div className="container mx-auto p-4">
			<h1 className="text-3xl font-bold mb-4">{course.title}</h1>
			<CourseProgress variant="success" value={progress} />

			<Tabs
				className="mt-4"
				value={currentChapter.toString()}
				defaultValue={currentChapter.toString()}
				onValueChange={(value) => setCurrentChapter(parseInt(value))}
			>
				<TabsList className="mb-4">
					{course?.chapters?.map((chapter, index) => (
						<TabsTrigger key={index} value={index.toString()}>
							Chapter {index + 1}
							{chapter.completedBy.includes(user._id) && (
								<FiCheck className="ml-2" />
							)}
						</TabsTrigger>
					))}
				</TabsList>
				{/* {(isCourseJustCompleted || isAlreadyCompleted) && ( */}
				{(isCourseJustCompleted || (!certificate && isAlreadyCompleted)) && (
					<CertificateGenerator
						instructor={`${course.instructor.firstName} ${course.instructor.lastName}`}
						isAlreadyCompleted={isAlreadyCompleted}
						courseTitle={course.title}
						courseCompleted={isCourseJustCompleted}
						certificate={certificate}
					/>
				)}

				{course?.chapters?.map((chapter, index) => (
					<TabsContent key={index} value={index.toString()}>
						<Card>
							<CardHeader>
								<CardTitle>{chapter.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<video
									src={chapter.video}
									controls
									className="w-full mb-4"
									onEnded={handleVideoEnd}
								/>

								{chapter.content && (
									<div
										className="prose mb-4"
										dangerouslySetInnerHTML={{ __html: chapter.content }}
									/>
								)}

								{chapter.article && (
									<a href={chapter.article}>
										<Button className="mr-2 mb-2">
											<FiDownload className="mr-2" /> Download Chapter Article
										</Button>
									</a>
									// <Button
									// 	onClick={() =>
									// 		handleDownload(
									// 			chapter.article,
									// 			`${chapter.title} - Article.pdf`
									// 		)
									// 	}
									// 	className="mr-2 mb-2"
									// >
									// 	<FiDownload className="mr-2" /> Download Article
									// </Button>
								)}

								{chapter.audio && (
									<a href={chapter.audio}>
										<Button className="mr-2 mb-2">
											<FiDownload className="mr-2" /> Download Chapter Audio
										</Button>
									</a>
								)}

								{!chapter.completedBy.includes(user._id) && (
									<Button onClick={handleChapterComplete}>
										Mark as Complete
									</Button>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
};

export default StudyPage;
