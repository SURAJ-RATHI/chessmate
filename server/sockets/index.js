const { Server } = require("socket.io");
const { v4: uuidV4 } = require("uuid");

const socketServer = (server) => {
	// Parse CORS origins - handle comma-separated string or array
	const corsOrigins = process.env.CORS 
		? (process.env.CORS.includes(',') 
			? process.env.CORS.split(',').map(origin => origin.trim())
			: process.env.CORS)
		: '*';
	
	const io = new Server(server, {
		cors: {
			origin: corsOrigins,
			credentials: true,
			methods: ['GET', 'POST'],
		},
	});

	const rooms = new Map();

	io.on("connection", (socket) => {
		console.log(socket.id, "connected");

		io.emit("setLiveGames", { liveGames: Array.from(rooms.values()) });

		socket.on("createRoom", async (args, callback) => {
			try {
				const roomId = uuidV4();
				const viewId = uuidV4();
				// await socket.join(roomId);
				rooms.set(roomId, {
					roomId,
					viewId,
					players: [],
					viewers: [],
					// fen: null,
					// players: [{ id: socket.id, username: args?.username }],
				});
				const room = rooms.get(roomId);

				io.emit("setLiveGames", {
					liveGames: Array.from(rooms.values()),
				});
				callback(room);
			} catch (error) {
				console.log(error);
			}
		});

		socket.on("joinPlayRoom", async (args, callback) => {
			try {
				const room = rooms.get(args.roomId);
				let error, message;

				if (room) {
					//checks if socket.id already joined game
					if (
						room.players.filter((e) => e.id === socket.id).length >
						0
					) {
						const playersUpdate = room.players.map((player) => {
							return {
								...player,
								online: true,
							};
						});

						const roomUpdate = {
							...room,
							players: playersUpdate,
						};

						rooms.set(room.roomId, roomUpdate);

						socket.to(room.roomId).emit("playerRejoined", {
							players: playersUpdate
						});
						socket.to(room.viewId).emit("playerRejoined", {
							players: playersUpdate
						});

						callback({ roomData: roomUpdate });
						// console.log("hello2");
						return;
					}

					//checks if username already joined game incase of new socket id due to refresh and updates socket id
					if (
						args.username &&
						room.players.filter((e) => e.username === args.username)
							.length > 0
					) {
						await socket.join(room.roomId);
						const playersUpdate = room.players.map((player) => {
							if (player.username === args.username) {
								return {
									...player,
									id: socket.id,
									online: true,
								};
							}
							return player;
						});

						const roomUpdate = {
							...room,
							players: playersUpdate,
						};

						rooms.set(room.roomId, roomUpdate);

						socket.to(room.roomId).emit("playerRejoined", {
							players: playersUpdate
						});
						socket.to(room.viewId).emit("playerRejoined", {
							players: playersUpdate
						});

						callback({ roomData: roomUpdate });

						// console.log("h93");
						// console.log(roomUpdate);
						// console.log("hello3");
						return;
					}
				}

				if (!room) {
					error = true;
					message = "room does not exist";
					// console.log("hello6");
				} else if (room.players.length >= 2) {
					error = true;
					message = "room is full";
					// console.log("hello5");
				}

				if (error) {
					if (callback) {
						callback({
							error,
							message,
						});
					}

					return;
				}

				await socket.join(room.roomId);

				const roomUpdate = {
					...room,
					players: [
						...room.players,
						{
							id: socket.id,
							username: args?.username,
							online: true,
							orientation:
								room.players.length > 0 ? "black" : "white",
						},
					],
				};

				rooms.set(args.roomId, roomUpdate);

				callback({ roomData: roomUpdate });
				io.emit("setLiveGames", {
					liveGames: Array.from(rooms.values()),
				});
				socket
					.to(room.roomId)
					.emit("playerJoined", { roomData: roomUpdate });
				socket
					.to(room.viewId)
					.emit("playerJoined", { roomData: roomUpdate });
				
				// console.log("hello1");
			} catch (error) {
				console.log(error);
			}
		});

		socket.on("joinViewRoom", async (args, callback) => {
			try {
				const room = rooms.get(args.roomId);
				let error, message;

				if (!room) {
					error = true;
					message = "room does not exist";
				}

				if (error) {
					if (callback) {
						callback({
							error,
							message,
						});
					}

					return;
				}

				//checks if socket.id already joined game
				if (room.viewers.filter((e) => e.id === socket.id).length > 0) {
					callback({ roomData: room });
					return;
				}

				//checks if username already joined game incase of new socket id due to refresh and updates socket id
				if (
					args.username &&
					room.viewers.filter((e) => e.username === args.username)
						.length > 0
				) {
					await socket.join(room.viewId);
					const viewersUpdate = room.viewers.map((viewer) => {
						if (viewer.username === args.username) {
							return {
								...viewer,
								id: socket.id,
							};
						}
						return viewer;
					});

					const roomUpdate = {
						...room,
						viewers: viewersUpdate,
					};

					rooms.set(room.roomId, roomUpdate);

					callback({ roomData: roomUpdate });

					return;
				}

				await socket.join(room.viewId);
				// console.log(room);
				const roomUpdate = {
					...room,
					viewers: [
						...room.viewers,
						{ id: socket.id, username: args?.username },
					],
				};

				rooms.set(room.roomId, roomUpdate);

				callback({ roomData: roomUpdate });

				socket
					.to(room.roomId)
					.emit("viewerJoined", { viewers: roomUpdate.viewers });
				socket
					.to(room.viewId)
					.emit("viewerJoined", { viewers: roomUpdate.viewers });
			} catch (error) {
				console.log(error);
			}
		});

		socket.on("getLiveGames", (callback) => {
			try {
				// console.log("getlivegames");
				// const gameRooms = Array.from(rooms.values());

				const liveGames = Array.from(rooms.values());
				// .filter((room) => {
				// 	if (room.players.length === 1) {
				// 		return room.roomId;
				// 	}
				// });
				// console.log(liveGames);
				callback({ liveGames });
				// socket.to(room.roomId).emit("move", { move: data.move });
				// socket
				// 	.to(room.viewId)
				// 	.emit("move", { move: data.move, fen: data.fen });
			} catch (error) {
				console.log(error);
			}
		});

		socket.on("updateFen", ({ roomId, fen }) => {
			try {
				// console.log("fenupdate");
				// console.log(roomId);
				const gameRooms = Array.from(rooms.values());

				const room = rooms.get(roomId);
				// console.log(room.players);
				const roomUpdate = {
					...room,
					fen,
					// lastMove: data.move
				};
				rooms.set(room.roomId, roomUpdate);
				// console.log(roomUpdate);
				// socket.to(room.roomId).emit("move", data.move);
				// socket
				// 	.to(room.viewId)
				// 	.emit("move", data.move);
			} catch (error) {
				console.log(error);
			}
		});

		socket.on("move", (data) => {
			try {
				// console.log("move");
				const room = rooms.get(data.room);

				// const roomUpdate = {
				// 	...room,
				// 	fen: data.fen,
				// 	lastMove: data.move
				// };
				// rooms.set(room.roomId, roomUpdate);
				// console.log(roomUpdate);
				socket.to(room.roomId).emit("move", { move: data.move });
				socket.to(room.viewId).emit("move", { move: data.move });
			} catch (error) {
				console.log(error);
			}
		});

		socket.on("closeRoom", async (data) => {
			try {
				// console.log("closeRoom");
				const room = rooms.get(data.roomId);
				if (room) {
					if (room.players.some((x) => x.id === socket.id)) {
						const player = room.players.find(
							(player) => player.id === socket.id
						);
						// console.log(room.roomId)
						socket.to(room.roomId).emit("playerQuit", {
							roomId: room.roomId,
							quitter: player,
						});
						socket.to(room.viewId).emit("playerQuit", {
							roomId: room.viewId,
							quitter: player,
						});

						const playSockets = await io
							.in(room.roomId)
							.fetchSockets();
						const viewSockets = await io
							.in(room.viewId)
							.fetchSockets();

						playSockets.forEach((s) => {
							s.leave(room.roomId);
						});

						viewSockets.forEach((s) => {
							s.leave(room.viewId);
						});

						rooms.delete(room.roomId);
						io.emit("setLiveGames", {
							liveGames: Array.from(rooms.values()),
						});
					}
					if (room.viewers.some((x) => x.id === socket.id)) {
						const viewer = room.viewers.find(
							(viewer) => viewer.id === socket.id
						);
						await socket.leave(room.viewId);

						const viewersUpdate = room.viewers.filter(
							(viewer) => viewer.id !== socket.id
						);
						const roomUpdate = {
							...room,
							viewers: viewersUpdate,
						};
						console.log(viewersUpdate);

						rooms.set(room.roomId, roomUpdate);

						socket
							.to(room.roomId)
							.emit("viewerLeft", {
								viewers: roomUpdate.viewers,
							});
						socket
							.to(room.viewId)
							.emit("viewerLeft", {
								viewers: roomUpdate.viewers,
							});
					}
				}
			} catch (error) {
				console.log(error);
			}
		});

		socket.on("disconnect", () => {
			try {
				const gameRooms = Array.from(rooms.values());
				gameRooms.forEach(async (room) => {
					// const player = room.players.find(
					// 	(player) => player.id === socket.id
					// );
					// if (player) {
					// 	socket.to(room.roomId).emit("playerDisconnected", {
					// 		roomId: room.viewId,
					// 		player: player,
					// 	}); // <- 4
					// 	socket.to(room.viewId).emit("playerDisconnected", {
					// 		roomId: room.viewId,
					// 		player: player,
					// 	});

					// 	const playSockets = await io
					// 		.in(room.roomId)
					// 		.fetchSockets();
					// 	const viewSockets = await io
					// 		.in(room.viewId)
					// 		.fetchSockets();

					// 	playSockets.forEach((s) => {
					// 		s.leave(room.roomId);
					// 	});

					// 	viewSockets.forEach((s) => {
					// 		s.leave(room.viewId);
					// 	});

					// 	rooms.delete(room.roomId);
					// 	io.emit("setLiveGames", {
					// 		liveGames: Array.from(rooms.values()),
					// 	});
					// }
					if (room.players.some((x) => x.id === socket.id)) {
						const playersUpdate = room.players.map((player) => {
							if (player.id === socket.id) {
								return {
									...player,
									online: false,
								};
							}
							return player;
						});

						const roomUpdate = {
							...room,
							players : playersUpdate,
						};

						rooms.set(room.roomId, roomUpdate);


						socket.to(room.roomId).emit("playerDisconnected", {
							players: playersUpdate
						});
						socket.to(room.viewId).emit("playerDisconnected", {
							players: playersUpdate
						});

						// const playSockets = await io
						// 	.in(room.roomId)
						// 	.fetchSockets();
						// const viewSockets = await io
						// 	.in(room.viewId)
						// 	.fetchSockets();

						// playSockets.forEach((s) => {
						// 	s.leave(room.roomId);
						// });

						// viewSockets.forEach((s) => {
						// 	s.leave(room.viewId);
						// });

						// rooms.delete(room.roomId);
						// io.emit("setLiveGames", {
						// 	liveGames: Array.from(rooms.values()),
						// });
					}
					if (room.viewers.some((x) => x.id === socket.id)) {
						const viewer = room.viewers.find(
							(viewer) => viewer.id === socket.id
						);
						await socket.leave(room.viewId);

						const viewersUpdate = room.viewers.filter(
							(viewer) => viewer.id !== socket.id
						);
						const roomUpdate = {
							...room,
							viewers: viewersUpdate,
						};
						console.log(viewersUpdate);

						rooms.set(room.roomId, roomUpdate);

						socket
							.to(room.roomId)
							.emit("viewerLeft", {
								viewers: roomUpdate.viewers,
							});
						socket
							.to(room.viewId)
							.emit("viewerLeft", {
								viewers: roomUpdate.viewers,
							});
					}
				});
			} catch (error) {
				console.log(error);
			}
		});
	});
};

module.exports = {
	socketServer,
};
