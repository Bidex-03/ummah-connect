import React, { useRef, useEffect, useState } from "react";
import CertificateCanvas from "./CertificateCanvas";
import Confetti from "react-confetti";
import { useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import Web3Modal from "web3modal";
import { format } from "date-fns";
import generateCertID from "@/lib/generateCertID";
import ConnectionModal from "@/lib/ConnectionModal";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import axios from "axios";
import { CERTIFICATE_ABI, CERTIFICATE_CA } from "@/lib/certificateContract";
import { GetParams } from "@/lib/wallet-connection";
import { ethers } from "ethers";

const URL = import.meta.env.VITE_APP_BACKEND_URL;
const cloud_name = import.meta.env.VITE_APP_CLOUD_NAME;
const upload_preset = import.meta.env.VITE_APP_UPLOAD_PRESET;

const CertificateGenerator = ({
	instructor,
	courseCompleted,
	courseTitle,
	certificate,
	isAlreadyCompleted,
}) => {
	const certificateRef = useRef(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [certificateGenerated, setCertificateGenerated] = useState(false);
	// const [certId, setCertId] = useState("");
	const certIdRef = useRef(null);
	const { courseId } = useParams();
	const [step, setStep] = useState(1);
	const [open, setOpen] = useState(false);
	const { user } = useSelector((state) => state.auth);
	const [isMinting, setIsMinting] = useState(false);
	// console.log(user);

	// console.log(isAlreadyCompleted);
	const [isConnected, setIsConnected] = useState(true);
	const [certUploadPerc, setCertUploadPerc] = useState(0);

	// console.log(certIdRef.current);

	const [showConfetti, setShowConfetti] = useState(false);
	// console.log(certificate);
	// console.log(data);

	useEffect(() => {
		const resetParams = async () => {
			const currentStep = await GetParams();
			// console.log(currentStep);

			setStep(currentStep.step);
		};

		resetParams();

		window?.ethereum?.on("chainChanged", () => resetParams());
		window?.ethereum?.on("accountsChanged", () => resetParams());
	}, []);

	useEffect(() => {
		!certIdRef.current &&
			generateCertID(user._id).then((id) => (certIdRef.current = id));
	}, []);

	// console.log(certId);

	useEffect(() => {
		// if (isAlreadyCompleted  && certId) {
		if (isAlreadyCompleted && !certificate && certIdRef.current) {
			generateCertificate(certIdRef.current);
		}
	}, [certIdRef.current]);

	useEffect(() => {
		if (courseCompleted && certIdRef.current) {
			generateCertificate();
		}
	}, [courseCompleted, certIdRef.current]);

	const dataURItoBlob = (dataURI) => {
		const byteString = atob(dataURI.split(",")[1]);
		const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
		const ab = new ArrayBuffer(byteString.length);
		const ia = new Uint8Array(ab);
		for (let i = 0; i < byteString.length; i++) {
			ia[i] = byteString.charCodeAt(i);
		}
		return new Blob([ab], { type: mimeString });
	};

	const uploadImage = async (dataUrl, folder) => {
		const fileName = `${Date.now()}certificate.png`;
		const blob = dataURItoBlob(dataUrl);

		// First, delete the existing image if any
		// await deleteExistingImage(certificate?.cloudinaryUrl);

		const formData = new FormData();
		formData.append("file", blob);
		formData.append("upload_preset", upload_preset);
		formData.append("folder", folder);

		try {
			const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;

			const response = await axios.post(uploadUrl, formData, {
				headers: { "Content-Type": "multipart/form-data" },
				withCredentials: false,
			});

			const downloadURL = response.data.secure_url;

			console.log("Image uploaded successfully:", downloadURL);
			return downloadURL;
		} catch (error) {
			console.error("Error uploading image:", error);
			throw error;
		}
	};

	const generateCertificate = () => {
		console.log("Running generateCertificate");
		setIsGenerating(true);

		const interval = setInterval(() => {
			setCertUploadPerc((prevProgress) => {
				if (prevProgress >= 100) {
					clearInterval(interval);
					return 100;
				}
				return prevProgress + 3;
			});
		}, 200);

		setTimeout(() => {
			if (certificateRef.current) {
				const createCert = async () => {
					const folderPath = `Users/${user._id}/Certificates/${courseId}`;

					try {
						const dataURL = certificateRef.current.toDataURL();
						const url = await uploadImage(dataURL, folderPath);

						if (url && certIdRef.current) {
							const formData = new FormData();
							formData.append("certificateId", certIdRef.current);
							formData.append("cloudinaryUrl", url);

							const config = {
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${localStorage.getItem("token")}`,
								},
							};

							const response = await axios.post(
								`${URL}/certificates/${courseId}/create`,
								formData,
								config
							);
							console.log(response.data);

							console.log("Certificate generated successfully");
							setOpen(true);
							setShowConfetti(true);
							setCertificateGenerated(true);
							setTimeout(() => setShowConfetti(false), 6000); // Stop confetti after 5 seconds
						} else {
							toast.error("Failed to generate Data URL or CertID");
						}
					} catch (error) {
						console.log(error);
						toast.error("Failed to generate certificate");
					} finally {
						setIsGenerating(false);
						clearInterval(interval);
					}
				};
				createCert();
			} else {
				toast.error("Certificate ref is null");
				setIsGenerating(false);
				// clearInterval(interval);
			}
		}, 2000);
	};

	const mintAsNFT = async () => {
		console.log("Minting as NFT");
		setIsMinting(true);
		console.log(step);
		if (step !== -1) {
			console.log("first");
			return setIsConnected(false);
		}
		const newToastId = toast.loading(
			"Preparing certificate for minting. Please wait..."
		);
		try {
			const config = {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
			};
			const response = await axios.post(
				`${URL}/certificates/${courseId}/prepare`,
				{ courseTitle: courseTitle, studentName: user._id },
				config
			);
			const data = response.data;
			console.log(response.data);
			const web3Modal = new Web3Modal();
			const connection = await web3Modal.connect();
			const newProvider = new ethers.BrowserProvider(connection);
			const signer = await newProvider.getSigner();
			console.log("singer", signer);

			const certContract = new ethers.Contract(
				CERTIFICATE_CA,
				CERTIFICATE_ABI,
				signer
			);
			const tx = await certContract.mintCertificate(
				user._id,
				courseId,
				data.tokenURI
			);
			await tx.wait();
			setOpen(false);
			toast.dismiss();
			toast.success("Certificate minted successfully");
			console.log(tx);
		} catch (error) {
			console.log(error);
			toast.error(
				error?.response?.data?.message
					? error?.response?.data?.message
					: "Failed to mint certificate"
			);
		} finally {
			toast.dismiss();
			setIsMinting(false);
		}
	};

	const mintLater = () => {
		setOpen(false);
		console.log("Saving for later minting");
	};

	const date = format(new Date(), "PPP");
	const description = `for the successful completion of ${courseTitle} course on ${date}`;

	return (
		<div className="relative">
			<Button onClick={mintAsNFT}>
				{isMinting ? "MInting" : "Mint certificate now"}
			</Button>
			<div className="hidden">
				<CertificateCanvas
					instructor={instructor}
					ref={certificateRef}
					certId={certIdRef.current}
					userId={user._id}
					studentName={`${user.firstName} ${user.lastName}`}
					description={description}
				/>
			</div>
			{isGenerating && (
				<div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
					<div className="bg-white p-6 rounded-lg shadow-xl w-64">
						<div className="mb-2 text-center font-bold">
							Generating Certificate
						</div>
						<div className="w-full bg-gray-200 rounded-full h-2.5">
							<div
								className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
								style={{ width: `${certUploadPerc}%` }}
							></div>
						</div>
					</div>
				</div>
			)}
			{certificateGenerated && open && (
				<div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
					<div className="bg-white p-8 rounded-lg shadow-xl transform transition-all duration-300 ease-in-out animate-pop">
						<h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
						<img
							src={certificateRef.current?.toDataURL()}
							alt="Certificate"
							className="mb-4 max-w-full h-[70vh] animate-reveal"
						/>
						<div className="flex justify-between">
							<button
								onClick={mintAsNFT}
								className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-all duration-300 ease-in-out hover:scale-105"
							>
								{isMinting ? "MInting" : "Mint as NFT"}
							</button>
							<button
								onClick={mintLater}
								className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-all duration-300 ease-in-out hover:scale-105"
							>
								Mint Later
							</button>
						</div>
					</div>
				</div>
			)}
			{!isConnected && <ConnectionModal setIsConnected={setIsConnected} />}
			{showConfetti && (
				<div className="fixed inset-0 pointer-events-none z-[60]">
					<Confetti width={window.innerWidth} height={window.innerHeight} />
				</div>
			)}{" "}
		</div>
	);
};

export default CertificateGenerator;
