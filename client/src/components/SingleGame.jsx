import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useRoute } from "wouter";
import useHashLocation from "../hooks/useHashLocation";

import PropTypes from "prop-types";
import white from "../assets/white.png";
import black from "../assets/black.png";

import {
	Statistic,
	Card,
	Tag,
	// Grid,
	Col,
	Row,
	List,
	Space,
	Button,
	Typography,
	theme,
	Modal,
	Layout,
	message,
} from "antd";

import {
	DeleteOutlined,
	// ArrowUpOutlined,
	// ArrowDownOutlined,
	ShareAltOutlined,
	EyeOutlined,
} from "@ant-design/icons";
import { useAuthContext } from "../hooks/useAuthContext";

const boardWrapper = {
	width: "83vw",
	maxWidth: "75vh",
	margin: "1rem auto",
};

// const { useBreakpoint } = Grid;

const SingleGame = ({ mongoSavedGames, handleMongoSavesChange }) => {
	// const screens = useBreakpoint();

	const game = useMemo(() => new Chess(), []); // <- 1
	const [fen, setFen] = useState(game.fen());
	const [over, setOver] = useState("");
	const [moveFrom, setMoveFrom] = useState(null);
	const [moveTo, setMoveTo] = useState(null);
	const [showPromotionDialog, setShowPromotionDialog] = useState(false);
	const [moveSquares, setMoveSquares] = useState({});
	const [optionSquares, setOptionSquares] = useState({});
	const { user } = useAuthContext();
	const [, params] = useRoute("/single/:gameId");

	const [, hashNavigate] = useHashLocation();
	const [localSavedGames, setLocalSavedGames] = useState([]);
	const [quitModalVisible, setQuitModalVisible] = useState(false);
	// const [cloudSavedGames, setCloudSavedGames] = useState([]);
	const { token } = theme.useToken();
	const { Header } = Layout;

	useEffect(() => {
		setLocalSavedGames(Object.keys(localStorage));
		if (Object.keys(localStorage).includes(params.gameId)) {
			loadLocalGame(params.gameId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		// const mongoSave = mongoSavedGames.find(save=> save.gameId === params.gameId)
		if (mongoSavedGames.find((save) => save.gameId === params.gameId)) {
			loadMongoGame(params.gameId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const loadLocalGame = (key) => {
		game.load(localStorage.getItem(key));
		setFen(game.fen());
	};

	const loadMongoGame = (key) => {
		const mongoSave = mongoSavedGames.find((save) => save.gameId === key);
		game.load(mongoSave.fen);
		setFen(game.fen());
	};

	const fetchSaveMongo = async () => {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_BACKEND_API}/savegame/${params.gameId}`,
				{
					withCredentials: true,
					credentials: "include",
					method: "POST",
					headers: {
						"Content-type": "application/json",
					},
					body: JSON.stringify({
						gameId: params.gameId,
						fen,
					}),
				}
			);
			const data = await response.json();
			// console.log(response);
			if (response.ok) {
				console.log("game saved mongo");
				console.log(data.data);
				handleMongoSavesChange(data.data);
				// setIsLoading(false);
				// console.log("set user in context here");
				// console.log(data);
				// return true;
				// return hashNavigate("/");
			} else {
				// messageApi.info("Error:", data.error);
				console.log("Error:", data.error);
				// return false;
			}
		} catch (error) {
			console.log("Error:", error);
		}
	};

	const fetchDeleteMongo = async (gameId) => {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_BACKEND_API}/savegame/${gameId}`,
				{
					withCredentials: true,
					credentials: "include",
					method: "DELETE",
					headers: {
						"Content-type": "application/json",
					},
					// body: JSON.stringify({
					// 	gameId: params.gameId,
					// 	fen,
					// }),
				}
			);
			const data = await response.json();
			// console.log(response);
			if (response.ok) {
				console.log("game deleted mongo");
				// console.log(data.data);
				handleMongoSavesChange(data.data);
				// setIsLoading(false);
				// console.log("set user in context here");
				// console.log(data);
				// return true;
				// return hashNavigate("/");
			} else {
				// messageApi.info("Error:", data.error);
				console.log("Error:", data.error);
				// return false;
			}
		} catch (error) {
			console.log("Error:", error);
		}
	};

	const makeAMove = useCallback(
		(move) => {
			try {
				const result = game.move(move);
				setFen(game.fen());

				console.log(
					"over, checkmate",
					game.isGameOver(),
					game.isCheckmate()
				);

				if (game.isGameOver()) {
					if (game.isCheckmate()) {
						setOver(
							`Checkmate! ${
								game.turn() === "w" ? "Black" : "White"
							} wins!`
						);
					} else if (game.isDraw()) {
						setOver("Draw");
					} else if (game.isStalemate()) {
						setOver("Stalemate");
					}else {
						setOver("Game over");
					}
				}

				return result;
			} catch (e) {
				return null;
			}
		},
		[game]
	);

	function getMoveOptions(square) {
		const moves = game.moves({
			square,
			verbose: true,
		});
		if (moves.length === 0) {
			setOptionSquares({});
			return false;
		}

		const newSquares = {};
		moves.map((move) => {
			newSquares[move.to] = {
				background:
					game.get(move.to) &&
					game.get(move.to).color !== game.get(square).color
						? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
						: "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
				borderRadius: "50%",
			};
			return move;
		});
		newSquares[square] = {
			background: "rgba(255, 255, 0, 0.4)",
		};
		setOptionSquares(newSquares);
		return true;
	}

	function onSquareClick(square) {
		if (!moveFrom) {
			const hasMoveOptions = getMoveOptions(square);
			if (hasMoveOptions) setMoveFrom(square);
			return;
		} else {
			const moves = game.moves({
				moveFrom,
				verbose: true,
			});
			const foundMove = moves.find(
				(m) => m.from === moveFrom && m.to === square
			);
			if (!foundMove) {
				const hasMoveOptions = getMoveOptions(square);
				setMoveFrom(hasMoveOptions ? square : null);
				return;
			}

			setMoveTo(() => square);

			if (
				(foundMove.color === "w" &&
					foundMove.piece === "p" &&
					square[1] === "8") ||
				(foundMove.color === "b" &&
					foundMove.piece === "p" &&
					square[1] === "1")
			) {
				setShowPromotionDialog(true);
				return;
			}

			const moveData = {
				from: moveFrom,
				to: square,
				color: game.turn(),
				promotion: "q",
			};

			const move = makeAMove(moveData);

			if (move === null) {
				const hasMoveOptions = getMoveOptions(square);
				if (hasMoveOptions) setMoveFrom(square);
				return;
			}
			setMoveFrom(null);
			setMoveTo(null);
			setOptionSquares({});
			return;
		}
	}

	function onPromotionPieceSelect(piece) {
		const moveData = {
			from: moveFrom,
			to: moveTo,
			color: game.turn(),
			promotion: piece[1].toLowerCase() ?? "q",
		};
		makeAMove(moveData);

		setMoveFrom(null);
		setMoveTo(null);
		setShowPromotionDialog(false);
		setOptionSquares({});
		return true;
	}

	const handleQuit = () => {
		hashNavigate("/");
		setQuitModalVisible(false);
	};

	return (
		<>
			{/* Second Navbar for Links */}
			<Header
				style={{
					background: token.colorBgContainer,
					padding: "0 24px",
					borderBottom: `1px solid ${token.colorBorderSecondary}`,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					height: "64px",
					position: "sticky",
					top: 0,
					zIndex: 100,
				}}
			>
				<Space size="middle">
					<Button
						icon={<ShareAltOutlined />}
						onClick={() => {
							navigator.clipboard.writeText(location.href);
							message.success("Game link copied to clipboard!");
						}}
					>
						Game Link
					</Button>
					<Button
						icon={<EyeOutlined />}
						onClick={() => {
							const link = location.href;
							let linkArray = link.split("/");
							linkArray[4] = "view";
							navigator.clipboard.writeText(linkArray.join("/"));
							message.success("View link copied to clipboard!");
						}}
					>
						View Link
					</Button>
				</Space>
				<Button
					type="primary"
					danger
					size="large"
					onClick={() => setQuitModalVisible(true)}
				>
					Quit
				</Button>
			</Header>

			{/* Quit Confirmation Modal */}
			<Modal
				title="Confirm Quit"
				open={quitModalVisible}
				onOk={handleQuit}
				onCancel={() => setQuitModalVisible(false)}
				okText="Yes, Quit"
				cancelText="Cancel"
				okButtonProps={{ danger: true }}
			>
				<p>
					Are you sure you want to quit this game? Your progress will
					be saved automatically.
				</p>
			</Modal>

			<Row gutter={[16, 16]} style={{ marginTop: 16 }}>
				<Col
					xs={{
						span: 24,
						offset: 0,
					}}
					md={{
						span: 24,
						offset: 0,
					}}
					xl={{
						span: 6,
						offset: 0,
						order: 3,
					}}
				>
					<>
						<Row gutter={[16, 16]}>
							<Col
								xs={{
									span: 24,
									order: 3,
								}}
								sm={{
									span: 24,
									order: 1,
								}}
							>
								<Card bordered={false}>
									<Statistic
										title="Game [Single]"
										value={over ? over : "---"}
										precision={2}
										valueStyle={{ color: "#3f8600" }}
									/>
								</Card>
							</Col>
							<Col
								xs={{
									span: 12,
									order: 4,
								}}
								sm={{
									span: 12,
									order: 2,
								}}
							>
								<Card bordered={false}>
									<Statistic
										title="Status"
										value={
											over
												? "Game Over"
												: game.inCheck()
												? "Check"
												: "Active"
										}
										valueStyle={{ color: "#3f8600" }}
									/>
								</Card>
							</Col>
							<Col
								xs={{
									span: 12,
									order: 5,
								}}
								sm={{
									span: 12,
									order: 3,
								}}
							>
								<Card bordered={false}>
									<Statistic
										title="Current Turn"
										value={
											game.turn() === "w" ? "White" : "Black"
										}
										valueStyle={{ color: token.colorPrimaryText }}
										prefix={
											game.turn() === "w" ? (
												<img src={white} height={24} />
											) : (
												<img src={black} height={24} />
											)
										}
									/>
								</Card>
							</Col>
							<Col
								xs={{
									span: 24,
									order: 2,
								}}
								sm={{
									span: 24,
									order: 4,
								}}
								type="flex"
								align="middle"
							>
								<Space.Compact>
									<Button
										onClick={() => {
											hashNavigate("/");
										}}
									>
										Home
									</Button>
									<Button
										onClick={() => {
											game.reset();
											setFen(game.fen());
											setMoveSquares({});
											setOptionSquares({});
										}}
									>
										Reset
									</Button>
									<Button
										type="primary"
										onClick={() => {
											localStorage.setItem(
												params.gameId,
												game.fen()
											);
											console.log(
												"saved game to localStorage"
											);
											setLocalSavedGames(
												Object.keys(localStorage)
											);
											message.success("Game saved locally!");
										}}
									>
										localSave
									</Button>
									{user && (
										<Button
											type="primary"
											onClick={() => {
												fetchSaveMongo();
												message.success("Game saved to MongoDB!");
											}}
										>
											mongoSave
										</Button>
									)}
								</Space.Compact>
							</Col>
						</Row>
					</>
				</Col>
			<Col
				xs={{
					span: 24,
					offset: 0,
					// order: 1,
				}}
				md={{
					span: 24,
					offset: 0,
				}}
				xl={{
					span: 12,
					offset: 0,
					order: 2,
				}}
			>
				<>
				<Row gutter={[16, 16]}>
						<Col span={24} type="flex" align="middle">
							{user && <Tag color="blue">username: {user.username}</Tag>}
						</Col>
					</Row>
					<div style={boardWrapper}>
						{/* {window.location.origin} */}
						<Chessboard
							id="ClickToMove"
							animationDuration={200}
							arePiecesDraggable={false}
							position={fen}
							onSquareClick={onSquareClick}
							onPromotionPieceSelect={onPromotionPieceSelect}
							customBoardStyle={{
								borderRadius: "4px",
								boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
							}}
							customSquareStyles={{
								...moveSquares,
								...optionSquares,
							}}
							promotionToSquare={moveTo}
							showPromotionDialog={showPromotionDialog}
						/>
					</div>
				</>
			</Col>
			<Col
				xs={{
					span: 24,
					offset: 0,
					// order: 3,
				}}
				md={{
					span: 24,
					offset: 0,
				}}
				xl={{
					span: 6,
					offset: 0,
					order: 1,
				}}
			>
				{/* <Card bordered={false}> */}
				<Row gutter={[16, 16]}>
					<Col
						xs={{
							span: 24,
							offset: 0,
						}}
						md={{
							span: 12,
							offset: 0,
						}}
						xl={{
							span: 24,
							offset: 0,
						}}
					>
						<List
							header={
								<Typography.Title
									style={{ marginTop: 12 }}
									level={5}
								>
									Saved Games (Local)
								</Typography.Title>
							}
							pagination={{
								pageSize: 4,
								size: "small",
							}}
							bordered
							dataSource={localSavedGames}
							renderItem={(item) => (
								<List.Item>
									<Typography.Link
										target="_blank"
										onClick={() => {
											hashNavigate(`/single/${item}`);
											loadLocalGame(item);
										}}
									>
										{item}
									</Typography.Link>

									<Button
										size="small"
										onClick={() => {
											localStorage.removeItem(item);
											setLocalSavedGames(
												Object.keys(localStorage)
											);
										}}
									>
										<DeleteOutlined />
									</Button>
								</List.Item>
							)}
						/>
					</Col>
					<Col
						xs={{
							span: 24,
							offset: 0,
						}}
						md={{
							span: 12,
							offset: 0,
						}}
						xl={{
							span: 24,
							offset: 0,
						}}
					>
						<List
							header={
								<Typography.Title
									style={{ marginTop: 12 }}
									level={5}
								>
									Saved Games (mongoDB)
								</Typography.Title>
							}
							pagination={{
								pageSize: 4,
								size: "small",
							}}
							bordered
							dataSource={mongoSavedGames}
							renderItem={(item) => (
								<List.Item>
									<Typography.Link
										target="_blank"
										onClick={() => {
											hashNavigate(
												`/single/${item.gameId}`
											);
											loadMongoGame(item.gameId);
										}}
									>
										{item.gameId}
									</Typography.Link>

									<Button
										size="small"
										onClick={() => {
											fetchDeleteMongo(item.gameId);
										}}
									>
										<DeleteOutlined />
									</Button>
								</List.Item>
							)}
						/>
					</Col>
				</Row>
				{/* </Card> */}
			</Col>
		</Row>
		</>
	);
};

SingleGame.propTypes = {
	mongoSavedGames: PropTypes.array,
	handleMongoSavesChange: PropTypes.func,
};

export default SingleGame;
