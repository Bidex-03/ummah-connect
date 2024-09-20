import React, { useState, useEffect } from "react";
import axios from "axios";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const URL = import.meta.env.VITE_APP_BACKEND_URL;
const CertificateCollection = () => {
	const [certificates, setCertificates] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [isLoading, setIsLoading] = useState(false);

	const fetchCertificates = async (page) => {
		setIsLoading(true);
		try {
			const config = {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			};
			const response = await axios.get(
				`${URL}/certificates?page=${page}`,
				config
			);
			setCertificates(response.data.certificates);
			setTotalPages(response.data.totalPages);
			setIsLoading(false);
		} catch (error) {
			console.error("Error fetching certificates:", error);
			setIsLoading(false);
		}
	};

	// const handleCertificateLink = () => {

	// }

	useEffect(() => {
		fetchCertificates(currentPage);
	}, [currentPage]);

	const handlePrevPage = () => {
		if (currentPage > 1) {
			setCurrentPage(currentPage - 1);
		}
	};

	const handleNextPage = () => {
		if (currentPage < totalPages) {
			setCurrentPage(currentPage + 1);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h1 className="text-3xl font-bold my-5">My Certificates Collection</h1>
			{isLoading ? (
				<div className="flex justify-center items-center h-64">
					<p>Loading certificates...</p>
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{certificates.map((cert) => (
							<Link to={`/verify-certificate?id=${cert.NFTId}`}>
								<Card key={cert._id} className="flex flex-col md:hover:bg-slate-100 md:hover:scale-105 duration-300">
									<CardHeader>
										<CardTitle className="flex items-center">
											<Award className="mr-2" />
											{cert.course.title}
										</CardTitle>
									</CardHeader>
									<CardContent className="flex-grow">
										<img
											src={cert.cloudinaryUrl}
											alt={`Certificate for ${cert.course.title}`}
											className="w-full h-auto object-cover"
										/>
									</CardContent>
									<CardFooter className="flex justify-between">
										<p className="text-sm text-gray-500">
											ID: {cert.certificateId}
										</p>
										<p className="text-sm text-gray-500">
											{new Date(cert.date).toLocaleDateString()}
										</p>
									</CardFooter>
								</Card>
							</Link>
						))}
					</div>
					<div className="flex justify-center mt-4">
						<Button
							onClick={handlePrevPage}
							disabled={currentPage === 1}
							className="mr-2"
						>
							<ChevronLeft className="mr-2 h-4 w-4" /> Previous
						</Button>
						<Button
							onClick={handleNextPage}
							disabled={currentPage === totalPages}
						>
							Next <ChevronRight className="ml-2 h-4 w-4" />
						</Button>
					</div>
				</>
			)}
		</div>
	);
};

export default CertificateCollection;
