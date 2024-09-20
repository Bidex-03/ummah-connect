import React, {
	forwardRef,
	useImperativeHandle,
	useRef,
	useEffect,
	useState,
} from "react";
import { Stage, Layer, Image, Text } from "react-konva";
import useImage from "use-image";
import FontFaceObserver from "fontfaceobserver";

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 1414;
const PADDING_X = 100;
const PADDING_Y = 100;

const CertificateCanvas = forwardRef(
	(
		{ courseTitle, instructor, studentName, description,  certId },
		ref
	) => {
		const [background] = useImage(
			"/certificate/certificate_template.png",
			"Anonymous"
		);
		const [fontsLoaded, setFontsLoaded] = useState(false);
		const stageRef = useRef(null);

		// console.log(studentName, description,  certId);

		useImperativeHandle(ref, () => ({
			getStage: () => stageRef.current,
			toDataURL: () => {
				if (stageRef.current) {
					try {
						return stageRef.current.toDataURL();
					} catch (error) {
						console.error("Error generating DataURL:", error);
						return null;
					}
				}
				return null;
			},
		}));

		

		useEffect(() => {
			const pacificoFont = new FontFaceObserver("Pacifico");
			const droidSerifFont = new FontFaceObserver("Droid Serif Reg");

			Promise.all([pacificoFont.load(), droidSerifFont.load()])
				.then(() => {
					setFontsLoaded(true);
				})
				.catch((err) => {
					console.error("Font loading failed", err);
				});
		}, []);

		if (!fontsLoaded && !certId) {
			return <div>Loading fonts and certificateId...</div>;
		}

		return (
			<Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT} ref={stageRef}>
				<Layer>
					{background && (
						<Image
							image={background}
							width={CANVAS_WIDTH}
							height={CANVAS_HEIGHT}
						/>
					)}

					<Text
						text={`${certId}`}
						x={420}
						y={CANVAS_HEIGHT - PADDING_Y - 260}
						opacity={0.9}
						fontSize={25}
						fontFamily="'Droid Serif Reg', serif"
						fill="#000"
						align="left"
						width={CANVAS_WIDTH - 2 * PADDING_X}
						// offsetX={(CANVAS_WIDTH - 2 * PADDING_X) / 2}
						lineHeight={1.9}
						wrap="word"
					/>

					<Text
						text={studentName}
						x={CANVAS_WIDTH / 2}
						y={PADDING_Y + 600}
						fontSize={90}
						fontFamily="'Pacifico', serif"
						fill="#000"
						align="center"
						width={CANVAS_WIDTH}
						offsetX={CANVAS_WIDTH / 2}
					/>

					<Text
						text={description}
						x={CANVAS_WIDTH / 2}
						y={PADDING_Y + 720}
						fontSize={30}
						fontFamily="'Droid Serif Reg', serif"
						fill="#000"
						align="center"
						width={CANVAS_WIDTH - 2 * PADDING_X - 400}
						offsetX={(CANVAS_WIDTH - 2 * PADDING_X - 400) / 2}
						lineHeight={1.9}
						wrap="word"
					/>

					<Text
						text={instructor}
						x={CANVAS_WIDTH - 580}
						y={CANVAS_HEIGHT - PADDING_Y - 260}
						fontSize={25}
						fontFamily="'Droid Serif Reg', serif"
						fill="#000"
						align="center"
						width={CANVAS_WIDTH}
						offsetX={CANVAS_WIDTH / 2}
					/>
				</Layer>
			</Stage>
		);
	}
);

export default CertificateCanvas;
