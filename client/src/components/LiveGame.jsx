import PropTypes from "prop-types";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useState, useMemo, useCallback, useEffect } from "react";
import socket from "./socket-client";
import useHashLocation from "../hooks/useHashLocation";
import { useAuthContext } from "../hooks/useAuthContext";
import { useRoute } from "wouter";
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
	// Space,
	Button,
	Typography,
	Result,
	theme,
	Modal,
	Layout,
	Space,
	message,
} from "antd";

import {
	// DeleteOutlined,
	// ArrowUpOutlined,
	// ArrowDownOutlined,
	ShareAltOutlined,
	EyeOutlined,
} from "@ant-design/icons";

const boardWrapper = {
	width: "83vw",
	maxWidth: "70vh",
	margin: "1rem auto",
};

function LiveGame({
	room,
	players,
	viewers,
	orientation,
	// firstPlayer,
	handleRoomChange,
	handleOrientationChange,
	handlePlayersChange,
	handleViewersChange,
	// handleFirstPlayerChange,
	handleCleanup,
}) {
	const game = useMemo(() => new Chess(), []);
	const [fen, setFen] = useState(game.fen());
	const [over, setOver] = useState("");
	const [message, setMessage] = useState("--");
	const [timer, setTimer] = useState(10);
	const [moveFrom, setMoveFrom] = useState(null);
	const [moveTo, setMoveTo] = useState(null);
	const [timeoutId, setTimeoutId] = useState(null);
	const [showPromotionDialog, setShowPromotionDialog] = useState(false);
	// eslint-disable-next-line no-unused-vars
	const [moveSquares, setMoveSquares] = useState({});
	const [optionSquares, setOptionSquares] = useState({});
	const [quitModalVisible, setQuitModalVisible] = useState(false);
	const { token } = theme.useToken();
	const { Header } = Layout;

	const [playMatch, playParams] = useRoute("/live/play/:gameId");
	const [viewMatch, viewParams] = useRoute("/live/view/:gameId");
	const gameId = playMatch
		? playParams.gameId
		: viewMatch
		? viewParams.gameId
		: null;
	const { user } = useAuthContext();

	const [, hashNavigate] = useHashLocation();

	const GetTimeLeft = (timeout) => {
		return Math.ceil(
			(timeout._idleStart + timeout._idleTimeout - Date.now()) / 1000
		);
	};

	const FinishGame = () => {
		console.log("Game ended");
	};
	// const InterruptTimeout = () => {
	// 	setTimer(0);
	// 	setMessage('');
	// }

	// useEffect(() => {
	// 	console.log(`room: ${room}, players ${players}, fen: ${fen}`);
	// }, [fen, room, players]);
	// useEffect(() => {
	// 	console.log("Something changed room state");
	// 	console.log(`room: ${room}`);
	// }, [room]);

	useEffect(
		() => {
			// console.log(match, params);

			// console.log(firstPlayer);
			if (playMatch) {
				// console.log("check", room);
				if (!room && !over) {
					socket.emit(
						"joinPlayRoom",
						{
							roomId: gameId,
							username: user ? user.username : null,
						},
						(r) => {
							if (r.error) {
								setOver(r.message);
								return console.log(r.message);
							}
							// console.log("response:", r);
							handleRoomChange(r.roomData.roomId);
							handlePlayersChange(r.roomData.players);
							handleViewersChange(r.roomData.viewers);
							handleOrientationChange(
								r.roomData.players.filter(
									(e) =>
										e.id === socket.id ||
										(user && e.username === user.username)
								)[0].orientation
							);
						}
					);
				}
			}
			if (viewMatch && !room && !over) {
				// if (!room) {
				socket.emit(
					"joinViewRoom",
					{
						roomId: gameId,
						username: user ? user.username : null,
					},
					(r) => {
						if (r.error) {
							setOver(r.message);
							return console.log(r.message);
						}
						// console.log("response:", r);
						if (r.roomData.fen) {
							game.load(r.roomData.fen);
							setFen(game.fen());
							// makeAMove(r.lastMove)
						}
						handleRoomChange(r.roomData.roomId);
						handlePlayersChange(r.roomData.players);
						handleViewersChange(r.roomData.viewers);
					}
				);
				// }
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	useEffect(() => {
		socket.on("playerJoined", ({ roomData }) => {
			handlePlayersChange(roomData.players);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		socket.on("viewerJoined", ({ viewers }) => {
			handleViewersChange(viewers);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// useEffect(() => {
	// 	socket.on("playerDisconnected", ({ player }) => {
	// 		console.log("playerDisconnected");
	// 		setOver(
	// 			`${
	// 				player.username ? player.username : player.id
	// 			} has disconnected.`
	// 		);
	// 		// handleCleanup();
	// 	});
	// 	// eslint-disable-next-line react-hooks/exhaustive-deps
	// }, []);

	useEffect(() => {
		socket.on("playerQuit", () => {
			console.log("playerQuit");
			setOver("You WON! Opponent quit.");
			// handleCleanup();
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		socket.on("viewerLeft", ({ viewers }) => {
			handleViewersChange(viewers);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (timeoutId && timer>0) {
			setTimer(GetTimeLeft(timeoutId));
			setMessage(`Waiting for reconnection. [${timer} seconds]`);
		}
	}, [timeoutId, timer]);

	useEffect(() => {
		socket.on("playerDisconnected", ({ players }) => {
			handlePlayersChange(players);

			//need to update timer every second instead of just setting initially
			const timeout = setTimeout(FinishGame, 10000);
			setTimeoutId(timeout);

			//need to set a countdown and also to break countdown if user rejoins
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		socket.on("playerRejoined", ({ players }) => {
			handlePlayersChange(players);
			clearTimeout(timeoutId);
			setTimeoutId(null);
			setTimer(0);
			setMessage("--");

			//need to set a countdown and also to break countdown if user rejoins
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (playMatch) {
			if (room) {
				socket.emit("updateFen", {
					// move,
					roomId: room,
					fen,

					//got some error at this on the socket server side that roomId is undefined, should happen though, happended when opponent disonnected
				});
			}
		}
	}, [fen, playMatch, room]);

	const getMoveOptions = (square) => {
		try {
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
		} catch (error) {
			console.log(error);
		}
	};

	const makeAMove = useCallback(
		(move) => {
			try {
				const result = game.move(move);
				setFen(game.fen());

				// console.log(
				// 	"over, checkmate",
				// 	game.isGameOver(),
				// 	game.isCheckmate()
				// );

				if (game.isGameOver()) {
					if (game.isCheckmate()) {
						setOver(
							`Checkmate! ${
								game.turn() === "w" ? "black" : "white"
							} wins!`
						);
					} else if (game.isDraw()) {
						setOver("Draw");
					} else {
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

	useEffect(() => {
		// if (viewMatch && fen === new Chess().fen()) {
		// 	socket.on("move", ({ fen }) => {
		// 		setFen(fen);
		// 	});
		// }
		socket.on("move", ({ move }) => {
			makeAMove(move);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [makeAMove]);

	const onSquareClick = (square) => {
		try {
			if (viewMatch) return false;
			if (game.turn() !== orientation[0]) return false;

			if (players.length < 2) return false;

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

				socket.emit("move", {
					move,
					room,
					// fen,
				});

				setMoveFrom(null);
				setMoveTo(null);
				setOptionSquares({});
				return;
			}
		} catch (error) {
			console.log(error);
		}
	};

	function onPromotionPieceSelect(piece) {
		try {
			if (piece) {
				const moveData = {
					from: moveFrom,
					to: moveTo,
					color: game.turn(),
					promotion: piece[1].toLowerCase() ?? "q",
				};
				makeAMove(moveData);
			}

			setMoveFrom(null);
			setMoveTo(null);
			setShowPromotionDialog(false);
			setOptionSquares({});
			return true;
		} catch (error) {
			console.log(error);
		}
	}

	const handleQuit = () => {
		if (playMatch && !over) {
			socket.emit("closeRoom", {
				roomId: room,
			});
		}
		handleCleanup();
		hashNavigate("/");
		setQuitModalVisible(false);
	};

	// Find current player and their position
	const currentPlayerIndex = players.findIndex(
		(p) => p.id === socket.id || (user && p.username === user.username)
	);
	const currentPlayer = currentPlayerIndex !== -1 ? players[currentPlayerIndex] : null;
	const playerNumber = currentPlayerIndex !== -1 ? currentPlayerIndex + 1 : null;

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
					{/* <Button
						icon={<EyeOutlined />}
						onClick={() => {
							const link = location.href;
							let linkArray = link.split("/");
							linkArray[5] = "view";
							navigator.clipboard.writeText(linkArray.join("/"));
							message.success("View link copied to clipboard!");
						}}
					>
						View Link
					</Button> */}

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
				
				{/* Current Player/Viewer Info */}
				{currentPlayer && playMatch ? (
					<Space
						size="small"
						style={{
							padding: "6px 16px",
							background: token.colorFillTertiary,
							borderRadius: "8px",
							border: `1px solid ${token.colorBorderSecondary}`,
						}}
					>
						<Typography.Text strong>
							Player {playerNumber}
						</Typography.Text>
						<Typography.Text type="secondary">
							({currentPlayer.id})
						</Typography.Text>
						{currentPlayer.username && (
							<Typography.Text type="secondary">
								• {currentPlayer.username}
							</Typography.Text>
						)}
						{currentPlayer.orientation && (
							<span
								style={{
									color: currentPlayer.orientation === "white" ? "#000" : "#fff",
									backgroundColor: currentPlayer.orientation === "white" ? "#f0f0f0" : "#333",
									padding: "2px 8px",
									borderRadius: "4px",
									marginLeft: "8px",
									fontSize: "12px",
									fontWeight: "bold",
									textTransform: "capitalize",
								}}
							>
								{currentPlayer.orientation}
							</span>
						)}
						{currentPlayer.online ? (
							<span style={{ color: "#52c41a" }}>🟢</span>
						) : (
							<span style={{ color: "#ff4d4f" }}>🔴</span>
						)}
					</Space>
				) : viewMatch ? (
					<Space
						size="small"
						style={{
							padding: "6px 16px",
							background: token.colorFillTertiary,
							borderRadius: "8px",
							border: `1px solid ${token.colorBorderSecondary}`,
						}}
					>
						<Typography.Text strong>
							Viewer
						</Typography.Text>
						{user?.username && (
							<Typography.Text type="secondary">
								• {user.username}
							</Typography.Text>
						)}
						<span style={{ color: token.colorWarning }}>👁️</span>
					</Space>
				) : null}

				<Button
					type="primary"
					danger
					size="large"
					onClick={() => setQuitModalVisible(true)}
				>
					{playMatch && !over ? "Quit" : "Exit"}
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
					Are you sure you want to quit this game? This action cannot
					be undone.
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
										title={`Game [Multiplayer]: ${
											playMatch ? "Play Mode" : "View Mode"
										}`}
										value={
											!over
												? players.length === 2
													? "---"
													: "Waiting for Opponent to join"
												: over
										}
										valueStyle={{
											color: over
												? "#cf1322"
												: players.length !== 2 ||
												game.inCheck()
												? token.colorWarningText
												: "#3f8600",
										}}
									/>
								</Card>
							</Col>
							<Col
								xs={{
									span: 24,
									order: 4,
								}}
								sm={{
									span: 24,
									order: 4,
								}}
							>
								<Card bordered={false}>
									<Statistic
										title={"Message"}
										value={message}
										valueStyle={{
											color: "#3f8600",
										}}
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
												: players.length === 2
												? game.inCheck()
													? "Check"
													: "Active"
												: "Waiting"
										}
										valueStyle={{
											color: over
												? "#cf1322"
												: players.length !== 2 ||
												game.inCheck()
												? token.colorWarningText
												: "#3f8600",
										}}
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
										valueStyle={{
											color: token.colorPrimaryText,
										}}
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
							{user && (
								<Tag color="blue">
									username: {user.username}
								</Tag>
							)}
							{viewMatch && <Tag color="orange">View Mode</Tag>}
						</Col>
					</Row>
					<div style={boardWrapper}>
						{room ? (
							<Chessboard
								id="ClickToMove"
								animationDuration={200}
								boardOrientation={orientation}
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
						) : (
							<Result
								status="403"
								title="403"
								subTitle="Sorry, you are not authorized to access this page."
							/>
						)}
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
									Players
								</Typography.Title>
							}
							bordered
							dataSource={players}
							renderItem={(player, index) => (
								<List.Item>
									<Typography.Text>
										{player.online ? "🟢 " : "🔴 "}
										<strong>Player {index + 1}</strong>
										{` (${player.id})`}
										{player.orientation && (
											<span style={{ 
												color: player.orientation === "white" ? "#000" : "#fff",
												backgroundColor: player.orientation === "white" ? "#f0f0f0" : "#333",
												padding: "2px 8px",
												borderRadius: "4px",
												marginLeft: "8px",
												fontSize: "12px",
												fontWeight: "bold",
												textTransform: "capitalize"
											}}>
												{player.orientation}
											</span>
										)}
									</Typography.Text>
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
									Viewers
								</Typography.Title>
							}
							pagination={{
								pageSize: 4,
								size: "small",
							}}
							bordered
							dataSource={viewers}
							renderItem={(viewer, index) => (
								<List.Item>
									<Typography.Text>
										<strong>Viewer {index + 1}</strong>
										{viewer.username
											? ` (${viewer.username}) [${viewer.id}]`
											: ` [${viewer.id}]`}
									</Typography.Text>
								</List.Item>
							)}
						/>
					</Col>
				</Row>
			</Col>
		</Row>
		</>
	);
}

LiveGame.propTypes = {
	room: PropTypes.string,
	players: PropTypes.array,
	viewers: PropTypes.array,
	orientation: PropTypes.string,
	firstPlayer: PropTypes.bool,
	handleRoomChange: PropTypes.func,
	handlePlayersChange: PropTypes.func,
	handleOrientationChange: PropTypes.func,
	handleViewersChange: PropTypes.func,
	handleCleanup: PropTypes.func,
};

export default LiveGame;
