import { useState, useEffect } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Search } from "lucide-react";
import queryString from "query-string";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CERTIFICATE_CA } from "@/lib/certificateContract";

const MAX_LENGTH = 23;
const URL = import.meta.env.VITE_APP_BACKEND_URL;

const CertificatesVerify = () => {
	const [input, setInput] = useState("");
	const [formattedInput, setFormattedInput] = useState("");
	const [certificate, setCertificate] = useState(null);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [dynamicSearchParams, setDynamicSearchParams] = useSearchParams();
	const searchParams = dynamicSearchParams.get("id")?.toString();
	const navigate = useNavigate();

	useEffect(() => {
		formatInput(input);
	}, [input]);

	useEffect(() => {
		if (searchParams) {
			fetchCertificate(searchParams);
		}
	}, [searchParams]);

	const formatInput = (value) => {
		let formatted = "";
		// Check if the input starts with a date (8 digits)
		const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
		if (/^\d{8}/.test(cleaned)) {
			// Format: YYYYMMDD-XXXXXXXX-XXXXX
			for (let i = 0; i < Math.min(cleaned.length, MAX_LENGTH - 2); i++) {
				if (i === 8 || i === 16) {
					formatted += "-";
				}
				formatted += cleaned[i];
			}
		} else if (/^\d+$/.test(value)) {
			// If it's all numbers, don't format, just limit length
			formatted = value.slice(0, MAX_LENGTH);
		}

		setFormattedInput(formatted);
	};

	const handleInputChange = (e) => {
		const newValue = e.target.value.trim();
		if (newValue.length <= MAX_LENGTH) {
			setInput(newValue);
		}
	};

	const fetchCertificate = async (id) => {
		setIsLoading(true);
		setError("");
		try {
			const config = {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			};
			const response = await axios.get(
				`${URL}/certificates/verify?id=${id}`,
				config
			);
			setCertificate(response.data);
		} catch (err) {
			console.log(err);
			setError(err.response?.data?.error || "Internal Server Error");
			setCertificate(null);
		} finally {
			setIsLoading(false);
		}
	};

	const handleVerify = async (e) => {
		e.preventDefault();
		setError("");
		const url = queryString.stringifyUrl(
			{
				url: location.pathname,
				query: {
					id: formattedInput,
				},
			},
			{ skipEmptyString: true, skipNull: true }
		);
		navigate(url);
	};

	return (
		<div>
			<div className="container mx-auto p-4">
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<Card className="w-full max-w-2xl mx-auto">
						<CardHeader>
							<CardTitle className="text-2xl font-bold text-center">
								Certificate Verification
							</CardTitle>
						</CardHeader>
						<CardContent>
							<form action="" onSubmit={handleVerify}>
								<div className="flex space-x-2">
									<Input
										type="text"
										placeholder="Enter Certificate ID or NFT ID"
										value={formattedInput}
										onChange={handleInputChange}
										className="flex-grow"
									/>
									<Button disabled={isLoading}>
										{isLoading ? "Verifying..." : "Verify"}
										{!isLoading && <Search className="ml-2 h-4 w-4" />}
									</Button>
								</div>
							</form>

							{error && (
								<motion.p
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="text-red-500 mt-4"
								>
									{error}
								</motion.p>
							)}

							{certificate && (
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5 }}
									className="mt-8"
								>
									<img
										src={certificate?.cloudinaryUrl}
										alt="Certificate"
										className="w-full rounded-lg shadow-lg mb-4"
									/>
									<div className="space-y-2">
										<p>
											<strong>Certificate ID:</strong>{" "}
											{certificate?.certificateId}
										</p>
										<p>
											<strong>Student:</strong>{" "}
											{certificate?.student?.firstName}{" "}
											{certificate?.student?.lastName}
										</p>
										<p>
											<strong>Course:</strong> {certificate?.course?.title}
										</p>
										<p>
											<strong>Date Issued:</strong>{" "}
											{format(new Date(certificate.date), "PPPP")}
										</p>
										<div className="flex items-center space-x-2">
											<strong>Status:</strong>
											{certificate.isMinted ? (
												<div className="flex md:gap-2 items-center">
													<Badge
														variant="success"
														className="flex items-center"
													>
														<CheckCircle className="mr-1 h-4 w-4" /> Minted
													</Badge>
													<a
														// href={`https://explorer.celo.org/alfajores/token/${CERTIFICATE_CA}/instance/${certificate.NFTId}/token-transfers`}
														href={`https://testnets.opensea.io/assets/arbitrum-sepolia/${CERTIFICATE_CA}/${certificate.NFTId}`}
														target="_blank"
														rel="noopener noreferrer"
													>
														<Button
															className="text-blue-500 text-xs"
															variant="link"
														>
															View on OpenSea
														</Button>
													</a>
												</div>
											) : (
												<Badge
													variant="secondary"
													className="flex items-center"
												>
													<XCircle className="mr-1 h-4 w-4" /> Not Minted
												</Badge>
											)}
										</div>
										{certificate?.isMinted && (
											<>
												<p>
													<strong>NFT ID:</strong> {certificate?.NFTId}
												</p>
												<p className="break-all ">
													<strong>Minter Address:</strong>{" "}
													{certificate?.mintedAddress}
												</p>
												<p>
													<strong>Minted Date:</strong>{" "}
													{format(new Date(certificate?.mintedDate), "PPPP")}
												</p>
											</>
										)}
									</div>
								</motion.div>
							)}
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
};

export default CertificatesVerify;
